-- Mayar payment gateway.
--
-- 1) `mayar_settings` — kredensial Mayar (API key + webhook token + environment), SATU baris (id=1).
--    Tabel ini TANPA policy RLS (service-role saja), sama seperti `fonnte_settings`/`chat_settings`:
--    isinya rahasia dan hanya dibaca server.
-- 2) Kolom pembayaran di `orders` — diisi saat invoice Mayar dibuat & saat webhook menandai lunas.
--    Semua NULLABLE supaya pesanan lama tidak terpengaruh.
create table if not exists public.mayar_settings (
  id integer primary key default 1,
  api_key text,
  webhook_token text,
  /** 'sandbox' → https://api.mayar.io/hl/v2 ; 'production' → https://api.mayar.id/hl/v2 */
  env text not null default 'sandbox',
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.mayar_settings enable row level security;

alter table public.orders
  /** 'mayar' kalau pembayaran lewat gateway ini. */
  add column if not exists payment_provider text,
  /** id invoice Mayar (dipakai webhook untuk mencocokkan pembayaran). */
  add column if not exists payment_ref text,
  /** link halaman bayar Mayar yang dibuka customer. */
  add column if not exists payment_url text,
  /** status dari Mayar: 'unpaid' | 'paid' | 'closed'. */
  add column if not exists payment_status text,
  /** waktu pembayaran diterima (diisi webhook setelah diverifikasi ulang ke API Mayar). */
  add column if not exists paid_at timestamptz;

create index if not exists orders_payment_ref_idx on public.orders (payment_ref);
