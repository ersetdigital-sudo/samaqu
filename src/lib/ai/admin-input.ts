/**
 * Validasi input percakapan asisten AI admin.
 *
 * Dipisah dari route supaya:
 *  - bisa diuji langsung tanpa HTTP (lihat catatan pengujian di vault);
 *  - urutan "validasi dulu, baru pakai kuota & panggil model" mudah dibaca di route.
 *
 * Modul ini sengaja TIDAK menyentuh kontrak API chat customer (`/api/chat` punya validasinya
 * sendiri dan tidak diubah).
 *
 * Server-only.
 */

export interface AdminChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type AdminMessagesResult =
  | { ok: true; messages: AdminChatMessage[] }
  | { ok: false; status: 400; error: string };

export interface AdminMessageLimits {
  /** Batas panjang satu pesan (dipotong, bukan ditolak). */
  maxChars: number;
  /** Batas jumlah pesan yang dikirim ke model (pesan terakhir). */
  maxMessages: number;
}

/**
 * Ambil pesan yang sah dari body request.
 *
 * Aturan:
 *  - hanya `role` user/assistant dengan `content` berupa string;
 *  - pesan terakhir WAJIB dari user dan TIDAK boleh kosong/hanya whitespace;
 *  - `content` dipotong ke `maxChars`; riwayat dipangkas ke `maxMessages` terakhir.
 */
export function parseAdminMessages(raw: unknown, limits: AdminMessageLimits): AdminMessagesResult {
  const incoming = Array.isArray(raw) ? raw : [];

  const messages: AdminChatMessage[] = incoming
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        !!m &&
        typeof m === "object" &&
        ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
        typeof (m as { content?: unknown }).content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, limits.maxChars) }))
    .slice(-limits.maxMessages);

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return { ok: false, status: 400, error: "Tidak ada pertanyaan." };
  }
  // Pertanyaan kosong / hanya spasi ditolak SEBELUM kuota dipakai dan sebelum model dipanggil —
  // pesan kosong tetap menghasilkan panggilan berbayar kalau diteruskan.
  if (!last.content.trim()) {
    return { ok: false, status: 400, error: "Pertanyaan tidak boleh kosong." };
  }

  return { ok: true, messages };
}
