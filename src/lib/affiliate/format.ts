/**
 * Format angka & tanggal portal Affiliate.
 * Mengikuti gaya mockup (id-ID, "Rp" tanpa spasi, nama bulan singkat).
 */

export function money(value: number | null | undefined): string {
  return "Rp" + Math.round(Number(value || 0)).toLocaleString("id-ID");
}

export function num(value: number | null | undefined): string {
  return Math.round(Number(value || 0)).toLocaleString("id-ID");
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function tgl(value: string | number | Date | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function jam(value: string | number | Date | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${tgl(d)}, ${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Persentase perubahan (a vs b), dalam persen. */
export function pct(a: number, b: number): number {
  if (!b) return 0;
  return ((a - b) / b) * 100;
}

/** Label status pesanan SAMAQU (dipakai juga di portal). */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const COMMISSION_STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu Validasi",
  disetujui: "Disetujui",
  dibayarkan: "Dibayarkan",
  ditolak: "Tidak Disetujui",
};

export const WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu",
  diproses: "Diproses",
  berhasil: "Berhasil",
  ditolak: "Ditolak",
};

export const AFFILIATE_STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu Persetujuan",
  aktif: "Affiliate Aktif",
  ditolak: "Ditolak",
  nonaktif: "Nonaktif",
};
