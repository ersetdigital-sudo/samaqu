/**
 * Katalog layanan J&T yang didukung SAMAQU — SATU sumber supaya harga yang ditagih ke pembeli
 * dan layanan resinya tidak pernah berbeda.
 *
 * Dua API J&T memakai penamaan berbeda:
 *  - **Tariff Check** memakai `productType` = KODE layanan ("EZ", "ECO") → dipakai menjawab ongkir.
 *  - **Create Order** memakai `expresstype` → dokumen J&T hanya menyebut `"1"` = EZ (Regular);
 *    nilai untuk ECO belum ada di dokumen, jadi bisa ditimpa lewat env `JNT_ECO_EXPRESS_TYPE`
 *    tanpa mengubah kode. Selama nilainya belum pas, J&T akan menolak Create Order (tidak
 *    membuat resi) — jadi tidak ada resi yang terbit dengan layanan yang salah.
 */

export type JntLayanan = {
  /** Kode layanan untuk Tariff Check (`productType`) dan label di UI. */
  code: string;
  label: string;
  note: string;
  /** Estimasi standar layanan J&T. Tariff Check API tidak mengirim ETA per rute. */
  estimate: string;
  /** Nilai `expresstype` bawaan untuk Create Order (bisa ditimpa env). */
  defaultExpressType: string;
};

export const JNT_LAYANAN: JntLayanan[] = [
  { code: "EZ", label: "J&T EZ (Reguler)", note: "Cepat, 2-4 hari", estimate: "2-4 hari", defaultExpressType: "1" },
  { code: "ECO", label: "J&T ECO (Hemat)", note: "Lebih murah, 3-7 hari", estimate: "3-7 hari", defaultExpressType: "ECO" },
];

export function layananByCode(code?: string | null): JntLayanan | null {
  const cari = String(code ?? "").trim().toUpperCase();
  return JNT_LAYANAN.find((layanan) => layanan.code === cari) || null;
}

export function labelLayanan(code?: string | null): string {
  const layanan = layananByCode(code);
  return layanan ? layanan.label : String(code ?? "").trim();
}

/** Nilai `expresstype` yang dikirim ke J&T saat membuat resi. Env menang atas bawaan. */
export function expressTypeUntuk(code?: string | null): string {
  const layanan = layananByCode(code);
  if (!layanan) return "";
  if (layanan.code === "EZ") return process.env.JNT_EZ_EXPRESS_TYPE || layanan.defaultExpressType;
  if (layanan.code === "ECO") return process.env.JNT_ECO_EXPRESS_TYPE || layanan.defaultExpressType;
  return layanan.defaultExpressType;
}
