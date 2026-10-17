/**
 * Template notifikasi WhatsApp yang bisa diubah admin dari panel Pengaturan.
 *
 * CARA KERJA (aman secara desain):
 *  - Setiap notifikasi punya **teks bawaan di kode** (`src/lib/fonnte.ts`). Itu yang dipakai
 *    selama admin belum mengubah apa pun — jadi perilaku sistem TIDAK berubah kalau tabel
 *    `notifikasi_template` kosong.
 *  - Kalau ada baris override untuk sebuah notifikasi, teks dari database dipakai, lalu
 *    penanda `{nama_penanda}` diisi nilai sebenarnya oleh pengirim pesan.
 *  - Penanda yang tidak dikenal DIBIARKAN apa adanya supaya salah ketik langsung kelihatan di
 *    pesan, bukan menghilang diam-diam.
 *
 * Tabel dibuat lewat DDL di Supabase (`notifikasi_template`: key, body, updated_at) dan
 * RLS-nya aktif tanpa policy → hanya service role (server) yang bisa membaca/menulis.
 */

import { getSupabaseAdmin } from "./supabase-admin";

/** Nilai untuk mengisi penanda, mis. `{ nama: "Budi", nomor: "SMQ-..." }`. */
export type VariabelTemplate = Record<string, string>;

/**
 * Isi penanda `{nama}` dengan nilai dari `variabel`. Penanda yang tidak ada nilainya
 * dibiarkan apa adanya (jangan dihapus) supaya kesalahan ketik kelihatan.
 */
export function isiVariabel(body: string, variabel: VariabelTemplate): string {
  return String(body ?? "").replace(/\{([a-zA-Z0-9_]+)\}/g, (utuh, nama: string) =>
    Object.prototype.hasOwnProperty.call(variabel, nama) && variabel[nama] !== undefined
      ? variabel[nama]
      : utuh,
  );
}

/** Daftar penanda di dalam sebuah teks (dipakai panel untuk memperingatkan penanda tak dikenal). */
export function penandaDiTeks(body: string): string[] {
  return [...new Set([...String(body ?? "").matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]))];
}

/* ── Override dari database (cache 60 detik supaya tidak query tiap pesan) ── */

const CACHE_TTL_MS = 60_000;
let cache: { isi: Record<string, string>; ts: number } | null = null;
let tabelBelumAda = false;

export function bersihkanCacheTemplate(): void {
  cache = null;
}

/**
 * Semua override yang tersimpan. Kalau tabelnya belum ada (DDL belum dijalankan) atau
 * pembacaan gagal, hasilnya objek kosong — pesan tetap memakai teks bawaan.
 */
export async function ambilOverride(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.isi;
  if (tabelBelumAda) return {};

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("notifikasi_template").select("key, body");
    if (error) {
      // 42P01 = tabel belum ada. Dicatat sekali supaya log tidak dibanjiri.
      if (!tabelBelumAda) {
        tabelBelumAda = true;
        console.warn("[NOTIF-TEMPLATE] Tabel notifikasi_template belum ada:", error.message);
      }
      return {};
    }
    const isi: Record<string, string> = {};
    for (const baris of data || []) {
      const key = String(baris?.key || "").trim();
      const body = String(baris?.body || "").trim();
      if (key && body) isi[key] = body;
    }
    cache = { isi, ts: Date.now() };
    return isi;
  } catch (error) {
    console.error("[NOTIF-TEMPLATE] Gagal membaca template:", error);
    return {};
  }
}

/**
 * Pesan final untuk sebuah notifikasi: pakai override kalau ada, kalau tidak pakai `bawaan`
 * (hasil penyusun di kode) APA ADANYA — jadi tanpa override, pesan yang terkirim identik
 * dengan sebelum fitur ini ada.
 */
export async function buildNotifikasi(
  key: string,
  bawaan: string,
  variabel: VariabelTemplate,
): Promise<string> {
  const override = (await ambilOverride())[key];
  if (!override) return bawaan;
  return isiVariabel(override, variabel);
}

/* ── Simpan / kembalikan ke bawaan (dipakai API panel admin) ── */

export async function simpanOverride(key: string, body: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("notifikasi_template")
    .upsert({ key, body, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  bersihkanCacheTemplate();
}

export async function hapusOverride(key: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("notifikasi_template").delete().eq("key", key);
  if (error) throw new Error(error.message);
  bersihkanCacheTemplate();
}
