-- Additional CMS tables for SAMAQU

-- Garansi / Jaminan section
CREATE TABLE IF NOT EXISTS garansi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust badges
CREATE TABLE IF NOT EXISTS trust_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQ items
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust marquee items
CREATE TABLE IF NOT EXISTS marquee_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE garansi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marquee_items ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read garansi_items" ON garansi_items FOR SELECT USING (true);
CREATE POLICY "Public read trust_badges" ON trust_badges FOR SELECT USING (true);
CREATE POLICY "Public read faq_items" ON faq_items FOR SELECT USING (true);
CREATE POLICY "Public read marquee_items" ON marquee_items FOR SELECT USING (true);

-- Service role policies
CREATE POLICY "Service role all garansi_items" ON garansi_items FOR ALL USING (true);
CREATE POLICY "Service role all trust_badges" ON trust_badges FOR ALL USING (true);
CREATE POLICY "Service role all faq_items" ON faq_items FOR ALL USING (true);
CREATE POLICY "Service role all marquee_items" ON marquee_items FOR ALL USING (true);

-- Insert default data - Garansi
INSERT INTO garansi_items (title, description, display_order) VALUES
  ('Kualitas Terjamin', 'Setiap produk melewati pengecekan jahitan dan bahan sebelum dikirim.', 1),
  ('Pengiriman Aman', 'Dikemas rapi dan terlindungi agar sampai dalam kondisi sempurna.', 2),
  ('Layanan Ramah', 'Admin siap membantu dari pemilihan size hingga setelah pembelian.', 3);

-- Insert default data - Trust Badges
INSERT INTO trust_badges (label, display_order) VALUES
  ('100% Original', 1),
  ('Packing Aman', 2),
  ('Support Personal', 3);

-- Insert default data - FAQ
INSERT INTO faq_items (question, answer, display_order) VALUES
  ('Bagaimana cara memesan produk SAMAQU?', 'Pilih produk dari katalog, cek panduan size, lalu klik tombol WhatsApp untuk menghubungi admin. Admin akan membantu konfirmasi ketersediaan hingga pembayaran.', 1),
  ('Apakah bahan SAMAQU nyaman dan adem?', 'Sangat. Kami memilih bahan berkualitas yang adem, ringan, dan tidak panas saat dikenakan — nyaman untuk ibadah, keseharian, maupun acara istimewa dalam waktu lama.', 2),
  ('Bagaimana jika saya ragu memilih ukuran?', 'Gunakan panduan size kami sebagai acuan awal. Jika masih ragu, cukup chat admin dengan menyebutkan tinggi dan postur tubuhmu — kami bantu menentukan ukuran yang paling pas.', 3),
  ('Apakah bisa pesan dalam jumlah banyak / grosir?', 'Tentu. Kami melayani pemesanan pribadi, keluarga, hingga komunitas. Untuk pembelian grosir tersedia penawaran khusus — ceritakan kebutuhanmu dan tim kami susun harga terbaik.', 4),
  ('Apakah ada garansi untuk produk?', 'Setiap produk melewati pengecekan jahitan dan bahan sebelum dikirim. Bila ada ketidaksesuaian pada pesanan, hubungi admin kami dan akan kami bantu dengan sepenuh hati.', 5);

-- Insert default data - Marquee
INSERT INTO marquee_items (label, display_order) VALUES
  ('Material Premium', 1),
  ('Jahitan Presisi', 2),
  ('Nyaman Dipakai', 3),
  ('Desain Modern', 4);
