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

/**
 * Format berat (gram) untuk tampilan: "2,4 kg" kalau ≥ 1 kg, selain itu "800 g".
 * Kosong/0 → "-". Dipakai di detail pesanan & label.
 */
export function formatWeight(grams?: number | null): string {
  const g = Number(grams);
  if (!Number.isFinite(g) || g <= 0) return "-";
  if (g >= 1000) return `${(g / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`;
  return `${g.toLocaleString("id-ID")} g`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Berat per SIZE (kolom `product_variants.weight`, nullable).

   Urutan prioritas berat satu item:
     1. berat varian (`product_variants.weight`) — per produk + warna + ukuran,
     2. berat produk (`products.weight`) — perilaku lama,
     3. kalau dua-duanya kosong → dihitung `missingQty` (pemanggil menentukan
        fallback default-nya sendiri, sama seperti `sumWeightGrams`).
   Semua satuan GRAM. Tidak ada pembulatan: gram bulat, apa adanya.
   ───────────────────────────────────────────────────────────────────────────── */

/** Peta berat varian: kunci `productId|color|size` → gram. */
export type VariantWeightMap = Record<string, number>;

/** Kunci berat varian. Nilai kosong jadi string kosong supaya kuncinya tetap stabil. */
export function variantWeightKey(
  productId?: string | null,
  color?: string | null,
  size?: string | null
): string {
  return `${String(productId ?? "")}|${String(color ?? "")}|${String(size ?? "")}`;
}

export interface SizeWeightLine {
  /** id baris `products` (slug). */
  productId?: string | null;
  /** warna varian (`product_variants.color`); "default" untuk produk Thobe. */
  color?: string | null;
  /** ukuran (`product_variants.size`, mis. "M"). */
  size?: string | null;
  /** kuantitas; default 1 kalau kosong. */
  quantity?: number | null;
}

/**
 * Σ berat kirim (gram) per baris item. Prioritas satu item:
 *   1. berat varian milik baris itu sendiri (`product_variants.weight`),
 *   2. berat produk (`products.weight`),
 *   3. kalau dua-duanya kosong → dicatat `missingQty` (pemanggil menentukan fallback default).
 *
 * Catatan: berat TIDAK pernah menumpang baris induk. Stok bisa dibagi antar-series
 * (`base_product_id`), tapi berat tiap series berbeda (potongan & kerah beda), jadi
 * series turunan tetap memakai beratnya sendiri.
 */
export function sumWeightGramsBySize(
  lines: SizeWeightLine[],
  productWeights: WeightMap,
  variantWeights: VariantWeightMap
): WeightResult {
  let grams = 0;
  let missingQty = 0;
  let countedQty = 0;
  for (const line of lines || []) {
    const qty = Number(line?.quantity) || 1;
    countedQty += qty;
    const vw = Number(variantWeights?.[variantWeightKey(line?.productId, line?.color, line?.size)]);
    const pw = Number(productWeights?.[String(line?.productId ?? "")]);
    const w = Number.isFinite(vw) && vw > 0 ? vw : Number.isFinite(pw) && pw > 0 ? pw : 0;
    if (w > 0) grams += w * qty;
    else missingQty += qty;
  }
  return { grams, missingQty, countedQty };
}

/** Peta berat produk dari baris `products` (kolom `id`,`weight`). */
export function productWeightMapFromRows(
  rows?: { id?: string | null; weight?: number | null }[] | null
): WeightMap {
  const map: WeightMap = {};
  for (const row of rows || []) {
    const w = Number(row?.weight);
    if (row?.id && Number.isFinite(w) && w > 0) map[String(row.id)] = w;
  }
  return map;
}

/** Peta berat varian dari baris `product_variants` (kolom `product_id`,`color`,`size`,`weight`). */
export function variantWeightMapFromRows(
  rows?: { product_id?: string | null; color?: string | null; size?: string | null; weight?: number | null }[] | null
): VariantWeightMap {
  const map: VariantWeightMap = {};
  for (const row of rows || []) {
    const w = Number(row?.weight);
    if (Number.isFinite(w) && w > 0) {
      map[variantWeightKey(row?.product_id, row?.color, row?.size)] = w;
    }
  }
  return map;
}

