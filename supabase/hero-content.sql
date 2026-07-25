-- Update hero_content table with all fields
-- Run this in Supabase SQL Editor

-- Drop old table if exists and recreate with all fields
DROP TABLE IF EXISTS hero_content CASCADE;

CREATE TABLE hero_content (
  id INTEGER PRIMARY KEY DEFAULT 1,
  eyebrow_text TEXT DEFAULT 'Premium Muslim Menswear',
  title_line1 TEXT DEFAULT 'Busana yang Layak',
  title_line2 TEXT DEFAULT 'Menemani Setiap Momen.',
  description TEXT DEFAULT 'Dirancang dengan material pilihan, potongan yang presisi, dan detail yang dibuat untuk kenyamanan dalam setiap aktivitas.',
  feature1 TEXT DEFAULT '6 Koleksi Eksklusif',
  feature2 TEXT DEFAULT 'Berbagai Jenis Kain',
  feature3 TEXT DEFAULT 'Panduan Size Lengkap',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hero_content ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read hero_content" ON hero_content FOR SELECT USING (true);
CREATE POLICY "Service role all hero_content" ON hero_content FOR ALL USING (true);

-- Insert default data
INSERT INTO hero_content (id, eyebrow_text, title_line1, title_line2, description, feature1, feature2, feature3, is_active)
VALUES (1, 'Premium Muslim Menswear', 'Busana yang Layak', 'Menemani Setiap Momen.', 'Dirancang dengan material pilihan, potongan yang presisi, dan detail yang dibuat untuk kenyamanan dalam setiap aktivitas.', '6 Koleksi Eksklusif', 'Berbagai Jenis Kain', 'Panduan Size Lengkap', true)
ON CONFLICT (id) DO NOTHING;
