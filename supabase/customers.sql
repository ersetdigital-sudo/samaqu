-- Customer accounts table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  whatsapp TEXT,
  chest_size NUMERIC,
  shoulder_size NUMERIC,
  length_size NUMERIC,
  sleeve_size NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own" ON customers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Customers update own" ON customers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Customers insert own" ON customers FOR INSERT WITH CHECK (auth.uid() = id);

-- Link orders to customer accounts
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
