-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own" ON wishlists FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers insert own" ON wishlists FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers delete own" ON wishlists FOR DELETE USING (auth.uid() = customer_id);
