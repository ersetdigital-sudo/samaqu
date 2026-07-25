-- Product variants and images schema
-- Run this AFTER the main schema.sql

-- Product variants table (color + size combinations)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price_override INTEGER,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, color, size)
);

-- Product images table (Cloudinary URLs per color)
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  url TEXT NOT NULL,
  is_video BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_color ON product_variants(product_id, color);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_images_color ON product_images(product_id, color);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Public read images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Service role all variants" ON product_variants FOR ALL USING (true);
CREATE POLICY "Service role all images" ON product_images FOR ALL USING (true);
