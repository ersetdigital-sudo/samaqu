/**
 * Helper tampilan alur Open Order (/open-order): harga, foto dari katalog, dan kartu produk.
 *
 * Penawaran (kain/warna/series/harga) diturunkan dari baris katalog lewat
 * `open-order-offering.ts`; modul ini yang mencocokkan baris katalog ke tiap kombinasi
 * produk + warna (+ series) untuk foto dan kartu.
 */

import type { Product } from "@/lib/katalog-data";
import { getProductThumbnail } from "@/lib/product-thumbnail";
import type { OpenOrderProduct } from "@/lib/open-order-offering";

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

/**
 * Baris katalog (tabel `products`) untuk produk + warna + series yang sedang dipilih.
 * Satu baris katalog = satu kombinasi warna + series, jadi foto tiap series memang beda.
 */
export function catalogProductFor(
  product: OpenOrderProduct,
  color: string,
  seriesName: string,
  catalog: Product[]
): Product | undefined {
  const colorLower = color.toLowerCase();
  const matches = catalog.filter(
    (item) =>
      (item.jenis_kain?.name ?? item.kain) === product.kain && item.name.toLowerCase().endsWith(colorLower)
  );
  return matches.find((item) => item.series === seriesName) ?? matches[0];
}

/**
 * Foto galeri (tanpa video) untuk kombinasi produk + warna + series — sumbernya baris katalog
 * yang sama dengan yang dipakai halaman detail katalog, supaya fotonya sama persis.
 */
export function openOrderGallery(
  product: OpenOrderProduct,
  color: string,
  seriesName: string,
  catalog: Product[]
): string[] {
  const match = catalogProductFor(product, color, seriesName, catalog);
  const photos = (match?.media ?? []).filter((item) => item.type === "image" && item.src).map((item) => item.src);
  if (photos.length > 0) return photos;
  const fallback = openOrderImage(product, color, catalog);
  return fallback ? [fallback] : [];
}

export interface OpenOrderVariant {
  key: string;
  product: OpenOrderProduct;
  color: string;
  image: string;
}

/** Satu kartu per produk × warna ready stock — dipakai grid di langkah pertama. */
export function openOrderVariants(products: OpenOrderProduct[], catalog: Product[]): OpenOrderVariant[] {
  return products.flatMap((product) =>
    product.colors.map((color) => ({
      key: `${product.id}-${color.toLowerCase().replace(/\s+/g, "-")}`,
      product,
      color,
      image: openOrderImage(product, color, catalog),
    }))
  );
}
