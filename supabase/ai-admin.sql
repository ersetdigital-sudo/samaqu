-- Tabel untuk ASISTEN AI ADMIN SAMAQU (dashboard internal).
--
-- Terpisah dari `chat_settings` / `chat_logs` milik live chat customer supaya konfigurasi,
-- riwayat, dan hak akses tidak pernah tercampur.
-- Dijalankan manual di Supabase SQL editor (sandbox tidak punya jalur DDL ke project hosted).
--
-- Seperti chat_settings/chat_logs, kedua tabel ini SENGAJA tanpa policy RLS: hanya service role
-- (server) yang bisa membaca/menulis. Kode tetap berjalan tanpa tabel ini — ia hanya kehilangan
-- penyimpanan log (dicatat di console server).

-- ── 1. Konfigurasi profil admin ────────────────────────────────────────────────
-- Kosong = pakai ENV (MIMO_API_KEY / MIMO_BASE_URL / MIMO_ADMIN_MODEL) lalu default.
CREATE TABLE IF NOT EXISTS ai_admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,     -- asisten admin tampil di panel
  api_key TEXT,                              -- kosong = ikut kredensial provider yang ada
  base_url TEXT,                             -- kosong = default provider OpenAI-compatible
  model TEXT,                                -- kosong = MIMO_ADMIN_MODEL / 'mimo-v2.6-flash'
  greeting TEXT,
  extra_instructions TEXT,                   -- instruksi tambahan KHUSUS admin (tidak pernah dipakai customer)
  temperature NUMERIC,                       -- kosong = 0.2
  max_tokens INTEGER,                        -- kosong = 900
  max_tool_rounds INTEGER,                   -- kosong = 5
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_admin_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO ai_admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 2. Pemakaian & audit log asisten admin ─────────────────────────────────────
-- Satu baris = satu jawaban asisten. Dipakai untuk audit (siapa bertanya apa), pemantauan
-- kestabilan (`error`), dan pengukuran pemakaian (durasi & tool yang dipakai).
-- CATATAN: tabel ini menyimpan pertanyaan & jawaban; jangan pernah menaruh kredensial di sini.
CREATE TABLE IF NOT EXISTS ai_admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT,                                -- email admin yang login (dari `admins`)
  session_id TEXT,                           -- id sesi UI admin (localStorage, terpisah dari customer)
  model TEXT,                                -- model yang dipakai saat itu
  question TEXT,                             -- pertanyaan admin (dipotong)
  answer TEXT,                               -- jawaban akhir asisten (dipotong)
  tools_used TEXT[] DEFAULT '{}',            -- tool read-only yang benar-benar dipanggil
  tool_rounds INTEGER DEFAULT 0,             -- berapa putaran tool
  duration_ms INTEGER,                       -- lama proses menjawab
  error TEXT,                                -- pesan galat bila gagal (tanpa data sensitif)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_admin_logs ENABLE ROW LEVEL SECURITY;

-- Sengaja tanpa policy: hanya service role (server) yang bisa baca/tulis.

CREATE INDEX IF NOT EXISTS ai_admin_logs_created_at_idx ON ai_admin_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_admin_logs_actor_idx ON ai_admin_logs (actor);
