-- Jenis Kain entity + product linkage
-- Run after schema.sql and product-variants.sql

-- 1. Create jenis_kain table
CREATE TABLE IF NOT EXISTS jenis_kain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  material TEXT,
  texture TEXT,
  suitable_for TEXT,
  care_instructions TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS (same pattern as products, product_variants, etc.)
ALTER TABLE jenis_kain ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Public read jenis_kain" ON jenis_kain FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all jenis_kain" ON jenis_kain FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Add new columns to products (ADDITIVE, nullable)
ALTER TABLE products ADD COLUMN IF NOT EXISTS jenis_kain_id UUID REFERENCES jenis_kain(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catatan_harga TEXT;

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_products_jenis_kain ON products(jenis_kain_id);

-- 5. Auto-migrate: generate jenis_kain rows from existing kain text values
INSERT INTO jenis_kain (name)
SELECT DISTINCT kain FROM products WHERE kain IS NOT NULL AND kain != ''
ON CONFLICT (name) DO NOTHING;

-- 6. Link existing products to their jenis_kain
UPDATE products p SET jenis_kain_id = jk.id
FROM jenis_kain jk WHERE p.kain = jk.name AND p.jenis_kain_id IS NULL;
