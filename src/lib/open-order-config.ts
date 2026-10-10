/**
 * Pengaturan Open Order Samaqu yang TIDAK berasal dari katalog.
 *
 * Daftar produk — kain, warna, series, dan harga — tidak lagi ditulis di sini: semuanya
 * diturunkan dari tabel `products` lewat `buildOpenOrderProducts()` di
 * `src/lib/open-order-offering.ts`, supaya perubahan harga/warna di katalog langsung
 * terpakai di wizard.
 *
 * Yang tetap statis di file ini hanya hal yang memang bukan data katalog: periode Open
 * Order, add-on Cover & Hanger, dan daftar ukuran.
 */

/** Periode Open Order yang sedang dibuka — ditampilkan di bawah judul /open-order. */
export const OPEN_ORDER_PERIOD = "8-15 Agustus 2026";

/** Tambahan Extra Cover & Hanger Samaqu (opsional, per pesanan). */
export const OPEN_ORDER_ADDON = {
  id: "addon-cover-hanger",
  name: "Extra Cover & Hanger Samaqu",
  price: 35000,
  /** Berat kirim tambahan (gram) untuk hitungan ongkir J&T. */
  weight: 300,
};

/** Ukuran yang bisa dipilih customer — tersimpan di kolom `size` (order_items). */
export const OPEN_ORDER_SIZES = ["S", "M", "L", "XL", "XXL"];
