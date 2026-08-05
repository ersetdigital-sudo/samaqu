-- Garansi & Retur page content (single row, all fields)

CREATE TABLE IF NOT EXISTS garansi_retur_page (
  id INTEGER PRIMARY KEY DEFAULT 1,
  
  -- Hero
  hero_title TEXT DEFAULT 'Garansi & Kebijakan Retur',
  hero_kicker TEXT DEFAULT 'BELANJA AMAN, HAK ANDA TERLINDUNGI',
  hero_description TEXT DEFAULT 'Kami memastikan setiap pembelian memberikan ketenangan. Kenali garansi dan kebijakan retur kami untuk pengalaman belanja yang lebih baik.',
  hero_bullet1 TEXT DEFAULT 'Garansi produk cacat produksi',
  hero_bullet2 TEXT DEFAULT 'Retur dalam 7 hari kerja',
  hero_bullet3 TEXT DEFAULT 'Konsultasi sebelum retur',
  hero_closing TEXT DEFAULT 'Kami percaya transparansi adalah awal dari kepercayaan. Jika ada masalah, hubungi kami — kami siap membantu.',
  hero_cta_text TEXT DEFAULT 'Ajukan Retur via WhatsApp',
  hero_image_url TEXT DEFAULT '/garansi/hero-web.png',
  
  -- Garansi
  garansi_title TEXT DEFAULT 'Yang Kami Jamin',
  garansi_desc TEXT DEFAULT 'Setiap produk SAMAQU memiliki jaminan untuk memastikan Anda mendapatkan yang terbaik.',
  garansi1_title TEXT DEFAULT 'Produk Sampai dengan Aman',
  garansi1_desc TEXT DEFAULT 'Kami memastikan setiap pesanan dikemas rapi dan terlindungi. Jika produk rusak atau cacat saat pengiriman, kami akan menggantinya dengan yang baru.',
  garansi2_title TEXT DEFAULT 'Garansi Penggantian Produk',
  garansi2_desc TEXT DEFAULT 'Jika Anda menerima produk dengan cacat produksi (jahitan lepas, bahan robek, atau ketidaksesuaian warna), hubungi kami dalam waktu 7 hari kerja.',
  garansi2_note TEXT DEFAULT 'Sertakan foto produk dan nomor pesanan saat menghubungi.',
  garansi3_title TEXT DEFAULT 'Konsultasi Ukuran Gratis',
  garansi3_desc TEXT DEFAULT 'Sebelum membeli, Anda bisa berkonsultasi dengan admin kami untuk memastikan ukuran yang tepat. Kami bantu menemukan yang paling nyaman.',
  garansi3_note TEXT DEFAULT '',
  
  -- Kebijakan Retur
  retur_title TEXT DEFAULT 'Kebijakan Retur',
  retur_desc TEXT DEFAULT 'Kami menerima retur dalam kondisi tertentu untuk memastikan kepuasan Anda.',
  retur1 TEXT DEFAULT 'Kemasan asli masih utuh dan belum dibuka',
  retur2 TEXT DEFAULT 'Label dan tag produk masih terpasang',
  retur3 TEXT DEFAULT 'Dalam waktu 7 hari kerja sejak barang diterima',
  retur4 TEXT DEFAULT 'Bukti pembelian atau screenshot order',
  
  -- Cara Mengajukan
  cara_title TEXT DEFAULT 'Cara Mengajukan Retur',
  cara1 TEXT DEFAULT 'Hubungi admin via WhatsApp dan sertakan nomor pesanan serta alasan retur.',
  cara2 TEXT DEFAULT 'Kirim foto produk yang ingin diretur beserta kondisi kemasan.',
  cara3 TEXT DEFAULT 'Tunggu konfirmasi dari admin mengenai persetujuan retur.',
  cara4 TEXT DEFAULT 'Kirim produk ke alamat yang telah ditentukan dan konfirmasi resi pengiriman.',
  
  -- Tidak Dapat Diretur
  no_retur_title TEXT DEFAULT 'Yang Tidak Dapat Diretur',
  no_retur_desc TEXT DEFAULT 'Beberapa kondisi berikut tidak memenuhi syarat retur:',
  no_retur1 TEXT DEFAULT 'Produk sudah dipakai atau dicuci',
  no_retur2 TEXT DEFAULT 'Perubahan warna akibat pemakaian',
  no_retur3 TEXT DEFAULT 'Ukuran sudah disesuaikan permintaan',
  no_retur4 TEXT DEFAULT 'Kerusakan akibat pemakaian tidak tepat',
  no_retur5 TEXT DEFAULT 'Kerusakan akibat pencucian tidak sesuai',
  
  -- CTA
  cta_title TEXT DEFAULT 'Butuh Bantuan?',
  cta_desc1 TEXT DEFAULT 'Jika Anda memiliki pertanyaan tentang garansi atau ingin mengajukan retur, jangan ragu untuk menghubungi admin kami.',
  cta_desc2 TEXT DEFAULT 'Tim kami siap membantu Anda dengan sepenuh hati.',
  cta_button_text TEXT DEFAULT 'Hubungi Admin',
  cta_image_url TEXT DEFAULT '/garansi/cta-web.png',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE garansi_retur_page ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read garansi_retur_page" ON garansi_retur_page FOR SELECT USING (true);

-- Service role all
CREATE POLICY "Service role all garansi_retur_page" ON garansi_retur_page FOR ALL USING (true);

-- Insert default row
INSERT INTO garansi_retur_page (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
