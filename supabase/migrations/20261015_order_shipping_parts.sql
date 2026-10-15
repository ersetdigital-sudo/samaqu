-- Alamat pengiriman yang lebih rinci di tabel `orders` (dipakai menu Transaksi & Database Kota).
--
-- Kenapa perlu: `orders` cuma menyimpan `shipping_address` (jalan), `shipping_city`
-- ("<kecamatan>, <kota>") dan `shipping_postal_code`. Provinsi tidak disimpan di mana pun,
-- padahal Database Kota butuh provinsi sebagai data terpisah untuk filter & ringkasan.
--
-- Kolomnya sengaja mengikuti penamaan di `saved_addresses` (province, kecamatan) supaya
-- strukturnya sama persis — TIDAK ada tabel alamat baru.
--
-- `shipping_city` TIDAK diubah formatnya ("<kecamatan>, <kota>") karena dipakai saat admin
-- membuat resi J&T ("Atur Pesanan"). Kolom baru ini murni tambahan yang nullable.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_province TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_kecamatan TEXT;
