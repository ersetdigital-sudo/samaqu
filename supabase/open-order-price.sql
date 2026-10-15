-- Harga khusus Open Order — diatur admin dari menu "Open Order" (form produk, tab harga).
-- Dipakai wizard /open-order supaya kampanye Open Order bisa beda harga dengan katalog biasa
-- TANPA mengubah `products.price` (menu Produk). Semua kolom NULLABLE:
-- NULL = pakai harga katalog seperti biasa.
--
-- Dibaca di `src/lib/open-order-offering.ts` (`effectivePrice`) dan ditulis di
-- `src/components/admin/ProductForm.tsx` saat `priceTarget = "openOrder"`.
alter table public.products
  add column if not exists open_order_price integer,
  add column if not exists open_order_minimum_price integer,
  add column if not exists open_order_recommended_price integer,
  add column if not exists open_order_cyp_enabled boolean,
  add column if not exists open_order_cyp_microcopy text;
