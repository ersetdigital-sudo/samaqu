-- Cache table for postal code → district mapping
CREATE TABLE IF NOT EXISTS postal_district_cache (
  postal_code TEXT PRIMARY KEY,
  district_id INTEGER NOT NULL,
  district_name TEXT,
  city_id INTEGER,
  city_name TEXT,
  province_id INTEGER,
  province_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
