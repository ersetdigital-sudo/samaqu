-- Add province and kecamatan text columns to saved_addresses
ALTER TABLE saved_addresses ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE saved_addresses ADD COLUMN IF NOT EXISTS kecamatan TEXT;
