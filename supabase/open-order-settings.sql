-- Periode & status Open Order — diatur dari dashboard admin, menu "Open Order".
-- Dijalankan manual di Supabase SQL editor: sandbox tidak punya jalur DDL ke project hosted.
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS open_order_period TEXT DEFAULT '8-15 Agustus 2026';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS open_order_active BOOLEAN DEFAULT true;

-- Baris tunggal pengaturan toko (id = 1) — isi nilai default kalau masih kosong.
INSERT INTO store_settings (id, open_order_period, open_order_active)
VALUES (1, '8-15 Agustus 2026', true)
ON CONFLICT (id) DO UPDATE SET
  open_order_period = COALESCE(store_settings.open_order_period, EXCLUDED.open_order_period),
  open_order_active = COALESCE(store_settings.open_order_active, EXCLUDED.open_order_active);
