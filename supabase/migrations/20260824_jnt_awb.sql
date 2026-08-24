-- Add J&T AWB columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS awb_no TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS jnt_order_id TEXT;
