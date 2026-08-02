-- Add display_order to product_variants to preserve admin input order
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_product_variants_order ON product_variants(product_id, color, display_order);
