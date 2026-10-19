/**
 * Katalog layanan J&T yang didukung SAMAQU — SATU sumber supaya harga yang ditagih ke pembeli
 * dan layanan resinya tidak pernah berbeda.
 *
 * Dua API J&T memakai penamaan berbeda:
 *  - **Tariff Check** memakai `productType` sebagai kode permintaan.
 *  - **Create Order** memakai `expresstype` = `productCode` dari respons Tariff Check
 *    (mis. "EZ"/"ECO"). Jangan memakai nomor legacy "1".
 *  - Layanan baru cukup ditambahkan lewat env `JNT_PRODUCT_TYPES` (dipisah koma);
 *    label & kode diambil dari respons J&T, jadi tidak perlu ubah kode.
 */

export type JntLayanan = {
  /** Kode layanan untuk Tariff Check (`productType`) dan label di UI. */
  code: string;
  label: string;
  note: string;
  /** Estimasi standar layanan J&T. Tariff Check API tidak mengirim ETA per rute. */
  estimate: string;
};

/**
 * Seed layanan yang diminta ke Tariff Check. `productCode` dari respons J&T
 * yang dipakai saat Create Order. Kalau J&T menambah layanan baru, tambahkan
 * kodenya lewat env `JNT_PRODUCT_TYPES` (dipisah koma) tanpa mengubah kode.
 */
export const JNT_LAYANAN: JntLayanan[] = [
  { code: "EZ", label: "J&T EZ (Reguler)", note: "Cepat, 2-4 hari", estimate: "2-4 hari" },
  { code: "ECO", label: "J&T ECO (Hemat)", note: "Lebih murah, 3-7 hari", estimate: "3-7 hari" },
];

export function layananByCode(code?: string | null): JntLayanan | null {
  const cari = String(code ?? "").trim().toUpperCase();
  return JNT_LAYANAN.find((layanan) => layanan.code === cari) || null;
}

export function labelLayanan(code?: string | null): string {
  const layanan = layananByCode(code);
  return layanan ? layanan.label : String(code ?? "").trim();
}

/**
 * Nilai `expresstype` yang dikirim ke J&T saat membuat resi.
 * J&T sekarang memakai productCode (mis. "EZ"/"ECO"), bukan nomor legacy "1".
 */
export function expressTypeUntuk(code?: string | null): string {
  return String(code ?? "").trim();
}

/**
 * Kode layanan J&T (EZ/ECO) dari teks yang tersimpan di `orders.shipping_method`.
 * Nilai lama bisa berupa "reguler", "J&T - EZ", atau "J&T - J&T ECO (Hemat)".
 */
export function jntServiceCodeFromShippingMethod(value?: string | null): string | null {
  const text = String(value ?? "").toUpperCase();
  if (text.includes("ECO")) return "ECO";
  if (text.includes("EZ")) return "EZ";
  return null;
}

/** Tag pendek untuk detail pesanan & label: "Service EZ" / "Service ECO". */
export function jntServiceTag(value?: string | null, fallback = "EZ"): string {
  return `Service ${jntServiceCodeFromShippingMethod(value) || fallback}`;
}
