-- Meta Pixel integration columns for store_settings
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_access_token TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_pixel_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS meta_test_event_code TEXT DEFAULT NULL;
