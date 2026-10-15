import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clearMayarConfigCache, getMayarConfig, mayarBaseUrl, normalizeMayarEnv } from "@/lib/mayar";
import { SITE_URL } from "@/lib/site-config";

/**
 * Pengaturan pembayaran Mayar untuk dashboard admin.
 *
 * Tabel `mayar_settings` sengaja TANPA policy RLS (tidak bisa dibaca/ditulis anon client), jadi
 * semua akses lewat route ini: hanya admin (session Supabase + terdaftar di tabel `admins`).
 * API key & webhook token TIDAK pernah dikirim balik ke browser — hanya status + sebagian disamarkan.
 */

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return false;
    const { data } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    return !!data;
  } catch (e) {
    console.error("[ADMIN] Verifikasi admin gagal:", e);
    return false;
  }
}

function mask(value: string): string {
  if (value.length <= 6) return "*".repeat(value.length);
  return `${value.slice(0, 4)}${"*".repeat(Math.max(0, value.length - 8))}${value.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("mayar_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  // Tabelnya belum dibuat — admin harus menjalankan supabase/mayar.sql dulu.
  if (error) {
    console.warn("[ADMIN] mayar_settings belum siap:", error.message);
    return NextResponse.json({
      tableReady: false,
      enabled: false,
      env: "sandbox",
      hasApiKey: false,
      apiKeyPreview: "",
      hasWebhookToken: false,
      webhookTokenPreview: "",
      webhookUrl: `${SITE_URL}/api/webhooks/mayar`,
    });
  }

  const envApiKey = process.env.MAYAR_API_KEY || "";
  const envWebhookToken = process.env.MAYAR_WEBHOOK_TOKEN || "";
  const apiKey = (data?.api_key as string) || envApiKey;
  const webhookToken = (data?.webhook_token as string) || envWebhookToken;

  return NextResponse.json({
    tableReady: true,
    enabled: data?.enabled === true || process.env.MAYAR_ENABLED === "1",
    env: normalizeMayarEnv((data?.env as string) ?? process.env.MAYAR_ENV),
    hasApiKey: !!apiKey,
    apiKeyPreview: apiKey ? mask(apiKey) : "",
    hasWebhookToken: !!webhookToken,
    webhookTokenPreview: webhookToken ? mask(webhookToken) : "",
    // URL ini yang didaftarkan di Mayar (Integration → Webhook). Token ikut di query supaya
    // tetap terverifikasi walau Mayar tidak mengirim header `x-callback-token`.
    webhookUrl: `${SITE_URL}/api/webhooks/mayar${webhookToken ? `?token=${encodeURIComponent(webhookToken)}` : ""}`,
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  // Aksi "test": pastikan API key benar-benar bisa dipakai (panggil endpoint ringan Mayar).
  if (body?.action === "test") {
    const config = await getMayarConfig();
    if (!config.apiKey) return NextResponse.json({ ok: false, error: "API key belum diisi." });
    try {
      const res = await fetch(`${mayarBaseUrl(config.env)}/products?limit=1`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { statusCode?: number; messages?: string } | null;
      const ok = res.ok && Number(json?.statusCode ?? res.status) < 400;
      return NextResponse.json({
        ok,
        env: config.env,
        error: ok ? null : json?.messages || `Mayar menolak (${res.status}).`,
      });
    } catch (e) {
      console.error("[MAYAR] Tes koneksi gagal:", e);
      return NextResponse.json({ ok: false, error: "Tidak bisa menghubungi Mayar." });
    }
  }

  const patch: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
  if (typeof body?.apiKey === "string" && body.apiKey.trim()) patch.api_key = body.apiKey.trim();
  if (typeof body?.webhookToken === "string" && body.webhookToken.trim()) patch.webhook_token = body.webhookToken.trim();
  if (typeof body?.env === "string") patch.env = normalizeMayarEnv(body.env);
  if (typeof body?.enabled === "boolean") patch.enabled = body.enabled;

  const { error } = await getSupabaseAdmin().from("mayar_settings").upsert(patch, { onConflict: "id" });
  if (error) {
    console.error("[ADMIN] Gagal menyimpan mayar_settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  clearMayarConfigCache();
  return NextResponse.json({ success: true });
}
