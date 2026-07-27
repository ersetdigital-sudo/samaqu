-- Add shipping settings to store_settings
-- origin_district_id: RajaOngkir kecamatan ID for store location
-- enabled_couriers: JSON array of enabled courier codes
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS origin_district_id INTEGER;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS enabled_couriers TEXT DEFAULT '["jne","sicepat","jnt","ninja","tiki","wahana","pos","lion","anteraja"]';
