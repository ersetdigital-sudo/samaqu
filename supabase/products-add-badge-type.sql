-- Add badge_type column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge_type TEXT;
-- Allowed values: 'terlaris', 'rekomendasi', 'new', or NULL (no badge)
