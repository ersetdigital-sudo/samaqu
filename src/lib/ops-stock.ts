/**
 * Resolusi "stok bersama ala series" untuk dashboard internal.
 *
 * Baris `product_variants` yang punya `base_product_id` TIDAK memegang stoknya
 * sendiri — angka stoknya hidup di produk basisnya. Satu resolver dipakai
 * bersama oleh /api/ops/products, /api/ops/product-variants, dan
 * /api/ops/dashboard supaya semua layar menampilkan angka yang sama
 * (produk series yang menumpang tidak lagi terlihat "habis").
 */

export const OPS_STOCK_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export type StockRow = {
  product_id: string;
  color?: string | null;
  size?: string | null;
  stock?: number | null;
  base_product_id?: string | null;
};

export type StockResolution = {
  /** product_id turunan → product_id basis */
  baseLink: Record<string, string>;
  /** Total stok milik sendiri per produk (akumulasi baris tanpa `base_product_id`). */
  ownTotal: Record<string, number>;
  /** Stok efektif per produk: produk turunan memakai total stok basisnya. */
  effectiveTotal: Record<string, number>;
  /** Stok milik sendiri per produk per ukuran — untuk tampilan per ukuran. */
  ownBySize: Record<string, Record<string, number>>;
};

export function resolveStock(rows: StockRow[]): StockResolution {
  const baseLink: Record<string, string> = {};
  const ownTotal: Record<string, number> = {};
  const ownBySize: Record<string, Record<string, number>> = {};

  for (const r of rows || []) {
    const productId = String(r?.product_id || "");
    if (!productId) continue;

    if (r.base_product_id) {
      baseLink[productId] = String(r.base_product_id);
      continue;
    }

    const value = Number(r.stock) || 0;
    ownTotal[productId] = (ownTotal[productId] || 0) + value;

    const size = String(r.size || "").toUpperCase();
    if (size) {
      const bySize = (ownBySize[productId] ||= {});
      bySize[size] = (bySize[size] || 0) + value;
    }
  }

  const effectiveTotal: Record<string, number> = {};
  const ids = new Set([...Object.keys(ownTotal), ...Object.keys(baseLink)]);
  for (const id of ids) {
    const base = baseLink[id];
    effectiveTotal[id] = base ? ownTotal[base] || 0 : ownTotal[id] || 0;
  }

  return { baseLink, ownTotal, effectiveTotal, ownBySize };
}

/** Peta stok per ukuran milik sendiri (kosong kalau tidak ada baris). */
export function ownSizeMap(res: StockResolution, productId: string): Record<string, number> {
  return { ...(res.ownBySize[productId] || {}) };
}
