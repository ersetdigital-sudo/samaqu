-- Add category column to faq_items
ALTER TABLE faq_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Lainnya';

-- Update existing items based on question content
UPDATE faq_items SET category = 'Populer' WHERE display_order <= 6;
UPDATE faq_items SET category = 'Order & Pembayaran' WHERE question ILIKE '%pesan%' OR question ILIKE '%order%' OR question ILIKE '%bayar%';
UPDATE faq_items SET category = 'Pengiriman' WHERE question ILIKE '%kirim%' OR question ILIKE '%pengiriman%';
UPDATE faq_items SET category = 'Produk, Kain & Size' WHERE question ILIKE '%bahan%' OR question ILIKE '%kain%' OR question ILIKE '%ukuran%' OR question ILIKE '%size%';
UPDATE faq_items SET category = 'Retur & Garansi' WHERE question ILIKE '%garansi%' OR question ILIKE '%retur%';
