-- Add weight column to products table (grams)
-- Used for shipping cost calculation via RajaOngkir
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight INTEGER;
