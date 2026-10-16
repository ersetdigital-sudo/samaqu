import { NextRequest, NextResponse, after } from "next/server";
import { isOpsAdmin, opsActorEmail, unauthorized } from "@/lib/ops-auth";
import { getAdminProfile } from "@/lib/ai/config";
import { consumeOpenAIStream, streamChatCompletion } from "@/lib/ai/provider";
import { buildAdminSystemPrompt } from "@/lib/ai/admin-prompt";
import { ADMIN_TOOLS, executeAdminTool } from "@/lib/ai/admin-tools";
import { parseAdminMessages } from "@/lib/ai/admin-input";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { logAdminAiUsage } from "@/lib/ai/admin-log";

/** Kuota asisten admin: 20 permintaan / 5 menit per admin (bukan per IP). */
const ADMIN_RATE_LIMIT = { max: 20, windowMs: 5 * 60 * 1000 };

/**
 * Batas waktu TOTAL satu permintaan asisten admin (R2) — berbeda dari timeout per panggilan
 * model. Tanpa ini, 5 putaran tool × 60 detik bisa melewati batas runtime deployment sehingga
 * stream diputus di tengah dan log pemakaian tidak sempat ditulis.
 *
 * Kalau anggaran habis: putaran tool & panggilan model berikutnya DIHENTIKAN, admin diberi
 * pesan jelas bahwa jawabannya belum lengkap, dan log ditulis langsung (`await`) — bukan
 * diandalkan pada `after()`.
 *
 * Opsional diatur lewat env `AI_ADMIN_REQUEST_BUDGET_MS` (minimal 5 detik).
 */
const DEFAULT_REQUEST_BUDGET_MS = 120_000;
const REQUEST_BUDGET_MS = (() => {
  const raw = Number(process.env.AI_ADMIN_REQUEST_BUDGET_MS);
  return Number.isFinite(raw) && raw >= 5_000 ? raw : DEFAULT_REQUEST_BUDGET_MS;
})();

/** Pesan ke admin saat anggaran waktu habis (jawaban TIDAK diklaim lengkap). */
const BUDGET_NOTICE =
  "Proses dihentikan karena melewati batas waktu. Jawaban di atas belum lengkap — coba pertanyaan yang lebih sempit.";
/** Penanda di log untuk membedakan pembatalan admin dari error provider. */
const CANCELLED_MARK = "dibatalkan admin";

// Asisten AI INTERNAL SAMAQU (dashboard admin).
//
// Terpisah TOTAL dari live chat customer (`/api/chat`):
//   - wajib sesi admin (`isOpsAdmin`) — bukan route publik;
//   - system prompt, tool, dan riwayat percakapannya sendiri;
//   - model & batas token dari profil admin (`src/lib/ai/config.ts`).
//
// POST → balasan streaming (SSE) dengan konteks operasional. READ-ONLY: tidak ada tool yang
// menulis ke database.

