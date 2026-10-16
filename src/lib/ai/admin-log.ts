/**
 * Pencatatan pemakaian & audit log ASISTEN AI ADMIN.
 *
 * Semua tulis ke tabel `ai_admin_logs` bersifat BEST-EFFORT:
 *  - tidak pernah melempar error ke pemanggil (jawaban admin jangan gagal hanya karena log);
 *  - kalau tabelnya belum dibuat (DDL `supabase/ai-admin.sql` dijalankan manual), kegagalan
 *    hanya dicatat di console server.
 *
 * TIDAK PERNAH menulis kredensial/token ke log. Pertanyaan & jawaban dipotong agar tabel tidak
 * membengkak dan data pelanggan tidak tersimpan berlebihan.
 *
 * Server-only.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_TEXT = 4000;

export interface AdminAiUsage {
  /** Email admin yang login (dari `opsActorEmail`). */
  actor: string;
  sessionId: string | null;
  model: string;
  question: string;
  answer: string;
  toolsUsed: string[];
  toolRounds: number;
  durationMs: number;
  /** Keterangan gagal (tanpa data sensitif). Null = sukses. */
  error: string | null;
}

function cut(value: string): string {
  return String(value || "").slice(0, MAX_TEXT);
}

/** Tulis satu baris pemakaian. Tidak pernah melempar. */
export async function logAdminAiUsage(usage: AdminAiUsage): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("ai_admin_logs")
      .insert({
        actor: usage.actor || "admin",
        session_id: usage.sessionId,
        model: usage.model,
        question: cut(usage.question),
        answer: cut(usage.answer),
        tools_used: usage.toolsUsed,
        tool_rounds: usage.toolRounds,
        duration_ms: usage.durationMs,
        error: usage.error,
      });

    if (error) {
      // Umumnya: tabel belum dibuat → kode tetap jalan, hanya log yang hilang.
      console.error("[AI-ADMIN] gagal menulis ai_admin_logs:", error.message);
    }
  } catch (e) {
    console.error("[AI-ADMIN] gagal menulis ai_admin_logs:", e);
  }
}
