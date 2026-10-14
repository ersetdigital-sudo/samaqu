/**
 * Satu sumber perhitungan berat kirim SAMAQU.
 *
 * Aturan: berat total (GRAM) = Σ (berat produk untuk id tsb × kuantitas). Berat produk
 * diambil dari peta `weights` (id produk → gram, sumbernya `products.weight` di database).
 *
 * Satuan SELALU gram di dalam sini; konversi ke kilogram hanya dilakukan di tepi
 * (payload J&T & label pengiriman memakai kg).
 *
 * Kalau berat sebuah produk belum ada di database, item itu TIDAK dihitung di `grams`,
 * melainkan dicatat di `missingQty` supaya pemanggil bisa memutuskan fallback-nya sendiri
 * (bukan ditutupi nilai tetap di dalam fungsi ini).
 */

export type WeightMap = Record<string, number>;

export interface WeightLine {
  /** id produk (slug baris `products`, mis. "thobe-navy-karim"). */
  productId?: string | null;
  /** kuantitas; default 1 kalau kosong. */
  quantity?: number | null;
}

export interface WeightResult {
  /** Total berat item yang beratnya diketahui (gram). */
  grams: number;
  /** Jumlah unit yang beratnya TIDAK diketahui (perlu fallback oleh pemanggil). */
  missingQty: number;
  /** Jumlah unit yang ikut dihitung. */
  countedQty: number;
}

/** Σ berat produk (gram) × kuantitas. */
export function sumWeightGrams(lines: WeightLine[], weights: WeightMap): WeightResult {
  let grams = 0;
  let missingQty = 0;
  let countedQty = 0;
  for (const line of lines || []) {
    const qty = Number(line?.quantity) || 1;
    countedQty += qty;
    const w = Number(weights?.[String(line?.productId ?? "")]);
    if (Number.isFinite(w) && w > 0) grams += w * qty;
    else missingQty += qty;
  }
  return { grams, missingQty, countedQty };
}
