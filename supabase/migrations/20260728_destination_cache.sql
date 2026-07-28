-- Cache destination search results to avoid redundant RajaOngkir API calls
-- Keyed by normalized kecamatan+city so any user searching the same location reuses the cached result

CREATE TABLE IF NOT EXISTS destination_cache (
  cache_key TEXT PRIMARY KEY,          -- "KECAMATAN|CITY" uppercased
  district_id INTEGER NOT NULL,        -- RajaOngkir subdistrict ID
  kecamatan TEXT NOT NULL,
  city TEXT,
  province TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-expire old entries after 30 days
CREATE OR REPLACE FUNCTION cleanup_destination_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM destination_cache WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- RLS: allow anonymous read (for checkout page), service_role write
ALTER TABLE destination_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read destination_cache"
  ON destination_cache FOR SELECT
  USING (true);

CREATE POLICY "Allow insert destination_cache"
  ON destination_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow upsert destination_cache"
  ON destination_cache FOR UPDATE
  USING (true);
