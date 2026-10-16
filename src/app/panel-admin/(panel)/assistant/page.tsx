"use client";

import { useEffect, useRef, useState } from "react";
import { authToken } from "../../panel-api";
import styles from "../../panel.module.css";

/**
 * Asisten Operasional (internal) — halaman `/panel-admin/assistant`.
 *
 * Beda dengan widget live chat di website:
 *  - memanggil `/api/panel-ai/chat` yang WAJIB sesi admin (server yang memverifikasi);
 *  - sesi & riwayat disimpan dengan kunci localStorage TERPISAH dari chat customer;
 *  - read-only: hanya menampilkan data, tidak ada aksi yang mengubah database.
 *
 * Pembatalan (R8): tombol Stop meng-abort request; jawaban yang terpotong ditandai
 * "belum lengkap" dan TIDAK ikut disimpan sebagai jawaban penuh.
 */

interface Msg {
  role: "user" | "assistant";
  content: string;
  /** Jawaban terpotong (user menekan Stop / batas waktu server). */
  incomplete?: boolean;
}

const SESSION_KEY = "samaqu_admin_ai_sid";
const HISTORY_KEY = "samaqu_admin_ai_history";
const HISTORY_MAX = 30;

const SUGGESTIONS = [
  "Bagaimana kondisi operasional hari ini?",
  "Omset bulan ini berapa?",
  "Pesanan mana yang perlu dikirim?",
  "Produk apa saja yang stoknya menipis?",
];

function newSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // diabaikan — jatuh ke id berbasis waktu
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Render sederhana: baris berpoin + **tebal**, tanpa dependency markdown. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
        const content = bullet ? bullet[1] : line;
        const parts = content.split(/\*\*(.+?)\*\*/g);
        return (
          <span key={i} className={bullet ? `${styles.aiLine} ${styles.aiBullet}` : styles.aiLine}>
            {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>))}
          </span>
        );
      })}
    </>
  );
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const sessionIdRef = useRef("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      const sid = stored || newSessionId();
      localStorage.setItem(SESSION_KEY, sid);
      sessionIdRef.current = sid;

      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMessages(
            parsed
              .filter(
                (m): m is Msg =>
                  !!m &&
                  typeof m.content === "string" &&
                  (m.role === "user" || m.role === "assistant") &&
                  // jangan pernah memuat jawaban yang ditandai belum lengkap
                  m.incomplete !== true
              )
              .slice(-HISTORY_MAX)
          );
        }
      }
    } catch {
      // mode privat: sesi hanya hidup di memori
    }
    setReady(true);
  }, []);

  // Riwayat HANYA menyimpan jawaban yang lengkap (R8).
  useEffect(() => {
    if (!ready) return;
    try {
      const complete = messages.filter((m) => !m.incomplete).slice(-HISTORY_MAX);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(complete));
    } catch {
      // diabaikan
    }
  }, [messages, ready]);

  // Tinggalkan halaman saat masih streaming → batalkan supaya tidak ada panggilan model
  // yang jalan sia-sia.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    []
  );

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  /** Tandai jawaban terakhir sebagai belum lengkap + tampilkan alasannya. */
  function markIncomplete(why: string) {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== "assistant") return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...last, incomplete: true };
      return copy;
    });
    setNotice(why);
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setNotice("Dihentikan oleh Anda. Jawaban di atas belum lengkap.");
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(history);
    setInput("");
    setBusy(true);
    setError(null);
    setNotice(null);

    const token = await authToken();
    if (!token) {
      setBusy(false);
      setError("Sesi admin tidak ditemukan. Muat ulang halaman lalu masuk kembali.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/panel-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history.slice(-16), sessionId: sessionIdRef.current || null }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let message = `Gagal menghubungi asisten (${res.status}).`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          // pakai pesan default
        }
        setError(message);
        return;
      }

      const render = (content: string) => {
        setMessages((prev) => {
          const base = prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev;
          return [...base, { role: "assistant", content }];
        });
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let serverNotice: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;

          let evt: { delta?: string; reset?: boolean; error?: string; notice?: string };
          try {
            evt = JSON.parse(payload) as typeof evt;
          } catch {
            continue;
          }

          if (evt.reset) acc = "";
          if (typeof evt.notice === "string") serverNotice = evt.notice;
          if (typeof evt.delta === "string") {
            acc += evt.delta;
            render(acc);
          }
          if (typeof evt.error === "string") {
            acc = acc || evt.error;
            render(acc);
          }
        }
      }

      if (!acc) {
        render("Maaf, tidak ada jawaban yang bisa ditampilkan. Coba tanya lagi.");
      } else if (serverNotice) {
        // Server menghentikan proses (batas waktu) → jawaban tidak diklaim lengkap.
        markIncomplete(serverNotice);
      }
    } catch (e) {
      // Pembatalan oleh admin dibedakan dari error jaringan/provider.
      if (e instanceof DOMException && e.name === "AbortError") {
        markIncomplete("Dihentikan oleh Anda. Jawaban di atas belum lengkap.");
      } else {
        setError("Koneksi ke asisten terputus. Coba lagi.");
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className={styles.aiWrap}>
      <div className={styles.aiHead}>
        <h1 className={styles.aiTitle}>Asisten Operasional</h1>
        <p className={styles.aiSub}>
          Tanya kondisi toko dengan bahasa biasa. Asisten membaca data langsung dari database dan hanya bisa melihat — tidak mengubah apa pun.
        </p>
      </div>

      <div className={styles.aiLog} ref={listRef}>
        {messages.length === 0 ? (
          <div className={styles.aiEmpty}>
            <p style={{ margin: "0 0 12px" }}>Belum ada percakapan. Coba salah satu pertanyaan ini:</p>
            <div className={styles.aiChips}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className={styles.aiChip} onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`${styles.aiRow} ${m.role === "user" ? styles.aiRowUser : ""}`}>
              <div className={`${styles.aiBubble} ${m.role === "user" ? styles.aiUser : styles.aiBot}`}>
                <RichText text={m.content} />
                {m.incomplete ? <span className={styles.aiTag}>belum lengkap</span> : null}
              </div>
            </div>
          ))
        )}
        {busy ? (
          <div className={styles.aiRow}>
            <div className={`${styles.aiBubble} ${styles.aiBot}`}>Sedang memeriksa data…</div>
          </div>
        ) : null}
      </div>

      {messages.length > 0 ? (
        <div className={styles.aiChips}>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className={styles.aiChip} disabled={busy} onClick={() => void send(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {notice ? <p className={styles.aiNotice}>{notice}</p> : null}
      {error ? <p className={styles.aiError}>{error}</p> : null}

      <form
        className={styles.aiForm}
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          ref={inputRef}
          className={styles.aiInput}
          rows={1}
          placeholder="Tulis pertanyaan operasional… (Enter kirim, Shift+Enter baris baru)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        {busy ? (
          <button className={styles.aiStop} type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button className={styles.aiSend} type="submit" disabled={!input.trim()}>
            Kirim
          </button>
        )}
      </form>

      <p className={styles.aiNote}>
        Read-only · jawaban bisa salah, periksa menu terkait sebelum mengambil keputusan.
      </p>
    </div>
  );
}
