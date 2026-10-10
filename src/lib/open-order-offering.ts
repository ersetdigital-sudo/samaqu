/**
 * Penawaran Open Order (/open-order) diturunkan dari katalog (tabel `products`), bukan
 * daftar hardcode: kain, warna, series, dan harga minimum per series semuanya dibaca dari
 * baris katalog. Jadi begitu harga/warna di katalog berubah, wizard ikut berubah tanpa
 * mengedit kode.
 *
 * Satu baris `products` = satu kombinasi kain × warna × series:
 * - kain   → relasi `jenis_kain` (mis. "B-01"),
 * - warna  → bagian nama produk setelah prefix kategori (mis. "Thobe Navy" → "Navy"),
 * - series → kolom `series`,
 * - harga  → `minimum_price` (batas Create Your Price), fallback ke `price`.
 *
 * Struktur barisnya sama dengan yang dipakai halaman detail katalog (`getAvailableSeries`
 * di src/lib/db.ts), jadi wizard dan katalog membaca sumber yang sama.
 */

export interface OpenOrderSeries {
  name: string;
  price: number;
}

export interface OpenOrderProduct {
  /** Kode kain (mis. "B-01") — dipakai sebagai id produk di keranjang & pesanan. */
  id: string;
  name: string;
  kain: string;
  colors: string[];
  /** Berat kirim per pcs (gram) untuk hitungan ongkir. */
  weight: number;
  series: OpenOrderSeries[];
}

/**
 * Baris katalog yang dipakai menurunkan penawaran — subset struktural dari `Product`
 * supaya modul ini bisa dipakai di client (katalog dari getProducts) maupun di server
 * (route /api/open-order) tanpa ikut membawa tipe/klien Supabase.
 */
export interface OpenOrderCatalogRow {
  id: string;
  name: string;
  category?: string | null;
  kain?: string | null;
  series?: string | null;
  weight?: number | null;
  price?: number | null;
  minimum_price?: number | null;
  jenis_kain?: { name?: string | null } | null;
}

/** Kategori katalog yang dijual lewat Open Order. */
const OPEN_ORDER_CATEGORY = "Thobe";

/** Berat kirim default kalau baris katalog tidak punya `weight` (gram). */
export const DEFAULT_OPEN_ORDER_WEIGHT = 1200;

function kainOf(row: OpenOrderCatalogRow): string {
  return (row.jenis_kain?.name ?? row.kain ?? "").trim();
}

/** Warna = nama produk tanpa prefix kategori ("Thobe Navy" → "Navy"). */
function colorOf(row: OpenOrderCatalogRow): string {
  const name = row.name.trim();
  const prefix = `${OPEN_ORDER_CATEGORY} `;
  return name.toLowerCase().startsWith(prefix.toLowerCase()) ? name.slice(prefix.length).trim() : name;
}

/**
 * Susun penawaran Open Order dari baris katalog: satu produk per kode kain, berisi daftar
 * warna ready stock dan series + harga minimumnya.
 */
export function buildOpenOrderProducts(catalog: OpenOrderCatalogRow[]): OpenOrderProduct[] {
  const groups = new Map<string, { colors: Set<string>; series: Map<string, number>; weight: number }>();

  for (const row of catalog) {
    if ((row.category ?? "") !== OPEN_ORDER_CATEGORY) continue;

    const kain = kainOf(row);
    const series = (row.series ?? "").trim();
    const price = row.minimum_price ?? row.price ?? 0;
    if (!kain || !series || !price) continue;

    const group = groups.get(kain) ?? { colors: new Set<string>(), series: new Map<string, number>(), weight: 0 };
    groups.set(kain, group);

    group.colors.add(colorOf(row));
    if (row.weight) group.weight = Math.max(group.weight, row.weight);

    // Harga minimum seragam per series; kalau ada baris yang berbeda, ambil yang terendah.
    const current = group.series.get(series);
    group.series.set(series, current === undefined ? price : Math.min(current, price));
  }

  return [...groups].map(([kain, group]) => ({
    id: kain,
    name: `${OPEN_ORDER_CATEGORY} Kain ${kain}`,
    kain,
    colors: [...group.colors],
    weight: group.weight || DEFAULT_OPEN_ORDER_WEIGHT,
    series: [...group.series]
      .map(([name, price]) => ({ name, price }))
      .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)),
  }));
}

/** Cari produk penawaran berdasarkan id (kode kain). */
export function findOpenOrderProduct(products: OpenOrderProduct[], id: string): OpenOrderProduct | undefined {
  return products.find((product) => product.id === id);
}

/** Harga minimum terendah dari seluruh penawaran — untuk catatan harga di langkah 1. */
export function lowestOpenOrderPrice(products: OpenOrderProduct[]): number | null {
  const prices = products.flatMap((product) => product.series.map((series) => series.price));
  return prices.length ? Math.min(...prices) : null;
}
