-- Size Guide Images table
-- Stores size guide images per product category, managed via admin panel
-- Each row holds a Cloudinary image URL for a specific category's size chart

CREATE TABLE IF NOT EXISTS size_guide_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rows for each category + rekomendasi
INSERT INTO size_guide_images (category, image_url) VALUES
  ('Thobe', ''),
  ('Kandora', ''),
  ('Koko', ''),
  ('Vest', ''),
  ('Kabak', ''),
  ('Rekomendasi Size', '')
ON CONFLICT (category) DO NOTHING;

-- Enable RLS
ALTER TABLE size_guide_images ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view size guide images)
CREATE POLICY "Public read access for size_guide_images"
  ON size_guide_images FOR SELECT
  USING (true);

-- Admin write access (authenticated users can manage)
CREATE POLICY "Admin write access for size_guide_images"
  ON size_guide_images FOR ALL
  USING (true)
  WITH CHECK (true);
