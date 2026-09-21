-- ============================================================
-- SATUKAN SEMUA METODE PEMBAYARAN KE TABEL payment_methods
-- Jenis yang didukung: bank | qris | ewallet | cod | other
-- Aman dijalankan berulang kali (idempotent).
-- Jalankan di Supabase SQL Editor SEBELUM deploy fitur ini.
-- ============================================================

-- 1. Kolom baru supaya metode non-bank (QRIS / e-wallet / COD) bisa disimpan
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS method_type TEXT NOT NULL DEFAULT 'bank';
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'bank';
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS account_info TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS qr_image_url TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS instructions TEXT;

-- 2. Data bank lama: isi label supaya tampilannya tetap sama seperti sebelumnya
UPDATE payment_methods
   SET label = 'Transfer Bank (' || bank_name || ')'
 WHERE label IS NULL
   AND bank_name IS NOT NULL;

UPDATE payment_methods SET label = 'Transfer Bank' WHERE label IS NULL;

-- 3. Rekening jadi opsional (COD / QRIS tidak punya nomor rekening)
ALTER TABLE payment_methods ALTER COLUMN bank_name DROP NOT NULL;
ALTER TABLE payment_methods ALTER COLUMN account_name DROP NOT NULL;
ALTER TABLE payment_methods ALTER COLUMN account_number DROP NOT NULL;

-- 4. Pindahkan metode QRIS / E-Wallet lama ke tabel ini
INSERT INTO payment_methods (label, method_type, icon, account_info, qr_image_url, is_active, display_order)
SELECT q.provider_name,
       CASE WHEN q.method_type = 'ewallet' THEN 'ewallet' ELSE 'qris' END,
       CASE WHEN q.method_type = 'ewallet' THEN 'ewallet' ELSE 'qris' END,
       q.account_info,
       q.qr_image_url,
       COALESCE(q.is_active, true),
       COALESCE(q.display_order, 0) + 100
  FROM qris_ewallet_methods q
 WHERE NOT EXISTS (
   SELECT 1 FROM payment_methods p
    WHERE p.label = q.provider_name
      AND p.method_type = CASE WHEN q.method_type = 'ewallet' THEN 'ewallet' ELSE 'qris' END
 );

-- 5. Contoh metode COD — dibuat NONAKTIF, aktifkan dari admin kalau mau dipakai
INSERT INTO payment_methods (label, method_type, icon, instructions, is_active, display_order)
SELECT 'Bayar di Tempat (COD)', 'cod', 'cod',
       'Pembayaran dilakukan saat barang diterima. Admin akan menghubungi Anda untuk konfirmasi pengiriman.',
       false, 200
 WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE method_type = 'cod');

-- Catatan:
-- * Tabel qris_ewallet_methods sengaja TIDAK dihapus (backup data lama).
--   Hapus manual kalau sudah yakin: DROP TABLE qris_ewallet_methods;
-- * Semua metode yang nonaktif otomatis disembunyikan di halaman checkout.
