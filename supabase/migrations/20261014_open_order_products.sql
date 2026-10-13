-- Open Order: penanda produk yang ikut Open Order + penanda stok pesanan.
--
-- 1. `products.open_order_enabled` — baris produk ini tampil di halaman /open-order.
--    Bisa diatur dari form produk ("Tampilkan produk ini di menu Open Order") maupun dari
--    daftar produk di menu admin "Open Order". Default TRUE: produk baru dan produk lama
--    otomatis ikut Open Order; admin tinggal menonaktifkan yang tidak mau tampil.
--
-- 2. `orders.stock_reserved` — penanda "pesanan ini pernah memotong stok". Dipakai jalur
--    pembatalan (src/lib/cancel-order.ts) dan penghapusan pesanan dari admin supaya stok
--    hanya dikembalikan untuk pesanan yang memang memotong stok. Pesanan Open Order (`CYO-`)
--    sebelum perubahan ini TIDAK pernah memotong stok, jadi backfill hanya menandai pesanan
--    checkout website (`SMQ-`) — kalau tidak, membatalkan CYO lama malah menambah stok hantu.
--
-- Dijalankan manual di SQL Editor Supabase (atau Management API), satu statement per query.

alter table products add column if not exists open_order_enabled boolean not null default true;

alter table orders add column if not exists stock_reserved boolean not null default false;

update orders set stock_reserved = true where order_number like 'SMQ-%';
