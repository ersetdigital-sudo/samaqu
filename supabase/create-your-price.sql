-- Create Your Price: database schema changes
-- Jalankan di Supabase SQL Editor

-- 1. Products table: add CYP fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_price INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS recommended_price INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS create_your_price_enabled BOOLEAN DEFAULT false;

-- 2. Order items table: add CYP tracking fields
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS customer_price INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS minimum_price INTEGER;
