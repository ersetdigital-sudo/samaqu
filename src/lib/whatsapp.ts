/**
 * Tautan WhatsApp — satu sumber untuk tombol "Hubungi via WhatsApp".
 *
 * `wa.me` menuntut nomor internasional tanpa "+" dan **tanpa angka 0 di depan**: nomor
 * lokal seperti "0812…" (yang paling sering diketik pelanggan) dijawab WhatsApp dengan
 * halaman "nomor telepon tidak valid", jadi chat tidak pernah terbuka. Itulah sebabnya
 * tombol dengan nomor mentah terasa "kurang smooth" saat diklik.
 *
 * Modul ini murni (tanpa React/browser) supaya bisa diuji langsung dengan Node.
 */

/** Nomor apa pun → format `wa.me` (62…, tanpa "+"). Nomor tak dikenal dibiarkan apa adanya. */
export function waNumber(raw?: string | null): string {
  const digits = (raw || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/** Tautan yang langsung membuka percakapan dengan pesan siap kirim. */
export function waLink(raw: string | null | undefined, message: string): string {
  return `https://wa.me/${waNumber(raw)}?text=${encodeURIComponent(message)}`;
}

/**
 * Teks pesan standar SAMAQU untuk menagih pembayaran — dipakai tombol
 * "Hubungi via WhatsApp" di detail pesanan untuk **semua** pesanan; hanya nama
 * panggilan pelanggan (kata pertama dari nama) yang berubah.
 */
export function pesanPembayaran(nama?: string | null): string {
  const panggilan = (nama || "").trim().split(/\s+/)[0] || "Kakak";
  return `Halo Kak ${panggilan} 😊

Pesanan Kakak di SAMAQU sudah masuk, nih! Tinggal selangkah lagi supaya pesanan bisa segera kami proses.

Yuk, selesaikan pembayarannya sekarang ya, Kak. Setelah transfer, kirim bukti pembayarannya ke sini agar pesanan bisa langsung kami lanjutkan.

Terima kasih!`;
}
