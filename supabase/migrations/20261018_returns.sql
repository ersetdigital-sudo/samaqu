-- Return & Tukar Size — additive only.
-- Tidak mengubah data lama: hanya menambah tabel baru + satu kolom nullable di stock_in.
-- Stok memakai RPC yang sudah ada: samaqu_increment_stock / samaqu_decrement_stock.

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  type text not null check (type in ('tukar_size', 'return')),
  status text not null default 'diajukan' check (status in (
    'diajukan', 'disetujui', 'barang_diterima', 'pengganti_dikirim', 'selesai', 'ditolak', 'dibatalkan'
  )),
  order_id text references public.orders(id) on delete restrict,
  order_number text not null,
  customer_id uuid,
  customer_name text not null,
  customer_whatsapp text,
  reason text,
  notes text,
  shipping_in_awb text,
  shipping_out_awb text,
  jnt_order_id text,
  shipping_in_cost integer not null default 0,
  shipping_out_cost integer not null default 0,
  shipping_payment_status text not null default 'unpaid' check (shipping_payment_status in ('unpaid', 'paid')),
  refund_amount integer not null default 0,
  refund_method text,
  refund_status text,
  stock_applied_at timestamptz,
  stock_reversed_at timestamptz,
  approved_at timestamptz,
  received_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id text not null,
  product_name text not null,
  color text,
  size text not null,
  replacement_size text,
  qty integer not null check (qty > 0),
  price integer not null default 0,
  condition text not null default 'sellable' check (condition in ('sellable', 'damaged')),
  stock_in_applied boolean not null default false,
  stock_out_applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  color text not null default 'default',
  size text not null,
  qty integer not null check (qty > 0),
  direction text not null check (direction in ('in', 'out')),
  source text not null,
  ref_type text,
  ref_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

-- Tautan baris Barang Masuk otomatis ke record retur (untuk pembatalan yang presisi).
alter table public.stock_in add column if not exists ref_return_id uuid;

create index if not exists idx_returns_status_created on public.returns (status, created_at desc);
create index if not exists idx_returns_order_number on public.returns (order_number);
create index if not exists idx_return_items_return on public.return_items (return_id);
create index if not exists idx_stock_movements_lookup on public.stock_movements (product_id, color, size, created_at desc);
create index if not exists idx_stock_movements_ref on public.stock_movements (ref_type, ref_id);
create index if not exists idx_stock_in_ref_return on public.stock_in (ref_return_id);

alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.stock_movements enable row level security;

-- Terapkan stok retur secara atomik:
--   * barang balik (sellable) → size asal +qty + baris Barang Masuk
--   * tukar size → size pengganti -qty
-- Idempoten: kalau stock_applied_at sudah terisi, tidak melakukan apa-apa.
create or replace function public.samaqu_apply_return_stock(p_return_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  r public.returns%rowtype;
  it public.return_items%rowtype;
  v_date date := (now() at time zone 'Asia/Jakarta')::date;
begin
  select * into r from public.returns where id = p_return_id for update;
  if not found then
    raise exception 'Retur tidak ditemukan';
  end if;
  if r.stock_applied_at is not null then
    return jsonb_build_object('ok', true, 'already_applied', true);
  end if;
  if r.status not in ('disetujui', 'barang_diterima') then
    raise exception 'Status retur belum siap menerapkan stok';
  end if;

  for it in select * from public.return_items where return_id = p_return_id loop
    if it.condition = 'sellable' and not it.stock_in_applied then
      perform public.samaqu_increment_stock(
        it.product_id, coalesce(nullif(it.color, ''), 'default'), it.size, it.qty
      );
      insert into public.stock_in (
        date, product_id, product_name, sku, variant_color, variant_size,
        qty, cost_per_unit, notes, source, ref_return_id
      ) values (
        v_date, it.product_id, it.product_name,
        coalesce((select sku from public.products where id = it.product_id), ''),
        coalesce(nullif(it.color, ''), 'default'), it.size,
        it.qty, 0, 'Pengembalian stok - ' || r.return_number, r.type, r.id
      );
      insert into public.stock_movements (
        product_id, color, size, qty, direction, source, ref_type, ref_id, notes
      ) values (
        it.product_id, coalesce(nullif(it.color, ''), 'default'), it.size, it.qty,
        'in', r.type, 'return', r.id, 'Barang balik ' || r.return_number
      );
      update public.return_items set stock_in_applied = true where id = it.id;
    end if;

    if r.type = 'tukar_size' and it.replacement_size is not null and not it.stock_out_applied then
      if not public.samaqu_decrement_stock(
        it.product_id, coalesce(nullif(it.color, ''), 'default'), it.replacement_size, it.qty
      ) then
        raise exception 'Stok ukuran % tidak cukup untuk %', it.replacement_size, it.product_name;
      end if;
      insert into public.stock_movements (
        product_id, color, size, qty, direction, source, ref_type, ref_id, notes
      ) values (
        it.product_id, coalesce(nullif(it.color, ''), 'default'), it.replacement_size, it.qty,
        'out', 'tukar_size', 'return', r.id, 'Pengganti ' || r.return_number
      );
      update public.return_items set stock_out_applied = true where id = it.id;
    end if;
  end loop;

  update public.returns
     set stock_applied_at = now(), stock_reversed_at = null, updated_at = now()
   where id = p_return_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Balik pergerakan stok saat retur dibatalkan (sekali saja).
create or replace function public.samaqu_reverse_return_stock(p_return_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  r public.returns%rowtype;
  it public.return_items%rowtype;
begin
  select * into r from public.returns where id = p_return_id for update;
  if not found then
    raise exception 'Retur tidak ditemukan';
  end if;
  if r.stock_applied_at is null or r.stock_reversed_at is not null then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  for it in select * from public.return_items where return_id = p_return_id loop
    if it.stock_in_applied then
      perform public.samaqu_decrement_stock(
        it.product_id, coalesce(nullif(it.color, ''), 'default'), it.size, it.qty
      );
      insert into public.stock_movements (
        product_id, color, size, qty, direction, source, ref_type, ref_id, notes
      ) values (
        it.product_id, coalesce(nullif(it.color, ''), 'default'), it.size, it.qty,
        'out', r.type, 'return', r.id, 'Pembatalan retur ' || r.return_number
      );
      update public.return_items set stock_in_applied = false where id = it.id;
    end if;

    if it.stock_out_applied and it.replacement_size is not null then
      perform public.samaqu_increment_stock(
        it.product_id, coalesce(nullif(it.color, ''), 'default'), it.replacement_size, it.qty
      );
      insert into public.stock_movements (
        product_id, color, size, qty, direction, source, ref_type, ref_id, notes
      ) values (
        it.product_id, coalesce(nullif(it.color, ''), 'default'), it.replacement_size, it.qty,
        'in', 'tukar_size', 'return', r.id, 'Pembatalan retur ' || r.return_number
      );
      update public.return_items set stock_out_applied = false where id = it.id;
    end if;
  end loop;

  delete from public.stock_in where ref_return_id = p_return_id;

  update public.returns
     set stock_applied_at = null, stock_reversed_at = now(), updated_at = now()
   where id = p_return_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Grant HARUS setelah kedua fungsi dibuat (kalau tidak, migration gagal di DB baru).
-- Fungsi stok hanya boleh dipanggil server (service role), bukan anon/authenticated.
revoke all on function public.samaqu_apply_return_stock(uuid) from public;
revoke all on function public.samaqu_reverse_return_stock(uuid) from public;
grant execute on function public.samaqu_apply_return_stock(uuid) to service_role;
grant execute on function public.samaqu_reverse_return_stock(uuid) to service_role;
