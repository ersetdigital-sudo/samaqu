-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read payment_methods" ON payment_methods FOR SELECT USING (true);
CREATE POLICY "Service role all payment_methods" ON payment_methods FOR ALL USING (true);

-- Insert default bank
INSERT INTO payment_methods (bank_name, account_name, account_number, is_active, display_order)
VALUES ('Bank Mandiri', 'PT Samaqu Digital', '1234567890123', true, 1);
