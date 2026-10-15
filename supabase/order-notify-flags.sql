-- Penanda notifikasi WhatsApp customer di tabel `orders`.
--
-- Setiap kolom di sini adalah "klaim sekali pakai": pengirim pesan menjalankan
--   update ... set <kolom> = now() where id = ? and <kolom> is null returning id
-- sehingga hanya SATU proses yang menang walau webhook, cron, dan aksi admin berjalan
-- bersamaan. Pengecekan di kode saja tidak cukup (itu sumber pesan ganda).
--
-- `shipped_notified_at` + `shipped_notify_status` sudah ada lebih dulu
-- (supabase/order-shipped-notification.sql) dan tetap dipakai untuk notifikasi "dikirim".
alter table public.orders
  /** Notifikasi "pesanan berhasil dibuat + instruksi pembayaran" (WA customer). */
  add column if not exists notify_created_at timestamptz,
  /** Notifikasi "pembayaran diterima" (WA customer). */
  add column if not exists paid_notified_at timestamptz,
  /** Notifikasi "paket diterima" (WA customer). */
  add column if not exists delivered_notified_at timestamptz,
  /** Reminder pembayaran (WA customer) — maksimal satu kali per pesanan. */
  add column if not exists reminded_at timestamptz,
  /** Notifikasi "pesanan dibatalkan" (WA customer + admin). */
  add column if not exists cancelled_notified_at timestamptz;
