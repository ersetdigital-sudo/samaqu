-- Sumber transaksi untuk menu "Transaksi" dashboard internal (/ops).
--
-- Halaman Transaksi membaca pesanan dari tabel `orders` yang SUDAH ADA (pesanan website
-- & Open Order otomatis tampil), jadi tidak ada tabel pesanan kedua. Yang perlu ditambah
-- cuma kolom penanda asal penjualan:
--
--   website   → default, diisi otomatis oleh checkout website (tidak ditulis kode mana pun)
--   whatsapp / instagram / shopee / tiktok / offline
--             → diisi saat admin mencatat transaksi manual dari menu Transaksi
--
-- Nullable + DEFAULT: baris pesanan lama otomatis terisi 'website' tanpa UPDATE terpisah,
-- dan checkout/Open Order tidak perlu diubah sama sekali.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';
