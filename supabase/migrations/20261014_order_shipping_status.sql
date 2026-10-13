-- Status pengiriman terpisah dari status pesanan + riwayat tracking J&T.
--
-- Sebelumnya UI menurunkan "Dikirim" hanya dari `status='diproses' AND awb_no ada` (lihat
-- src/lib/order-flow.ts), jadi begitu resi terbit paket dianggap sudah dikirim. Padahal resi
-- cuma berarti pengiriman DIBUAT — paket masih menunggu pickup/scan kurir.
--
-- Alur baru:
--   shipping_status NULL            → resi belum dibuat (pesanan "Perlu Dikirim")
--   shipping_status 'menunggu_pickup' → resi terbit, menunggu pickup/scan J&T
--   shipping_status 'dikirim'         → J&T sudah memindai (paket mulai bergerak)
--   shipping_status 'selesai'         → paket diterima penerima (J&T status_code 200)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_status TEXT,
  ADD COLUMN IF NOT EXISTS tracking_status_code INTEGER,
  ADD COLUMN IF NOT EXISTS tracking_status_text TEXT,
  ADD COLUMN IF NOT EXISTS tracking_city TEXT,
  ADD COLUMN IF NOT EXISTS tracking_updated_at TIMESTAMPTZ;

-- Riwayat tracking J&T. `event_key` = "<awb>|<status_code>|<date_time>" supaya callback/polling
-- yang sama tidak membuat baris ganda (idempoten). Kode status tak dikenal tetap disimpan apa
-- adanya (kolom `raw`) untuk pemeriksaan — tanpa menebak artinya.
-- Catatan: `orders.id` di database ini bertipe TEXT (bukan UUID), jadi `order_id` mengikuti
-- tipe yang sama supaya foreign key-nya bisa dibuat.
CREATE TABLE IF NOT EXISTS order_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  awb_no TEXT NOT NULL,
  event_key TEXT NOT NULL,
  status_code INTEGER,
  status_text TEXT,
  city_name TEXT,
  event_time TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_tracking_events_key UNIQUE (event_key)
);

CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order ON order_tracking_events(order_id);
