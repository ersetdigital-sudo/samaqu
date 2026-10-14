/**
 * Aturan urutan tampil untuk dashboard ops — SATU sumber untuk semua layar ops
 * (Daftar Produk & Laporan Stok) supaya konsisten dan pasti (bukan ikut urutan DB).
 *
 * Urutan:
 *   1. Kategori — mengikuti urutan kategori di website.
 *   2. Jenis Kain — A→Z.
 *   3. Warna — A→Z (untuk produk Thobe, "warna" diambil dari nama produk,
 *      karena variannya cuma menyimpan warna `default`).
 *   4. Series — urut tetap: Jiharkah, Imron, Bayati, Nahawand, Karim, Imalah.
 *      Series yang tidak dikenal (baru) otomatis jatuh di urutan terakhir.
 *
 * Dua daftar di bawah sengaja ditulis SEKALI di sini — jangan disebar ke banyak
 * query. Tidak butuh kolom baru di database.
 */

export const CATEGORY_ORDER = ["Thobe", "Kandora", "Koko", "Vest", "Kabak", "Cover & Hanger"];
export const SERIES_ORDER = ["Jiharkah", "Imron", "Bayati", "Nahawand", "Karim", "Imalah"];

const CATEGORY_RANK = new Map(CATEGORY_ORDER.map((c, i) => [c.toLowerCase(), i]));
const SERIES_RANK = new Map(SERIES_ORDER.map((s, i) => [s.toLowerCase(), i]));

export function categoryRank(category?: string | null): number {
  const rank = CATEGORY_RANK.get(String(category || "").trim().toLowerCase());
  return rank === undefined ? CATEGORY_ORDER.length : rank;
}

export function seriesRank(series?: string | null): number {
  const rank = SERIES_RANK.get(String(series || "").trim().toLowerCase());
  return rank === undefined ? SERIES_ORDER.length : rank;
}

/** Warna dari nama produk: "Thobe Superblack" + kategori "Thobe" → "Superblack". */
export function warnaFromName(name?: string | null, category?: string | null): string {
  const n = String(name || "").trim();
  const c = String(category || "").trim();
  if (c && n.toLowerCase().startsWith(c.toLowerCase() + " ")) return n.slice(c.length + 1).trim();
  return n;
}

export type OpsSortKey = {
  category: string;
  jenisKain: string;
  warna: string;
  seriesRank: number;
  name: string;
};

const str = (v: unknown) => String(v ?? "").trim();
const cmp = (a: string, b: string) => a.localeCompare(b, "id", { sensitivity: "base" });

export function compareOpsRows(a: OpsSortKey, b: OpsSortKey): number {
  return (
    categoryRank(a.category) - categoryRank(b.category) ||
    cmp(a.jenisKain, b.jenisKain) ||
    cmp(a.warna, b.warna) ||
    a.seriesRank - b.seriesRank ||
    cmp(a.name, b.name)
  );
}

/** Kunci urut untuk baris Daftar Produk (`/api/ops/products`). */
export function productSortKey(p: {
  category?: string | null;
  name?: string | null;
  series?: string | null;
  jenis_kain?: { name?: string | null } | null;
}): OpsSortKey {
  return {
    category: str(p.category),
    jenisKain: str(p.jenis_kain?.name),
    warna: warnaFromName(p.name, p.category),
    seriesRank: seriesRank(p.series),
    name: str(p.name),
  };
}

/** Kunci urut untuk baris Laporan Stok (`/api/ops/product-variants`). */
export function variantSortKey(v: {
  category?: string | null;
  product_name?: string | null;
  series_name?: string | null;
  color?: string | null;
  jenis_kain_name?: string | null;
}): OpsSortKey {
  const color = str(v.color);
  const realColor = color && color.toLowerCase() !== "default" ? color : "";
  return {
    category: str(v.category),
    jenisKain: str(v.jenis_kain_name),
    // Thobe (dan produk sejenis) menyimpan warna `default`; warnanya ada di nama produk.
    warna: realColor || warnaFromName(v.product_name, v.category),
    seriesRank: seriesRank(v.series_name),
    name: str(v.product_name),
  };
}
