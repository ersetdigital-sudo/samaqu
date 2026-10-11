-- Kredensial J&T Express — diisi dari dashboard admin, menu Pengaturan → "Kredensial J&T Express".
-- Dijalankan manual di Supabase SQL editor: sandbox tidak punya jalur DDL ke project hosted.
--
-- Tabel ini SENGAJA terpisah dari `store_settings` karena `store_settings` punya policy
-- "Public read" (dibaca anon key/browser). Kredensial J&T tidak boleh ikut terbaca publik,
-- jadi tabel ini hanya bisa diakses lewat service role (server) — API route admin yang menulis.

CREATE TABLE IF NOT EXISTS jnt_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  env TEXT,                     -- 'testing' | 'production'; kosong = ikut JNT_ENV
  order_username TEXT,
  order_api_key TEXT,
  order_key TEXT,               -- signature key untuk create order / cancel
  tariff_key TEXT,              -- signature key untuk cek tarif
  tariff_cus_name TEXT,         -- cusName pada request tarif
  track_username TEXT,
  track_password TEXT,
  company_id TEXT,              -- eccompanyid pada request tracking
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jnt_settings ENABLE ROW LEVEL SECURITY;

-- Sengaja tanpa policy apa pun: RLS aktif + tanpa policy = anon & authenticated tidak bisa
-- baca/tulis. Hanya service role (server) yang bisa; nilainya dikirim lewat /api/admin/jnt-settings.

-- Baris tunggal (id = 1). Kolom kredensial dibiarkan kosong supaya environment variable
-- (JNT_ORDER_USERNAME, JNT_TARIFF_KEY, dst) tetap dipakai selama belum diisi dari admin.
INSERT INTO jnt_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
