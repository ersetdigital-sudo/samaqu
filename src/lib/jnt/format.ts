/**
 * Format kecil khusus J&T — dipisah dari `order.ts` supaya bisa diuji tanpa mengirim order.
 *
 * Keduanya mengikuti dokumentasi resmi J&T ("J&T API Platform"):
 * - `orderdate`  : format "YYYY-MM-DD hh:mm:ss" dan **UTC+7 (WIB)** — server produksi (Vercel)
 *                  berjalan di UTC, jadi jamnya tidak boleh memakai waktu lokal server apa adanya.
 * - `item_name`  : "No special character allowed, please limit the length".
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** `orderdate` J&T: "YYYY-MM-DD hh:mm:ss" dalam WIB (UTC+7), apa pun zona waktu server. */
export function wibOrderDate(date: Date = new Date()): string {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return (
    `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())} ` +
    `${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}:${pad(wib.getUTCSeconds())}`
  );
}

/**
 * `item_name` J&T: buang karakter khusus (mis. "—", ",", "/", tanda kutip), rapikan spasi ganda,
 * dan batasi panjangnya. Nama produk tetap terbaca — hanya tanda baca yang diganti spasi,
 * huruf/angka/titik/strip dipertahankan.
 */
export function sanitizeJntItemName(value: unknown, maxLength = 50): string {
  const clean = String(value ?? "")
    .replace(/[^\p{L}\p{N} .-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
  // Nama yang isinya cuma tanda baca tidak boleh jadi kosong (field ini wajib di J&T).
  return clean || "Produk SAMAQU";
}
