-- Cache table for RajaOngkir shipping data (provinces, cities, districts)
-- Data rarely changes (Indonesian administrative divisions), cache for 30 days
CREATE TABLE IF NOT EXISTS shipping_cache (
  cache_key TEXT PRIMARY KEY,
  cache_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for TTL checks
CREATE INDEX IF NOT EXISTS idx_shipping_cache_cached_at ON shipping_cache (cached_at);

-- RLS policies (match pattern from other tables)
ALTER TABLE shipping_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read shipping_cache" ON shipping_cache FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role all shipping_cache" ON shipping_cache FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
