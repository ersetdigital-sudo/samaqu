/**
 * Satu sumber peringkat "Produk Terlaris" untuk dashboard ADMIN dan OPS.
 *
 * Aturan (sama untuk kedua kartu, jadi angkanya tidak bisa berbeda):
 *  - dikelompokkan per BARIS PRODUK LENGKAP: nama produk + jenis kain + series
 *    (contoh "Thobe Superblack B-01 Jiharkah" ≠ "Thobe Superblack C-01 Jiharkah");
 *  - penjualan lewat series turunan dihitung atas nama series itu sendiri;
 *  - hanya pesanan SAH: dibayar (`diproses`), dikirim, selesai — batal / belum bayar
 *    (`pending`) / auto-cancel tidak dihitung, dan produk Free Gift dilewati;
 *  - urutan: unit terbanyak; kalau sama, ikut urutan produk yang sudah ada
 *    (urutan array `products` yang dipakai layar);
 *  - omzet per baris dihitung dari HARGA YANG TERCATAT DI ITEM PESANAN saat transaksi
 *    (`order_items.price`), bukan harga produk sekarang, dan hanya dari baris itu.
 */

/** Status pesanan yang dianggap penjualan sah. */
export const SALE_ORDER_STATUS = ["diproses", "dikirim", "selesai"] as const;

export function isSaleOrder(status?: string | null): boolean {
  const s = String(status || "").toLowerCase();
  if (!s) return false;
  if (s.includes("batal") || s.includes("cancel")) return false; // dibatalkan / auto-cancel
  return (SALE_ORDER_STATUS as readonly string[]).includes(s);
}

export interface TopProductOrder {
  id?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface TopProductItem {
  order_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  kain?: string | null;
  series?: string | null;
  quantity?: number | null;
  price?: number | null;
  customer_price?: number | null;
}

export interface TopProductCatalogRow {
  id?: string | null;
  product_type?: string | null;
}

export interface TopProductRow {
  /** Nama produk (baris atas kartu). */
  name: string;
  /** Jenis kain, mis. "B-01" (kosong kalau belum diisi di item pesanan). */
  kain: string;
  /** Series, mis. "Imalah" (kosong untuk produk tanpa series). */
  series: string;
  /** "B-01 · Imalah" — baris bawah kartu (kosong kalau kain & series kosong). */
  sub: string;
  /** Total unit terjual pada baris produk ini. */
  units: number;
  /** Omzet baris ini (Rp) dari harga tercatat di item pesanan. */
  revenue: number;
}

/**
 * Peringkat produk terlaris. `from`/`to` (YYYY-MM-DD, opsional) membatasi periode
 * berdasarkan `orders.created_at`; kosong = semua pesanan yang diberikan.
 */
export function rankTopProducts(input: {
  orders: TopProductOrder[];
  items: TopProductItem[];
  products?: TopProductCatalogRow[];
  from?: string | null;
  to?: string | null;
  limit?: number;
}): TopProductRow[] {
  const { orders, items, products = [], from = null, to = null, limit = 5 } = input;

  const statusById = new Map<string, string>();
  const inPeriod = new Set<string>();
  for (const o of orders) {
    if (!o?.id) continue;
    const id = String(o.id);
    statusById.set(id, String(o.status || ""));
    const day = String(o.created_at || "").slice(0, 10);
    if (from && day && day < from) continue;
    if (to && day && day > to) continue;
    inPeriod.add(id);
  }

  const freeGift = new Set(
    products.filter((p) => p.product_type === "free_gift").map((p) => String(p.id))
  );
  const productOrder = new Map(products.map((p, i) => [String(p.id), i]));

  type Acc = TopProductRow & { productId: string; order: number };
  const agg = new Map<string, Acc>();

  for (const it of items) {
    const orderId = String(it.order_id || "");
    if (!inPeriod.has(orderId)) continue;
    if (!isSaleOrder(statusById.get(orderId))) continue;

    const productId = String(it.product_id || "");
    if (productId && freeGift.has(productId)) continue;

    const name = String(it.product_name || "").trim() || "(tanpa nama)";
    const kain = String(it.kain || "").trim();
    const series = String(it.series || "").trim();
    const key = `${name}||${kain.toLowerCase()}||${series.toLowerCase()}`;

    const qty = Number(it.quantity) || 0;
    const price = Number(it.price) > 0 ? Number(it.price) : Number(it.customer_price) || 0;

    const cur = agg.get(key);
    if (cur) {
      cur.units += qty;
      cur.revenue += price * qty;
      if (!cur.productId && productId) cur.productId = productId;
    } else {
      agg.set(key, {
        name,
        kain,
        series,
        sub: [kain, series].filter(Boolean).join(" · "),
        units: qty,
        revenue: price * qty,
        productId,
        order: productOrder.has(productId) ? (productOrder.get(productId) as number) : Number.MAX_SAFE_INTEGER,
      });
    }
  }

  return Array.from(agg.values())
    .sort((a, b) => b.units - a.units || a.order - b.order || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ name, kain, series, sub, units, revenue }) => ({ name, kain, series, sub, units, revenue }));
}
