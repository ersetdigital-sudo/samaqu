-- product_series: persistent list of series names
-- Run after schema.sql

CREATE TABLE IF NOT EXISTS product_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_series ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Public read product_series" ON product_series FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all product_series" ON product_series FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed defaults
INSERT INTO product_series (name) VALUES
  ('Jiharkah'), ('Imron'), ('Bayati'), ('Nahawand'), ('Karim'), ('Imalah')
ON CONFLICT (name) DO NOTHING;

-- Migrate existing series values from products
INSERT INTO product_series (name)
SELECT DISTINCT series FROM products WHERE series IS NOT NULL AND series != ''
ON CONFLICT (name) DO NOTHING;
