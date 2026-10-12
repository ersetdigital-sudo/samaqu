-- Log percakapan live chat AI — untuk analitik & menemukan pertanyaan yang belum terjawab.
-- Dijalankan manual di Supabase SQL editor (sandbox tidak punya jalur DDL ke project hosted).
--
-- Seperti fonnte_settings/chat_settings, tabel ini SENGAJA tanpa policy RLS supaya hanya bisa
-- dibaca service role (server). Isi chat pelanggan tidak boleh terbaca publik.

CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,                                  -- id sesi anonim dari browser (localStorage)
  locale TEXT,                                      -- 'id' | 'en'
  question TEXT,                                    -- pertanyaan terakhir pelanggan
  answer TEXT,                                      -- jawaban akhir asisten
  tools_used TEXT[] DEFAULT '{}',                   -- tool yang dipakai (cari_produk, panduan_ukuran, ...)
  escalated BOOLEAN DEFAULT false,                  -- diisi HANYA kalau tool hubungi_admin benar-benar dipakai
  error TEXT,                                       -- pesan galat bila balasan gagal (buat pantau kestabilan)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Sengaja tanpa policy: hanya service role (server) yang bisa baca/tulis.

CREATE INDEX IF NOT EXISTS chat_logs_created_at_idx ON chat_logs (created_at DESC);
