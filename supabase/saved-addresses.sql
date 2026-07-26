-- Saved addresses for customers
CREATE TABLE IF NOT EXISTS saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Alamat',
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Customers read own addresses" ON saved_addresses FOR SELECT USING (auth.uid() = customer_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Customers insert own addresses" ON saved_addresses FOR INSERT WITH CHECK (auth.uid() = customer_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Customers update own addresses" ON saved_addresses FOR UPDATE USING (auth.uid() = customer_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Customers delete own addresses" ON saved_addresses FOR DELETE USING (auth.uid() = customer_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
