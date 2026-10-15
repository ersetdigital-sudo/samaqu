/**
 * Sensor nomor HP **untuk tampilan label pengiriman saja**.
 *
 * - Hanya 4 digit terakhir yang tampil; semua karakter SEBELUMNYA diganti karakter bertitik
 *   dengan JUMLAH KARAKTER YANG SAMA, supaya lebar teks (dan tata letak label) tidak bergeser.
 *   `085603324143` → `••••••••4143` (12 karakter tetap 12 karakter).
 * - Non-digit (`+62`, spasi, strip) ikut disensor karena ikut menyusun lebar teks.
 * - Nomor kosong / tanpa digit / 4 digit atau kurang dikembalikan APA ADANYA (tidak ada yang perlu
 *   disembunyikan, dan tidak boleh error).
 *
 * PENTING: ini HANYA untuk tampilan label. Data di database dan nomor yang dikirim ke J&T
 * (Order Create) tetap memakai nomor lengkap — jangan pakai fungsi ini di luar label.
 */
export const PHONE_MASK_CHAR = "•";

export function maskPhoneLast4(value?: string | null): string {
  const raw = String(value ?? "");
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 4) return raw;

  // Digit pertama yang boleh tampil = digit ke-(n-3); semua karakter sebelum posisi itu disensor.
  const firstVisibleDigitNumber = digits.length - 3;
  let seen = 0;
  for (let i = 0; i < raw.length; i++) {
    if (!/\d/.test(raw[i])) continue;
    seen += 1;
    if (seen === firstVisibleDigitNumber) {
      return PHONE_MASK_CHAR.repeat(i) + raw.slice(i);
    }
  }
  return raw;
}
