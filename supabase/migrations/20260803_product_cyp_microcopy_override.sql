-- Add per-product CYP microcopy override column
ALTER TABLE products ADD COLUMN IF NOT EXISTS cyp_microcopy_override TEXT;
