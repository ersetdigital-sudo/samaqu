-- Add step-by-step district ID for dropdown matching
-- origin_district_id = direct search ID (for shipping cost calculation)
-- origin_district_step_id = step-by-step ID (for dropdown selection)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS origin_district_step_id INTEGER;
