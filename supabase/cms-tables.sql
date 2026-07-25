-- CMS tables for SAMAQU

-- Store settings (single row)
CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  store_name TEXT NOT NULL DEFAULT 'SAMAQU',
  tagline TEXT DEFAULT 'Busana yang Layak Menemani Setiap Momen',
  email TEXT DEFAULT 'halo@samaqu.id',
  whatsapp TEXT DEFAULT '+62 812 3456 7890',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page content sections
CREATE TABLE IF NOT EXISTS page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hero section content
CREATE TABLE IF NOT EXISTS hero_content (
  id INTEGER PRIMARY KEY DEFAULT 1,
  tagline TEXT DEFAULT 'Busana yang Layak Menemani Setiap Momen',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Featured products (Koleksi Pilihan)
CREATE TABLE IF NOT EXISTS featured_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Cara Pemesanan steps
CREATE TABLE IF NOT EXISTS order_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_steps ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read store_settings" ON store_settings FOR SELECT USING (true);
CREATE POLICY "Public read page_sections" ON page_sections FOR SELECT USING (true);
CREATE POLICY "Public read hero_content" ON hero_content FOR SELECT USING (true);
CREATE POLICY "Public read featured_products" ON featured_products FOR SELECT USING (true);
CREATE POLICY "Public read order_steps" ON order_steps FOR SELECT USING (true);

-- Service role policies
CREATE POLICY "Service role all store_settings" ON store_settings FOR ALL USING (true);
CREATE POLICY "Service role all page_sections" ON page_sections FOR ALL USING (true);
CREATE POLICY "Service role all hero_content" ON hero_content FOR ALL USING (true);
CREATE POLICY "Service role all featured_products" ON featured_products FOR ALL USING (true);
CREATE POLICY "Service role all order_steps" ON order_steps FOR ALL USING (true);

-- Insert default data
INSERT INTO store_settings (id, store_name, tagline, email, whatsapp) VALUES (1, 'SAMAQU', 'Busana yang Layak Menemani Setiap Momen', 'halo@samaqu.id', '+62 812 3456 7890') ON CONFLICT (id) DO NOTHING;

INSERT INTO hero_content (id, tagline, is_active) VALUES (1, 'Busana yang Layak Menemani Setiap Momen', true) ON CONFLICT (id) DO NOTHING;

INSERT INTO order_steps (step_number, title, description) VALUES
  (1, 'Pilih Produk', 'Jelajahi katalog dan pilih busana yang sesuai selera Anda.'),
  (2, 'Konsultasi Size', 'Hubungi admin via WhatsApp untuk bantuan ukuran.'),
  (3, 'Lakukan Pembayaran', 'Transfer ke rekening kami atau bayar via QRIS.'),
  (4, 'Terima Pesanan', 'Pesanan dikemas rapi dan dikirim ke alamat Anda.');
