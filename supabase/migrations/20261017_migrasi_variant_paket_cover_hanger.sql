-- Migrasi sekali jalan (idempotent) untuk varian kategori "Cover & Hanger" yang masih
-- berstruktur lama:
--   1. ukuran diseragamkan ke penanda "ALL SIZE" (satu-satunya ukuran kategori ini);
--   2. nama paket yang tersimpan di `products.series` dipindahkan ke kolom `color` varian
--      (kolom `color` = slot NAMA varian untuk kategori ini, lihat ProductForm.tsx);
--   3. kolom `hex` (sisa chip warna pakaian) dikosongkan.
-- ID baris, stok, berat, harga khusus, dan SKU TIDAK diubah — referensi transaksi lama tetap
-- nyambung. Aman dijalankan berulang: setelah baris rapi, syarat WHERE-nya tidak cocok lagi
-- (0 baris terpengaruh). Produk kategori lain tidak disentuh.
--
-- Cara menjalankan (sekali saja): Supabase Dashboard → SQL Editor → tempel seluruh isi file
-- ini → Run. Bisa juga lewat `supabase db push` kalau CLI-nya sudah tertaut ke proyek.

-- 1 · Ukuran → penanda "ALL SIZE"
UPDATE product_variants v
SET size = 'ALL SIZE'
FROM products p
WHERE p.id = v.product_id
  AND (p.category ~* '(^|[^a-z])hanger' OR lower(trim(p.category)) = 'cover')
  AND upper(trim(v.size)) IS DISTINCT FROM 'ALL SIZE'
  AND NOT EXISTS (
    SELECT 1
    FROM product_variants x
    WHERE x.product_id = v.product_id
      AND x.id <> v.id
      AND x.color = v.color
      AND x.size = 'ALL SIZE'
  );

-- 2 · Nama paket dari products.series → kolom `color` (hanya kalau kolom itu belum berisi nama)
UPDATE product_variants v
SET color = trim(p.series)
FROM products p
WHERE p.id = v.product_id
  AND (p.category ~* '(^|[^a-z])hanger' OR lower(trim(p.category)) = 'cover')
  AND NULLIF(trim(p.series), '') IS NOT NULL
  AND (
    v.color IS NULL
    OR trim(v.color) = ''
    OR trim(v.color) = '-'
    OR lower(trim(v.color)) IN ('default', 'all size')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM product_variants x
    WHERE x.product_id = v.product_id
      AND x.id <> v.id
      AND lower(trim(x.color)) = lower(trim(p.series))
      AND (x.size = 'ALL SIZE' OR x.size = v.size)
  );

-- 3 · Sisa chip warna pakaian dikosongkan
UPDATE product_variants v
SET hex = NULL
FROM products p
WHERE p.id = v.product_id
  AND (p.category ~* '(^|[^a-z])hanger' OR lower(trim(p.category)) = 'cover')
  AND v.hex IS NOT NULL;
