"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/AdminToast";

/**
 * Panel admin "Live Chat" — daftar percakapan AI.
 *
 * Berguna untuk menemukan pertanyaan yang belum terjawab / diarahkan ke admin,
 * lalu menambahkannya ke Knowledge (kartu Live Chat AI di Pengaturan).
 * Data dibaca lewat `/api/admin/chat-logs` (service role; chat_logs tanpa policy RLS).
 */

interface ChatLog {
  id: string;
  session_id: string | null;
  locale: string | null;
  question: string | null;
  answer: string | null;
  tools_used: string[] | null;
  escalated: boolean | null;
  error: string | null;
  created_at: string;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function ChatLogsView() {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyEscalated, setOnlyEscalated] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const toast = useToast();

  async function addToFaq(id: string) {
    setAddingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/chat-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ action: "toFaq", id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.showToast("error", json.error || "Gagal menambah pengetahuan");
        return;
      }
      toast.showToast(
        "success",
        json.duplicate ? "Percakapan ini sudah ada di pengetahuan AI" : "Ditambahkan ke pengetahuan AI (tidak tampil di /faq)"
      );
    } catch (e) {
      console.error("[ADMIN] Gagal menambah FAQ:", e);
      toast.showToast("error", "Gagal menambah FAQ");
    } finally {
      setAddingId(null);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/chat-logs?limit=200", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat log");
      setLogs(json.logs || []);
    } catch (e) {
      console.error("[ADMIN] Gagal memuat log chat:", e);
      toast.showToast("error", "Gagal memuat log chat");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = logs.filter((l) => {
    if (onlyEscalated && !l.escalated) return false;
    if (onlyErrors && !l.error) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (l.question || "").toLowerCase().includes(q) || (l.answer || "").toLowerCase().includes(q);
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pertanyaan atau jawaban..."
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--bd)", color: "var(--fg)" }}
          />
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--fg2)" }}>
          <input type="checkbox" checked={onlyEscalated} onChange={(e) => setOnlyEscalated(e.target.checked)} />
          Hanya yang diarahkan ke admin
        </label>

        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--fg2)" }}>
          <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
          Hanya yang gagal
        </label>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
          style={{ border: "1px solid var(--bd)", color: "var(--fg)" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Muat ulang
        </button>
      </div>

      <p className="text-xs" style={{ color: "var(--fg3)" }}>
        {filtered.length} dari {logs.length} percakapan terakhir.
      </p>

      {loading ? (
        <div className="card p-6 flex items-center gap-2" style={{ color: "var(--fg3)" }}>
          <Loader2 size={18} className="animate-spin" /> Memuat...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-sm" style={{ color: "var(--fg3)" }}>
          Belum ada percakapan yang cocok.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <article key={log.id} className="card p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--fg3)" }}>
                <span>{formatTime(log.created_at)}</span>
                {log.locale && <span>· {log.locale.toUpperCase()}</span>}
                {log.escalated && (
                  <span className="px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#92400e" }}>
                    Diarahkan ke admin
                  </span>
                )}
                {log.error && (
                  <span className="px-2 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                    Gagal
                  </span>
                )}
                {log.tools_used && log.tools_used.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--sub)", color: "var(--fg2)" }}>
                    {[...new Set(log.tools_used)].join(", ")}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold whitespace-pre-wrap break-words" style={{ color: "var(--fg)" }}>
                {log.question || "(tanpa pertanyaan)"}
              </p>
              <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--fg2)" }}>
                {log.answer || "(tidak ada jawaban)"}
              </p>
              {log.error && (
                <p className="text-[11px] whitespace-pre-wrap break-words" style={{ color: "#b91c1c" }}>
                  Error: {log.error}
                </p>
              )}

              {log.question && log.answer && (
                <div className="pt-1">
                  <button
                    onClick={() => addToFaq(log.id)}
                    disabled={addingId === log.id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={{ border: "1px solid var(--bd)", color: "var(--fg)" }}
                  >
                    {addingId === log.id && <Loader2 size={12} className="animate-spin" />}
                    Tambah ke Knowledge AI
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
