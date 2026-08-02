-- Tambah kolom hex untuk warna custom (gaya editor HTML: hex picker bebas + nama warna)
-- Nullable supaya produk lama tidak rusak; halaman customer fallback ke colorMap/#ccc.
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS hex TEXT;
