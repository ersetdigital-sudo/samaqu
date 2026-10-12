-- Pengaturan notifikasi WhatsApp Fonnte — diisi dari dashboard admin, menu Pengaturan → "Notifikasi WhatsApp (Fonnte)".
-- Dijalankan manual di Supabase SQL editor: sandbox tidak punya jalur DDL ke project hosted.
--
-- Tabel ini SENGAJA terpisah dari `store_settings` karena `store_settings` punya policy
-- "Public read" (dibaca anon key/browser). Token Fonnte tidak boleh ikut terbaca publik,
-- jadi tabel ini hanya bisa diakses lewat service role (server) — API route admin yang menulis.

CREATE TABLE IF NOT EXISTS fonnte_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,  -- matikan untuk berhenti mengirim notifikasi
  token TEXT,                             -- token device Fonnte; kosong = ikut environment FONNTE_TOKEN
  admin_number TEXT,                      -- nomor admin penerima; kosong = ikut ADMIN_WHATSAPP_NUMBER / store_settings.whatsapp
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fonnte_settings ENABLE ROW LEVEL SECURITY;

-- Sengaja tanpa policy apa pun: RLS aktif + tanpa policy = anon & authenticated tidak bisa
-- baca/tulis. Hanya service role (server) yang bisa; nilainya dikirim lewat /api/admin/fonnte-settings.

-- Baris tunggal (id = 1). Kolom token/nomor dibiarkan kosong supaya environment variable
-- (FONNTE_TOKEN, ADMIN_WHATSAPP_NUMBER) tetap dipakai selama belum diisi dari admin.
INSERT INTO fonnte_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
