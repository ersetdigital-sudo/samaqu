/**
 * Tahap (stage) alur pesanan admin — istilah ala Shopee Seller Centre.
 *
 * Status PESANAN (`orders.status`) dan status PENGIRIMAN (`orders.shipping_status`) sengaja
 * dipisah:
 * - `orders.status`: `pending` → `diproses` → `dikirim` → `selesai` (+ `dibatalkan`).
 *   `dikirim` HANYA ditulis saat J&T melaporkan pemindaian (lihat `src/lib/jnt/tracking-sync.ts`),
 *   bukan sekadar karena resi sudah terbit.
 * - `orders.shipping_status`: `menunggu_pickup` → `dikirim` → `selesai` (NULL = resi belum dibuat).
 *
 * Tahap daftar diturunkan murni dari `orders.status`:
 * `pending`=Belum Bayar, `diproses`=Perlu Dikirim (resi bisa belum/sudah terbit), `dikirim`,
 * `selesai`, `dibatalkan`. Informasi "Menunggu Pickup" dsb. ditampilkan terpisah lewat
 * `shippingLine()`, bukan sebagai tahap.
 *
 * Modul ini murni lapisan tampilan: tidak menulis status apa pun ke database.
 */

export type OrderStage = "belum_bayar" | "perlu_dikirim" | "dikirim" | "selesai" | "dibatalkan";

/** Field minimum untuk menentukan tahap: status pesanan. */
export interface StageSource {
  status: string;
}

export function orderStage(order: StageSource): OrderStage {
  switch (order.status) {
    case "pending":
      return "belum_bayar";
    case "dikirim":
      return "dikirim";
    case "selesai":
      return "selesai";
    case "dibatalkan":
      return "dibatalkan";
    default:
      // `diproses` (dibayar, belum diserahkan ke kurir) dan status tak dikenal.
      return "perlu_dikirim";
  }
}

export const ORDER_STAGE_LABEL: Record<OrderStage, string> = {
  belum_bayar: "Belum Bayar",
  perlu_dikirim: "Perlu Dikirim",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

/** Filter daftar pesanan: `"semua"` atau salah satu tahap. */
export type OrderStageFilter = OrderStage | "semua";

/** Tab daftar pesanan, urut sesuai alur kerja penjual (yang perlu dikerjakan lebih dulu). */
export const ORDER_STAGE_TABS: { key: OrderStageFilter; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "belum_bayar", label: ORDER_STAGE_LABEL.belum_bayar },
  { key: "perlu_dikirim", label: ORDER_STAGE_LABEL.perlu_dikirim },
  { key: "dikirim", label: ORDER_STAGE_LABEL.dikirim },
  { key: "selesai", label: ORDER_STAGE_LABEL.selesai },
  { key: "dibatalkan", label: ORDER_STAGE_LABEL.dibatalkan },
];

export function matchesStage(order: StageSource, filter: OrderStageFilter): boolean {
  return filter === "semua" || orderStage(order) === filter;
}

/**
 * Satu-satunya tahap yang menunggu admin menekan tombol ("Atur Pesanan") — dipakai untuk
 * menyorot tab dan tombol aksi di daftar, ala badge "Perlu Dikirim" Shopee.
 */
export function stageNeedsAdminAction(stage: OrderStageFilter): boolean {
  return stage === "perlu_dikirim";
}

/** Warna pill tahap — daftar pesanan memakainya supaya tab dan baris memakai istilah yang sama. */
export const ORDER_STAGE_STYLE: Record<OrderStage, { bg: string; color: string; border: string }> = {
  belum_bayar: { bg: "#fffbeb", color: "#b45309", border: "#fef3c7" },
  perlu_dikirim: { bg: "#fff7ed", color: "#c2410c", border: "#ffedd5" },
  dikirim: { bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe" },
  selesai: { bg: "#ecfdf5", color: "#047857", border: "#d1fae5" },
  dibatalkan: { bg: "#f4f4f5", color: "#52525b", border: "#e4e4e7" },
};

/* ── Status pengiriman (terpisah dari tahap pesanan) ── */

export type ShippingStatus = "menunggu_pickup" | "dikirim" | "selesai";

export const SHIPPING_STATUS_LABEL: Record<ShippingStatus, string> = {
  menunggu_pickup: "Menunggu Pickup",
  dikirim: "Dikirim",
  selesai: "Terkirim",
};

export const SHIPPING_STATUS_STYLE: Record<ShippingStatus, { bg: string; color: string; border: string }> = {
  menunggu_pickup: { bg: "#fff7ed", color: "#c2410c", border: "#ffedd5" },
  dikirim: { bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe" },
  selesai: { bg: "#ecfdf5", color: "#047857", border: "#d1fae5" },
};

/** Sumber untuk status pengiriman: kolom + fallback resi (data lama sebelum kolom ada). */
export interface ShippingSource {
  shipping_status?: string | null;
  awb_no?: string | null;
}

export function shippingStatusOf(order: ShippingSource): ShippingStatus | null {
  if (order.shipping_status === "menunggu_pickup" || order.shipping_status === "dikirim" || order.shipping_status === "selesai") {
    return order.shipping_status;
  }
  // Data lama: resi sudah ada tapi kolom belum pernah diisi → anggap menunggu pickup.
  if (order.awb_no) return "menunggu_pickup";
  return null;
}

/** Ringkasan pengiriman satu baris daftar: kurir + nomor resi + status pengiriman. */
export function shippingLine(
  order: StageSource & ShippingSource & { shipping_method?: string | null }
): { courier: string; resi: string; status: string | null; awaiting: boolean } {
  const stage = orderStage(order);
  const awaiting = !order.awb_no && stage === "perlu_dikirim";
  const ss = shippingStatusOf(order);
  return {
    courier: order.shipping_method || "Pengiriman",
    resi: order.awb_no || (awaiting ? "Resi belum dibuat" : "Tanpa resi"),
    status: ss ? SHIPPING_STATUS_LABEL[ss] : null,
    awaiting,
  };
}
