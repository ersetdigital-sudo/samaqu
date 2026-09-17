-- Add weight column to orders table (grams)
-- Stores the total weight used for shipping calculation
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight INTEGER;
