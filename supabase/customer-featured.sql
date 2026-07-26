-- Separate table for customer dashboard featured products (NOT same as featured_products for homepage)
CREATE TABLE IF NOT EXISTS customer_featured_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_featured_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Public read cfp" ON customer_featured_products FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all cfp" ON customer_featured_products FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed with 6 default products (same as featured_products)
INSERT INTO customer_featured_products (product_id, display_order) VALUES
  ('thobe-b01-jiharkah', 0),
  ('thobe-b02-coffee', 1),
  ('thobe-b02-maroon', 2),
  ('thobe-a02-charcoal', 3),
  ('thobe-a02-softgrey', 4),
  ('thobe-c01-superblack', 5)
ON CONFLICT DO NOTHING;
