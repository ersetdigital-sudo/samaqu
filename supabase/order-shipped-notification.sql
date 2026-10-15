-- Penanda notifikasi WhatsApp "paket sudah dikirim + nomor resi".
--
-- Dikirim SATU KALI per pesanan (dipicu saat status pesanan berubah jadi `dikirim`), supaya tidak
-- terkirim ulang kalau status diubah bolak-balik atau resi dibuat ulang. Hasil kirimnya disimpan
-- untuk pemeriksaan admin (terkirim / gagal).
alter table public.orders
  /** Waktu notifikasi "dikirim" dikirim (null = belum pernah dikirim). */
  add column if not exists shipped_notified_at timestamptz,
  /** Hasil percobaan terakhir: 'sent' | 'failed' (null = belum pernah dicoba). */
  add column if not exists shipped_notify_status text;
