/**
 * Sumber & status untuk menu Transaksi (dashboard internal /ops).
 *
 * Satu tempat untuk kunci `orders.source` + label yang dibaca admin, dipakai bersama
 * oleh halaman Transaksi, form Tambah/Edit, dan API `/api/ops/transaksi` supaya layar
 * dan server tidak pernah beda istilah.
 *
 * Catatan: pesanan dari website TIDAK menulis kolom ini (default database sudah
 * `website`), jadi checkout dan Open Order tidak perlu diubah.
 */

/** Kunci yang disimpan di `orders.source`. */
export const SOURCE_KEYS: string[] = ["website", "whatsapp", "instagram", "shopee", "tiktok", "offline"];

/** Label yang dibaca admin (badge di tabel & filter). */
export const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  shopee: "Shopee",
  tiktok: "TikTok Shop",
  offline: "Offline",
};

/** Sumber yang boleh dipilih dari form — Website otomatis dari checkout website. */
export const MANUAL_SOURCE_KEYS: string[] = SOURCE_KEYS.filter((key) => key !== "website");

/** Normalisasi nilai sumber apa pun ke kunci yang dikenal (default: `website`). */
export function sourceKey(value: unknown): string {
  const key = String(value ?? "").trim().toLowerCase();
  return SOURCE_KEYS.includes(key) ? key : "website";
}

export function sourceLabel(value: unknown): string {
  return SOURCE_LABEL[sourceKey(value)] || "Website";
}

/** Status pesanan → istilah yang dibaca admin di menu Transaksi. */
export const STATUS_LABEL: Record<string, string> = {
  pending: "Belum Bayar",
  diproses: "Lunas",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export function statusLabel(status: unknown): string {
  return STATUS_LABEL[String(status ?? "")] || String(status ?? "-");
}

/**
 * Status yang dihitung sebagai penjualan sah (omset & pcs terjual).
 * Pesanan batal dan yang belum dibayar tidak ikut dihitung.
 */
export const SALE_STATUSES: string[] = ["diproses", "dikirim", "selesai"];

/** Ringkasan produk satu baris daftar, mis. `Jiharkah B-01 x2 +1 lainnya`. */
export function itemSummary(
  items: { series?: string | null; kain?: string | null; product_name?: string | null; quantity?: number | null }[],
): string {
  if (!items || items.length === 0) return "-";
  const first = items[0];
  const name = String(first.series || first.product_name || "Item").trim();
  const kain = String(first.kain || "").trim();
  const qty = Number(first.quantity) || 0;
  const head = `${name}${kain ? ` ${kain}` : ""} x${qty}`;
  const rest = items.length - 1;
  return rest > 0 ? `${head} +${rest} lainnya` : head;
}
