/**
 * Konfigurasi Open Order Samaqu — Create Your Price.
 *
 * Sumber harga: form Open Order Samaqu yang sebelumnya dipakai lewat Google Form,
 * sekarang dipindahkan ke halaman /open-order.
 *
 * Alur pesanan di halaman /open-order (komponen di src/components/open-order/) dan
 * validasi server-side (/api/open-order) semuanya membaca dari file ini — ubah daftar
 * produk/series/harga di sini saja.
 */

export interface OpenOrderSeries {
  name: string;
  price: number;
}

export interface OpenOrderProduct {
  id: string;
  name: string;
  /** Kode kain untuk kolom `kain` di order_items (juga dipakai mencocokkan produk katalog). */
  kain: string;
  colors: string[];
  /** Berat kirim per pcs (gram) — dipakai menghitung ongkir J&T di form. */
  weight: number;
  series: OpenOrderSeries[];
}

export const OPEN_ORDER_PRODUCTS: OpenOrderProduct[] = [
  {
    id: "thobe-b01",
    name: "Thobe Kain B-01",
    kain: "B-01",
    colors: ["Superblack", "Navy"],
    weight: 1200,
    series: [
      { name: "Jiharkah", price: 329000 },
      { name: "Nahawand", price: 329000 },
      { name: "Imron", price: 344000 },
      { name: "Bayati", price: 344000 },
      { name: "Karim", price: 344000 },
      { name: "Imalah", price: 344000 },
    ],
  },
  {
    id: "thobe-a02",
    name: "Thobe Kain A-02",
    kain: "A-02",
    colors: ["Charcoal Grey", "Soft Grey"],
    weight: 1200,
    series: [
      { name: "Jiharkah", price: 324000 },
      { name: "Nahawand", price: 324000 },
      { name: "Imron", price: 339000 },
      { name: "Bayati", price: 339000 },
      { name: "Karim", price: 339000 },
      { name: "Imalah", price: 339000 },
    ],
  },
];

/** Tambahan Extra Cover & Hanger Samaqu (opsional, per pesanan). */
export const OPEN_ORDER_ADDON = {
  id: "addon-cover-hanger",
  name: "Extra Cover & Hanger Samaqu",
  price: 35000,
  /** Berat kirim tambahan (gram) untuk hitungan ongkir J&T. */
  weight: 300,
};

export function findOpenOrderProduct(id: string): OpenOrderProduct | undefined {
  return OPEN_ORDER_PRODUCTS.find((product) => product.id === id);
}

/** Harga per pcs untuk kombinasi produk + series. `null` kalau kombinasinya tidak valid. */
export function openOrderItemPrice(productId: string, seriesName: string): number | null {
  const series = findOpenOrderProduct(productId)?.series.find((s) => s.name === seriesName);
  return series ? series.price : null;
}

/** Ukuran yang bisa dipilih customer — tersimpan di kolom `size` (order_items). */
export const OPEN_ORDER_SIZES = ["S", "M", "L", "XL", "XXL"];

/** Harga series terendah = batas "Minimum" di Create Your Price (juga harga awal produk). */
export function openOrderMinPrice(productId: string): number {
  const prices = findOpenOrderProduct(productId)?.series.map((s) => s.price) ?? [];
  return prices.length ? Math.min(...prices) : 0;
}
