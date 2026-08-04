-- Add product_id and series_name columns to testimonials
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS series_name TEXT;

-- Add foreign key constraint (optional, for data integrity)
-- ALTER TABLE testimonials ADD CONSTRAINT fk_testimonials_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_testimonials_product_id ON testimonials(product_id);
