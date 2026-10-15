-- Pemisahan konfigurasi Fonnte: notifikasi Customer vs internal Admin.
--
-- Satu baris saja (id = 1) seperti sebelumnya. Kolom lama (`token`, `admin_number`) tetap
-- dipakai sebagai jalur cadangan supaya notifikasi tidak mendadak berhenti saat transisi:
-- kalau `customer_token` / `admin_token` masih kosong, pengiriman jatuh ke `token` lama
-- (lalu ke environment variable FONNTE_TOKEN).
alter table public.fonnte_settings
  /** Token device Fonnte untuk SEMUA pesan ke customer. */
  add column if not exists customer_token text,
  /** Nomor pengirim customer (catatan/label device; tidak dipakai untuk mengirim). */
  add column if not exists customer_number text,
  /** Token device Fonnte untuk pesan internal ke admin. */
  add column if not exists admin_token text;
