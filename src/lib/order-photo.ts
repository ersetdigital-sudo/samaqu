/**
 * Foto asli katalog untuk baris pesanan.
 *
 * `order_items.product_image` sering kosong (kolomnya dikosongkan waktu pembersihan aset
 * Cloudinary) — jadi fotonya dicari di tabel `products` memakai kain + series + warna yang
 * tersimpan di baris pesanan, sama seperti pencocokan di alur Open Order.
 */

import type { Product } from "@/lib/katalog-data";
import { getProductThumbnail } from "@/lib/product-thumbnail";

export interface OrderItemPhotoKey {
  product_name?: string | null;
  kain?: string | null;
  series?: string | null;
  color?: string | null;
}

const norm = (value?: string | null) => (value || "").trim().toLowerCase();

/** Kode kain produk (`jenis_kain.name`, fallback kolom `kain`). */
const kainCode = (product: Product) => norm(product.jenis_kain?.name ?? product.kain);

/**
 * Foto katalog untuk satu baris pesanan; "" kalau tidak ada baris katalog yang cocok.
 * Prioritas: kain + series (+ warna) → kain saja → nama produk.
 */
export function catalogPhotoForItem(item: OrderItemPhotoKey, catalog: Product[]): string {
  if (catalog.length === 0) return "";

  const kain = norm(item.kain);
  const series = norm(item.series);
  const color = norm(item.color);
  const name = norm(item.product_name);

  const byKain = kain ? catalog.filter((product) => kainCode(product) === kain) : [];
  const byName = name
    ? catalog.filter((product) => {
        const productName = norm(product.name);
        return productName.length > 0 && (name.includes(productName) || productName.includes(name));
      })
    : [];
  const pool = byKain.length > 0 ? byKain : byName;
  if (pool.length === 0) return "";

  const bySeries = series ? pool.filter((product) => norm(product.series) === series) : [];
  const candidates = bySeries.length > 0 ? bySeries : pool;

  const exact = color ? candidates.find((product) => norm(product.name).endsWith(color)) : undefined;
  return getProductThumbnail(exact ?? candidates[0]) || "";
}

/** Salin tiap item pesanan, isi `product_image` dari katalog kalau kolomnya kosong. */
export function itemsWithCatalogPhotos<T extends OrderItemPhotoKey & { product_image?: string }>(
  items: T[],
  catalog: Product[]
): T[] {
  return items.map((item) => {
    if (item.product_image) return item;
    const photo = catalogPhotoForItem(item, catalog);
    return photo ? { ...item, product_image: photo } : item;
  });
}
