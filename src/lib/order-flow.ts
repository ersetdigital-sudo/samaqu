/**
 * Tahap (stage) alur pesanan admin — istilah ala Shopee Seller Centre.
 *
 * Tabel `orders` hanya menyimpan empat status: `pending`, `diproses`, `selesai`, `dibatalkan`
 * (plus `dikirim`, yang datang dari pelacakan J&T). Shopee Seller Centre menampilkan daftar
 * pesanan menurut **langkah berikutnya yang harus dikerjakan penjual**, jadi tab "Perlu Dikirim"
 * dan "Dikirim" di sini diturunkan dari status + ada/tidaknya resi:
 * `diproses` tanpa resi = belum diatur (perlu dikirim), `diproses` ber-resi = paket sudah jalan.
 *
 * Ini murni lapisan tampilan: tidak ada status baru yang ditulis ke database, dan filter daftar
 * tidak mengubah query apa pun. Gerbang "Atur Pesanan" tetap status `diproses`
 * (lihat `OrderDetailContent` + bagian "Atur Pesanan" di AGENTS.md) — modul ini hanya menamai
 * dan mengelompokkan keadaan itu supaya cocok dengan yang dilihat admin.
 */

export type OrderStage = "belum_bayar" | "perlu_dikirim" | "dikirim" | "selesai" | "dibatalkan";

/** Field minimum untuk menentukan tahap: status pesanan + nomor resi J&T. */
export interface StageSource {
  status: string;
  awb_no?: string | null;
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
      // `diproses` (dan status tak dikenal): resi sudah terbit = paket jalan, belum = menunggu diatur.
      return order.awb_no ? "dikirim" : "perlu_dikirim";
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

/** Ringkasan pengiriman satu baris daftar: kurir + nomor resi (atau alasan resi kosong). */
export function shippingLine(
  order: StageSource & { shipping_method?: string | null }
): { courier: string; resi: string; awaiting: boolean } {
  const stage = orderStage(order);
  const awaiting = !order.awb_no && stage === "perlu_dikirim";
  return {
    courier: order.shipping_method || "Pengiriman",
    resi: order.awb_no || (awaiting ? "Resi belum dibuat" : "Tanpa resi"),
    awaiting,
  };
}
