/**
 * Helper varian & stok — sama persis dengan app Base44 (src/lib/variants.js),
 * supaya aturan stok di dashboard internal identik: 0 = habis, <=5 = menipis.
 */
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const emptyStock = () => Object.fromEntries(SIZES.map((s) => [s, 0]));

export function normalizeStock(stock) {
  const base = emptyStock();
  if (!stock || typeof stock !== "object") return base;
  for (const s of SIZES) {
    const val = Number(stock[s]);
    base[s] = Number.isFinite(val) ? Math.max(0, Math.round(val)) : 0;
  }
  return base;
}

export function sumStock(stock) {
  return Object.values(normalizeStock(stock)).reduce((a, b) => a + b, 0);
}

export function stockStatus(total) {
  if (total === 0) return "habis";
  if (total <= 5) return "menipis";
  return "aman";
}

export function totalStockOfVariants(variants, productId) {
  return (variants || [])
    .filter((v) => v.product_id === productId)
    .reduce((sum, v) => sum + sumStock(v.stock), 0);
}
