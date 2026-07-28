-- Add voucher_code column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code TEXT;

-- Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_purchase NUMERIC DEFAULT 0,
  max_discount NUMERIC DEFAULT 0,
  usage_limit INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vouchers" ON vouchers FOR SELECT USING (true);
CREATE POLICY "Service role all vouchers" ON vouchers FOR ALL USING (true);
