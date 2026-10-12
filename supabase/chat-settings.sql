-- Pengaturan live chat AI — diisi dari dashboard admin, menu Pengaturan → "Live Chat AI".
-- Dijalankan manual di Supabase SQL editor: sandbox tidak punya jalur DDL ke project hosted.
--
-- Tabel ini SENGAJA terpisah dari `store_settings` karena `store_settings` punya policy
-- "Public read" (dibaca anon key/browser). API key AI tidak boleh ikut terbaca publik,
-- jadi tabel ini hanya bisa diakses lewat service role (server) — API route admin yang menulis.

CREATE TABLE IF NOT EXISTS chat_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,       -- chat tampil di website atau tidak
  api_key TEXT,                                 -- API key Xiaomi MiMo; kosong = ikut env MIMO_API_KEY
  base_url TEXT DEFAULT 'https://api.mimo.mi.com/v1',
  model TEXT DEFAULT 'mimo-v2-flash',
  greeting TEXT,                                -- sapaan pembuka di panel chat
  extra_instructions TEXT,                      -- knowledge/prompt tambahan yang diisi admin
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- Sengaja tanpa policy apa pun: RLS aktif + tanpa policy = anon & authenticated tidak bisa
-- baca/tulis. Hanya service role (server) yang bisa; nilainya dikirim lewat /api/admin/chat-settings.

INSERT INTO chat_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
