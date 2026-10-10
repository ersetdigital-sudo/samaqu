/**
 * Helper tampilan alur Open Order (/open-order): harga, foto dari katalog, dan kartu produk.
 *
 * Produk/harga Open Order tetap datang dari `open-order-config.ts` (bukan tabel `products`);
 * katalog hanya dipakai untuk foto produk yang cocok (kode kain + warna ready stock).
 */

import type { Product } from "@/lib/katalog-data";
import { getProductThumbnail } from "@/lib/product-thumbnail";
import { OPEN_ORDER_PRODUCTS, type OpenOrderProduct } from "@/lib/open-order-config";

/** Format harga seragam untuk seluruh alur: "Rp329.000". */
export const money = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

/** Series dengan harga sama digabung supaya daftar harga tetap ringkas. */
export function priceTiers(product: OpenOrderProduct) {
  return product.series.reduce<{ price: number; names: string[] }[]>((tiers, series) => {
    const last = tiers[tiers.length - 1];
    if (last && last.price === series.price) last.names.push(series.name);
    else tiers.push({ price: series.price, names: [series.name] });
    return tiers;
  }, []);
}

/** Rentang harga produk, mis. "Rp329.000 - Rp344.000". */
export function priceRange(product: OpenOrderProduct): string {
  const prices = product.series.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} - ${money(max)}`;
}

/**
 * Produk katalog (tabel `products`) yang jadi acuan foto: kode kain (jenis_kain)
 * + warna ready stock ada di nama produk ("Thobe <warna>").
 */
export function catalogMatches(product: OpenOrderProduct, catalog: Product[]): Product[] {
  return catalog.filter((item) => {
    if ((item.jenis_kain?.name ?? item.kain) !== product.kain) return false;
    const name = item.name.toLowerCase();
    return product.colors.some((color) => name.endsWith(color.toLowerCase()));
  });
}

/** Foto untuk kombinasi produk + warna; fallback ke foto produk pertama yang cocok. */
export function openOrderImage(product: OpenOrderProduct, color: string, catalog: Product[]): string {
  const matches = catalogMatches(product, catalog);
  const exact = matches.find((item) => item.name.toLowerCase().endsWith(color.toLowerCase()));
  const primary = exact ?? matches[0];
  return primary ? getProductThumbnail(primary) : "";
}

export interface OpenOrderVariant {
  key: string;
  product: OpenOrderProduct;
  color: string;
  image: string;
}

/** Satu kartu per produk × warna ready stock — dipakai grid di langkah pertama. */
export function openOrderVariants(catalog: Product[]): OpenOrderVariant[] {
  return OPEN_ORDER_PRODUCTS.flatMap((product) =>
    product.colors.map((color) => ({
      key: `${product.id}-${color.toLowerCase().replace(/\s+/g, "-")}`,
      product,
      color,
      image: openOrderImage(product, color, catalog),
    }))
  );
}