export async function POST(req: NextRequest) {
  // Otorisasi di server — bukan di UI. Panel admin hanya gerbang tampilan.
  if (!(await isOpsAdmin(req))) return unauthorized();

  // Identitas admin dipakai untuk kuota & kolom `actor` di audit log.
  const actor = await opsActorEmail(req);

  let body: { messages?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const profile = await getAdminProfile();

  // R4: validasi SEBELUM kuota dipakai dan sebelum provider dipanggil. Pertanyaan kosong /
  // hanya spasi ditolak 400 tanpa memanggil model.
  const parsed = parseAdminMessages(body.messages, {
    maxChars: profile.maxChars,
    maxMessages: profile.maxMessages,
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const messages = parsed.messages;

  if (!profile.enabled) {
    return NextResponse.json(
      { error: "Asisten admin belum aktif: kredensial AI belum tersedia." },
      { status: 503 }
    );
  }

  // Kuota baru dipakai setelah request terbukti valid.
  const quota = checkRateLimit(`ai-admin:${actor}`, ADMIN_RATE_LIMIT.max, ADMIN_RATE_LIMIT.windowMs);
  if (!quota.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${quota.retryAfterSec} detik.` },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSec) } }
    );
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
  const question = messages[messages.length - 1].content;
  const system = buildAdminSystemPrompt(profile.extraInstructions);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Enqueue bisa gagal kalau klien sudah memutus koneksi (admin menekan Stop) — jangan
      // sampai melempar error yang menutupi alasan sebenarnya.
      const send = (obj: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          // koneksi sudah ditutup
        }
      };

      const startedAt = Date.now();
      let answer = "";
      let failure: string | null = null;
      let toolRounds = 0;
      let stopped: "budget" | "cancelled" | null = null;
      const toolsUsed: string[] = [];

      /** Koneksi klien putus (mis. admin menekan Stop) → jangan panggil model lagi. */
      const clientGone = () => req.signal.aborted;

      try {
        const convo: Array<Record<string, unknown>> = [{ role: "system", content: system }, ...messages];

        for (let round = 0; round < profile.maxToolRounds; round++) {
          if (clientGone()) {
            stopped = "cancelled";
            failure = CANCELLED_MARK;
            break;
          }

          // R2: berhenti SEBELUM memanggil model kalau anggaran waktu total hampir habis.
          const remainingMs = REQUEST_BUDGET_MS - (Date.now() - startedAt);
          if (remainingMs <= 1_000) {
            stopped = "budget";
            failure = `batas waktu total ${Math.round(REQUEST_BUDGET_MS / 1000)} detik tercapai`;
            send({ notice: BUDGET_NOTICE });
            break;
          }

          if (round > 0) send({ reset: true });

          const res = await streamChatCompletion({
            baseUrl: profile.baseUrl,
            apiKey: profile.apiKey,
            model: profile.model,
            messages: convo,
            tools: ADMIN_TOOLS,
            temperature: profile.temperature,
            maxTokens: profile.maxTokens,
            // Sisa anggaran total juga membatasi SATU panggilan model, supaya tidak ada
            // panggilan yang sendirian melewati batas keseluruhan.
            timeoutMs: Math.min(profile.timeoutMs, Math.max(1_000, remainingMs)),
            // Pembatalan dari klien diteruskan ke panggilan provider (R8).
            signal: req.signal,
          });

          if (!res.ok || !res.body) {
            const detail = await res.text().catch(() => "");
            console.error("[AI-ADMIN] provider error:", res.status, detail.slice(0, 200));
            failure = `HTTP ${res.status}: ${String(detail).slice(0, 300)}`;
            send({ error: "Maaf, asisten sedang tidak bisa menjawab. Coba lagi." });
            break;
          }

          const { content, toolCalls } = await consumeOpenAIStream(res.body, (delta) => send({ delta }));

          if (clientGone()) {
            stopped = "cancelled";
            failure = CANCELLED_MARK;
            break;
          }

          if (toolCalls.length) {
            toolRounds += 1;
            convo.push({ role: "assistant", content: content || null, tool_calls: toolCalls });
            for (const call of toolCalls) {
              // Jangan lanjut jalan-jalan tool kalau admin sudah membatalkan.
              if (clientGone()) {
                stopped = "cancelled";
                failure = CANCELLED_MARK;
                break;
              }
              if (!toolsUsed.includes(call.function.name)) toolsUsed.push(call.function.name);
              // Read-only: hasil tool hanya dibaca model, tidak ada penulisan ke database.
              // Panjangnya sudah dibatasi di `executeAdminTool` (R3).
              const result = await executeAdminTool(call.function.name, call.function.arguments);
              convo.push({ role: "tool", tool_call_id: call.id, content: result.text });
            }
            if (stopped) break;
            continue;
          }

          answer = content;
          break;
        }

        if (!answer && !failure) failure = "tidak ada jawaban dari model";
        send({ done: true });
      } catch (error) {
        const aborted = error instanceof Error && error.name === "AbortError";
        if (aborted && clientGone()) {
          // Dibedakan dari error provider: ini pembatalan oleh admin.
          stopped = "cancelled";
          failure = CANCELLED_MARK;
        } else {
          console.error("[AI-ADMIN] Permintaan gagal:", error);
          failure = `exception: ${String(error).slice(0, 300)}`;
          send({ error: "Maaf, asisten sedang tidak bisa menjawab. Coba lagi." });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // sudah ditutup
        }

        const usage = {
          actor,
          sessionId,
          model: profile.model,
          question,
          answer,
          toolsUsed: [...toolsUsed],
          toolRounds,
          durationMs: Date.now() - startedAt,
          error: failure,
        };

        // Best-effort pencatatan pemakaian & audit.
        // Kasus TERHENTI (batas waktu / dibatalkan admin): tulis LANGSUNG sebelum stream
        // selesai — `after()` tidak diandalkan sebagai jaminan, karena fungsi bisa dimatikan
        // lebih dulu saat stream diputus.
        // Kasus normal: tetap pakai `after()` supaya tidak menahan jawaban.
        if (stopped) {
          await logAdminAiUsage(usage);
        } else {
          after(async () => {
            await logAdminAiUsage(usage);
          });
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
