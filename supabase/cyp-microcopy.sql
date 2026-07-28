-- Add CYP microcopy to store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS cyp_microcopy TEXT;
