-- Jendela Open Order — periode, tanggal mulai/tutup, dan series yang dibuka.
-- Diatur dari dashboard admin, menu "Open Order".
-- Dijalankan manual di Supabase SQL editor: sandbox tidak punya jalur DDL ke project hosted.

-- Periode & status lama (masih dibaca sebagai fallback selama tanggalnya belum diisi).
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS open_order_period TEXT DEFAULT '8-15 Agustus 2026';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS open_order_active BOOLEAN DEFAULT true;

-- Tanggal mulai & tanggal tutup. Status buka/tutup dihitung dari dua tanggal ini.
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS open_order_start_date DATE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS open_order_end_date DATE;

-- Series yang dibuka untuk Open Order (array nama series dari katalog). '[]' = semua series dibuka.
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS open_order_series JSONB DEFAULT '[]'::jsonb;

-- Baris tunggal pengaturan toko (id = 1) — isi nilai default kalau masih kosong.
INSERT INTO store_settings (id, open_order_period, open_order_active, open_order_series)
VALUES (1, '8-15 Agustus 2026', true, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  open_order_period = COALESCE(store_settings.open_order_period, EXCLUDED.open_order_period),
  open_order_active = COALESCE(store_settings.open_order_active, EXCLUDED.open_order_active),
  open_order_series = COALESCE(store_settings.open_order_series, EXCLUDED.open_order_series);
