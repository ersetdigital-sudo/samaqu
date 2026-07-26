-- QRIS / E-Wallet methods table
CREATE TABLE IF NOT EXISTS qris_ewallet_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  method_type TEXT NOT NULL DEFAULT 'qris',
  account_info TEXT,
  qr_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE qris_ewallet_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read qris_ewallet_methods" ON qris_ewallet_methods FOR SELECT USING (true);
CREATE POLICY "Service role all qris_ewallet_methods" ON qris_ewallet_methods FOR ALL USING (true);
