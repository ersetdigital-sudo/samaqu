/**
 * Kota & provinsi untuk menu Database Kota dan isian alamat di menu Transaksi.
 *
 * Semua daftarnya diambil dari dataset area J&T yang SUDAH ADA
 * (`src/lib/jnt/area-data.json` lewat `area-mapping.ts`) — tidak ada data baru dan tidak
 * ada tabel baru, sekaligus nama kota jadi seragam (bukan ketik bebas).
 *
 * Aturan penggabungan nama kota memakai `stripCityPrefix` milik area-mapping supaya
 * "Kota Bogor", "KAB. BOGOR", dan "Bogor" dihitung sebagai satu kota yang sama.
 */

import { JNT_AREAS, stripCityPrefix } from "@/lib/jnt/area-mapping";

/** Kota yang alamatnya belum terisi — sengaja ditampilkan supaya bisa dirapikan. */
export const KOTA_KOSONG = "Kota belum terisi";

/** Provinsi yang penulisannya baku (title case biasa tidak enak dibaca). */
const PROVINSI_KHUSUS: Record<string, string> = {
  "DKI JAKARTA": "DKI Jakarta",
  "DI YOGYAKARTA": "DI Yogyakarta",
  // Dataset area J&T menulis provinsi ini sebagai "DIY".
  DIY: "DI Yogyakarta",
};

const titleCase = (raw: string) => {
  const text = String(raw || "").trim();
  if (!text) return "";
  const upper = text.toUpperCase();
  if (PROVINSI_KHUSUS[upper]) return PROVINSI_KHUSUS[upper];
  return upper
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0) + word.slice(1).toLowerCase() : word))
    .join(" ");
};

/** "KOTA ADM. JAKARTA TIMUR" → "Jakarta Timur" (prefix administratif dibuang). */
export function prettifyCity(raw: string): string {
  return titleCase(stripCityPrefix(raw || ""));
}

/** "JAWA BARAT" → "Jawa Barat". */
export function prettifyProvince(raw: string): string {
  return titleCase(raw || "");
}

/** Kecamatan dari dataset J&T (tanpa prefix kota). */
export function prettifyDistrict(raw: string): string {
  return titleCase(stripCityPrefix(raw || ""));
}

/** Kunci pembanding kota: "Kota Bogor" = "KAB. BOGOR" = "Bogor". */
export function kotaKey(raw: string): string {
  return stripCityPrefix(raw || "");
}

/**
 * Kota dari kolom pesanan. Checkout & Open Order menyimpan `shipping_city`
 * dalam bentuk "<kecamatan>, <kota>", sedangkan alamat lama bisa cuma berisi kota saja.
 */
export function kotaFromShipping(shippingCity?: string | null, shippingKecamatan?: string | null): string {
  const parts = String(shippingCity || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const kecamatan = String(shippingKecamatan || "").trim();
  // Kalau kecamatan ada di depan, bagian terakhir adalah kotanya.
  if (kecamatan && kotaKey(parts[0]) === kotaKey(kecamatan)) return parts[parts.length - 1];
  return parts[parts.length - 1];
}

/* ── Provinsi per kota (dari dataset area J&T yang sama) ── */
const KOTA_KE_PROVINSI = new Map<string, string>();
for (const row of JNT_AREAS) {
  const key = kotaKey(row.localCity);
  if (key && !KOTA_KE_PROVINSI.has(key)) KOTA_KE_PROVINSI.set(key, row.localProv);
}

/** Provinsi sebuah kota; "" kalau kotanya tidak dikenal. */
export function provinceOfCity(city?: string | null): string {
  const key = kotaKey(city || "");
  return key ? prettifyProvince(KOTA_KE_PROVINSI.get(key) || "") : "";
}

/* ── Daftar pilihan bertahap: Provinsi → Kota/Kabupaten → Kecamatan ── */
const PROVINSI_KE_KOTA = new Map<string, Set<string>>();
const KOTA_KE_KECAMATAN = new Map<string, Set<string>>();

for (const row of JNT_AREAS) {
  const provinsi = prettifyProvince(row.localProv);
  const kota = prettifyCity(row.localCity);
  const kecamatan = prettifyDistrict(row.localDistrict);
  if (!provinsi || !kota) continue;

  if (!PROVINSI_KE_KOTA.has(provinsi)) PROVINSI_KE_KOTA.set(provinsi, new Set());
  PROVINSI_KE_KOTA.get(provinsi)!.add(kota);

  const kotaKeyValue = kotaKey(kota);
  if (kecamatan) {
    if (!KOTA_KE_KECAMATAN.has(kotaKeyValue)) KOTA_KE_KECAMATAN.set(kotaKeyValue, new Set());
    KOTA_KE_KECAMATAN.get(kotaKeyValue)!.add(kecamatan);
  }
}

const urut = (values: Iterable<string>) => [...values].sort((a, b) => a.localeCompare(b, "id"));

export const WILAYAH_PROVINSI = urut(PROVINSI_KE_KOTA.keys());

export function citiesOfProvince(province: string): string[] {
  return urut(PROVINSI_KE_KOTA.get(String(province || "").trim()) || []);
}

export function districtsOfCity(city: string): string[] {
  return urut(KOTA_KE_KECAMATAN.get(kotaKey(city)) || []);
}
