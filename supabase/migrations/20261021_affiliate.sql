-- =====================================================================
-- SAMAQU — Program Affiliate (2026-10-21)
--
-- Modul affiliate berdiri sendiri: tabel & kolom BARU, tanpa mengubah
-- tabel existing. Yang disentuh dari tabel existing hanya `orders`
-- (5 kolom tambahan, semuanya nullable) supaya pesanan bisa menyimpan
-- atribusi referral + komisi.
--
-- Semua nilai bisnis (persentase komisi, minimum pencairan, biaya admin)
-- TIDAK di-hardcode di sini: default-nya 0 dan diisi admin lewat
-- menu "Affiliate → Pengaturan Komisi" (lihat src/app/admin/affiliate/pengaturan).
--
-- Idempoten: aman dijalankan ulang (IF NOT EXISTS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. affiliate_settings — konfigurasi program (satu baris, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_settings (
  id integer primary key default 1,
  /** Program affiliate aktif? (affiliate baru tetap bisa daftar, tapi fiturnya ditolak). */
  enabled boolean not null default true,
  /** 'percent' = pakai commission_percent; 'fixed' = pakai fixed_commission per pesanan. */
  commission_mode text not null default 'percent' check (commission_mode in ('percent','fixed')),
  /** Persentase komisi global (0 = belum ditetapkan admin). */
  commission_percent numeric(5,2) not null default 0,
  /** Komisi nominal tetap per pesanan (dipakai saat commission_mode = 'fixed'). */
  fixed_commission integer,
  /** Aturan komisi per produk: {"<product_id>": persen, ...}. */
  product_commission jsonb not null default '{}'::jsonb,
  /** Atribusi referral: 'last_click' = klik terakhir yang menang, 'first_click' = klik pertama. */
  attribution_model text not null default 'last_click' check (attribution_model in ('first_click','last_click')),
  /** Masa berlaku atribusi referral (hari). */
  referral_validity_days integer not null default 30,
  /** Pesanan harus lunas agar komisi dihitung. */
  require_paid boolean not null default true,
  /** Pesanan harus selesai (status 'selesai') agar komisi disetujui. */
  require_completed boolean not null default true,
  /** Masa validasi (hari) sebelum komisi pending menjadi disetujui. */
  validation_days integer not null default 14,
  /** Minimum nominal pengajuan pencairan. */
  min_withdrawal integer not null default 0,
  /** Biaya admin pencairan per metode. */
  withdrawal_fee_bank integer not null default 0,
  withdrawal_fee_ewallet integer not null default 0,
  /** Batal/retur membatalkan komisi (reversal, riwayat tetap tersimpan). */
  reversal_on_cancel boolean not null default true,
  reversal_on_return boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint affiliate_settings_singleton check (id = 1)
);

insert into public.affiliate_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. affiliates — profil mitra affiliate
-- ---------------------------------------------------------------------
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  /** Relasi ke auth.users. NULL = pendaftaran belum menyelesaikan verifikasi email. */
  user_id uuid unique references auth.users(id) on delete cascade,
  /** Kode referral utama (SAM-AF-XXXXX), unik. */
  affiliate_code text not null unique,
  full_name text not null,
  /** Nama tampilan di portal. */
  display_name text,
  email text not null,
  phone text,
  /** menunggu | aktif | ditolak | nonaktif */
  status text not null default 'menunggu' check (status in ('menunggu','aktif','ditolak','nonaktif')),
  reject_reason text,
  terms_accepted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliates_status_idx on public.affiliates (status);
create index if not exists affiliates_email_idx on public.affiliates (email);

-- ---------------------------------------------------------------------
-- 3. affiliate_links — tautan referral per produk/kampanye
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  /** Kode unik pada path /r/<code> */
  code text not null unique,
  product_id text references public.products(id) on delete set null,
  campaign text not null,
  source text,
  note text,
  is_active boolean not null default true,
  click_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_links_affiliate_idx on public.affiliate_links (affiliate_id);

-- ---------------------------------------------------------------------
-- 4. affiliate_clicks — jejak klik referral (analitik)
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_clicks (
  id bigint generated always as identity primary key,
  link_id uuid references public.affiliate_links(id) on delete cascade,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_clicks_affiliate_date_idx on public.affiliate_clicks (affiliate_id, created_at desc);

-- ---------------------------------------------------------------------
-- 5. affiliate_commissions — ledger komisi per pesanan (1 baris per order)
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  /** UNIQUE → otomatis mencegah komisi ganda untuk pesanan yang sama. */
  order_id text not null unique references public.orders(id) on delete cascade,
  order_number text,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  link_id uuid references public.affiliate_links(id) on delete set null,
  /** Dasar perhitungan komisi (nilai produk, TANPA ongkir). */
  base_amount integer not null default 0,
  /** Persentase/nilai yang dipakai saat komisi dihitung. */
  rate numeric(5,2) not null default 0,
  /** Nominal komisi. */
  amount integer not null default 0,
  /** Bagian yang sudah dicairkan (bisa parsial). */
  paid_amount integer not null default 0,
  /** Rincian perhitungan per item pesanan (audit). */
  breakdown jsonb not null default '[]'::jsonb,
  /** menunggu | disetujui | dibayarkan | ditolak */
  status text not null default 'menunggu' check (status in ('menunggu','disetujui','dibayarkan','ditolak')),
  reason text,
  /** Kapan komisi boleh disetujui (setelah masa validasi). */
  available_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_commissions_affiliate_idx on public.affiliate_commissions (affiliate_id, created_at desc);
create index if not exists affiliate_commissions_status_idx on public.affiliate_commissions (status);

-- ---------------------------------------------------------------------
-- 6. affiliate_commission_events — audit trail perubahan komisi
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_commission_events (
  id bigint generated always as identity primary key,
  commission_id uuid not null references public.affiliate_commissions(id) on delete cascade,
  from_status text,
  to_status text,
  amount integer,
  note text,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_commission_events_commission_idx on public.affiliate_commission_events (commission_id, created_at);

-- ---------------------------------------------------------------------
-- 7. affiliate_accounts — rekening/e-wallet tujuan pencairan
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_accounts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  /** 'Transfer Bank' | 'E-wallet' */
  method text not null,
  bank text not null,
  /** Disimpan penuh supaya admin bisa transfer; ke browser hanya masked. */
  account_number text not null,
  account_holder text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_accounts_affiliate_idx on public.affiliate_accounts (affiliate_id);

-- ---------------------------------------------------------------------
-- 8. affiliate_withdrawals — pengajuan pencairan
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_withdrawals (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount integer not null,
  fee integer not null default 0,
  net_amount integer not null,
  method text not null,
  account_id uuid references public.affiliate_accounts(id) on delete set null,
  bank_name text,
  bank_number text,
  bank_holder text,
  /** menunggu | diproses | berhasil | ditolak */
  status text not null default 'menunggu' check (status in ('menunggu','diproses','berhasil','ditolak')),
  reason text,
  /** Bukti pembayaran (transfer manual). */
  proof_url text,
  proof_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_withdrawals_affiliate_idx on public.affiliate_withdrawals (affiliate_id, created_at desc);
create index if not exists affiliate_withdrawals_status_idx on public.affiliate_withdrawals (status);

-- ---------------------------------------------------------------------
-- 9. affiliate_withdrawal_events — audit trail tindakan pencairan
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_withdrawal_events (
  id bigint generated always as identity primary key,
  withdrawal_id uuid not null references public.affiliate_withdrawals(id) on delete cascade,
  from_status text,
  to_status text,
  note text,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_withdrawal_events_withdrawal_idx on public.affiliate_withdrawal_events (withdrawal_id, created_at);

-- ---------------------------------------------------------------------
-- 10. affiliate_products — "Produk Saya" (produk yang dipromosikan)
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_products (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  is_promoted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (affiliate_id, product_id)
);

-- ---------------------------------------------------------------------
-- 11. affiliate_activity_log — audit log aktivitas admin & affiliate
-- ---------------------------------------------------------------------
create table if not exists public.affiliate_activity_log (
  id bigint generated always as identity primary key,
  affiliate_id uuid references public.affiliates(id) on delete cascade,
  actor_type text not null default 'admin',
  actor_id text,
  action text not null,
  from_status text,
  to_status text,
  amount integer,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_activity_log_affiliate_idx on public.affiliate_activity_log (affiliate_id, created_at desc);

-- ---------------------------------------------------------------------
-- 12. orders — kolom atribusi referral (nullable,不影响 data lama)
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists affiliate_id uuid references public.affiliates(id) on delete set null,
  add column if not exists referral_code text,
  add column if not exists referral_link_id uuid,
  add column if not exists referral_attributed_at timestamptz,
  add column if not exists affiliate_commission_amount integer;

create index if not exists orders_affiliate_idx on public.orders (affiliate_id);

-- =====================================================================
-- ROW LEVEL SECURITY
--
-- Affiliate HANYA boleh membaca barisnya sendiri. Semua tulisan (approve,
-- ubah saldo, approve pencairan) tetap lewat service role di server.
-- =====================================================================

alter table public.affiliate_settings enable row level security;
alter table public.affiliates enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_commission_events enable row level security;
alter table public.affiliate_accounts enable row level security;
alter table public.affiliate_withdrawals enable row level security;
alter table public.affiliate_withdrawal_events enable row level security;
alter table public.affiliate_products enable row level security;
alter table public.affiliate_activity_log enable row level security;

drop policy if exists "affiliate read own profile" on public.affiliates;
create policy "affiliate read own profile" on public.affiliates for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "affiliate read own links" on public.affiliate_links;
create policy "affiliate read own links" on public.affiliate_links for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_links.affiliate_id and a.user_id = auth.uid()));

drop policy if exists "affiliate read own clicks" on public.affiliate_clicks;
create policy "affiliate read own clicks" on public.affiliate_clicks for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_clicks.affiliate_id and a.user_id = auth.uid()));

drop policy if exists "affiliate read own commissions" on public.affiliate_commissions;
create policy "affiliate read own commissions" on public.affiliate_commissions for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_commissions.affiliate_id and a.user_id = auth.uid()));

drop policy if exists "affiliate read own commission events" on public.affiliate_commission_events;
create policy "affiliate read own commission events" on public.affiliate_commission_events for select to authenticated
  using (exists (
    select 1 from public.affiliate_commissions c
    join public.affiliates a on a.id = c.affiliate_id
    where c.id = affiliate_commission_events.commission_id and a.user_id = auth.uid()
  ));

drop policy if exists "affiliate read own accounts" on public.affiliate_accounts;
create policy "affiliate read own accounts" on public.affiliate_accounts for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_accounts.affiliate_id and a.user_id = auth.uid()));

drop policy if exists "affiliate read own withdrawals" on public.affiliate_withdrawals;
create policy "affiliate read own withdrawals" on public.affiliate_withdrawals for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_withdrawals.affiliate_id and a.user_id = auth.uid()));

drop policy if exists "affiliate read own withdrawal events" on public.affiliate_withdrawal_events;
create policy "affiliate read own withdrawal events" on public.affiliate_withdrawal_events for select to authenticated
  using (exists (
    select 1 from public.affiliate_withdrawals w
    join public.affiliates a on a.id = w.affiliate_id
    where w.id = affiliate_withdrawal_events.withdrawal_id and a.user_id = auth.uid()
  ));

drop policy if exists "affiliate read own products" on public.affiliate_products;
create policy "affiliate read own products" on public.affiliate_products for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_products.affiliate_id and a.user_id = auth.uid()));

drop policy if exists "affiliate read own activity log" on public.affiliate_activity_log;
create policy "affiliate read own activity log" on public.affiliate_activity_log for select to authenticated
  using (exists (select 1 from public.affiliates a where a.id = affiliate_activity_log.affiliate_id and a.user_id = auth.uid()));
