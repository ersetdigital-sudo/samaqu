-- Category images for homepage Koleksi Pilihan
CREATE TABLE IF NOT EXISTS category_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE category_images ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Public read category_images" ON category_images FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all category_images" ON category_images FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed with existing 6 categories
INSERT INTO category_images (name, description, image_url, display_order) VALUES
  ('Thobe', 'Potongan panjang klasik, adem, dan berwibawa.', '/images/57f4aded-cd60-412d-95b6-1085b51b97be.png', 0),
  ('Kandora', 'Elegan untuk sehari-hari maupun formal.', '/images/e3214c06-ccf4-4342-aba7-849bf95da85a.png', 1),
  ('Koko', 'Modern dan nyaman untuk shalat.', '/images/515c6ce5-1ac8-48d7-9832-450cbcd4cac9.png', 2),
  ('Vest', 'Presisi untuk tampilan berkelas.', '/images/3b981a31-de0d-4aa5-9890-330ffe3f261d.png', 3),
  ('Kabak', 'Premium berkualitas tinggi.', '/images/b32f8726-78f1-455c-aff9-59ab8b1a1310.png', 4),
  ('Cover Hanger', 'Jaga busana tetap rapi.', '/images/6aec5227-932a-4ff1-86e2-2a3bb34943e9.png', 5)
ON CONFLICT DO NOTHING;
