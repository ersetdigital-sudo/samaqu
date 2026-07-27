-- Add district_id to saved_addresses for instant shipping calculation
ALTER TABLE saved_addresses ADD COLUMN IF NOT EXISTS district_id INTEGER;
