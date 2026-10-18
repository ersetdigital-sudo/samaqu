-- Barang Masuk: stok bersama ala series + simpan batch atomik.
--
-- Jalankan di Supabase sebelum memakai form multi-produk.
-- Tidak mengubah samaqu_decrement_stock / samaqu_restore_stock.

alter table public.stock_in
  add column if not exists request_id text;

-- Satu request boleh punya banyak baris (satu per produk/warna/ukuran), tetapi
-- kombinasi yang sama tidak boleh dobel dalam satu request.
create unique index if not exists stock_in_request_item_uidx
  on public.stock_in (request_id, product_id, variant_color, variant_size)
  where request_id is not null;

-- ── increment: resolve stok bersama ke produk basis ─────────────────────────
-- Sebelumnya fungsi ini hanya update baris yang dikirim. Untuk series turunan
-- (Bayati/Imron → Jiharkah, Imalah/Karim → Nahawand) akibatnya stok masuk ke
-- baris turunan yang tidak dipakai penjualan. Sekarang sama dengan decrement.
create or replace function public.samaqu_increment_stock(
  p_product_id text,
  p_color text,
  p_size text,
  p_qty integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_base_product_id text;
  v_base_size text;
begin
  select base_product_id, base_size
    into v_base_product_id, v_base_size
  from public.product_variants
  where product_id = p_product_id
    and lower(coalesce(color, '')) = lower(coalesce(p_color, ''))
    and lower(coalesce(size, ''))  = lower(coalesce(p_size, ''))
  limit 1;

  if v_base_product_id is not null then
    p_product_id := v_base_product_id;
    p_size := upper(coalesce(v_base_size, p_size));
  end if;

  update public.product_variants
     set stock = coalesce(stock, 0) + p_qty
   where product_id = p_product_id
     and lower(coalesce(color, '')) = lower(coalesce(p_color, ''))
     and lower(coalesce(size, ''))  = lower(coalesce(p_size, ''));

  return found;
end
$$;

-- ── batch barang masuk: satu transaksi ──────────────────────────────────────
-- p_items = [{ product_id, variant_color, variant_size, qty, total_price }]
-- Stok & stock_in selalu ditulis ke produk basis. HPP weighted-average juga
-- ditulis ke produk basis memakai total stok basis sebelum batch.
create or replace function public.samaqu_stock_in_batch(
  p_date date,
  p_items jsonb,
  p_notes text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_index bigint;
  v_item jsonb;
  v_product_id text;
  v_color text;
  v_size text;
  v_qty integer;
  v_total integer;
  v_base_id text;
  v_base_size text;
  v_name text;
  v_sku text;
  v_old_stock numeric;
  v_old_hpp numeric;
  v_new_stock numeric;
  v_new_hpp numeric;
  v_cost numeric;
  v_request text := coalesce(nullif(trim(p_request_id), ''), gen_random_uuid()::text);
  v_count integer := 0;
  v_existing integer;
begin
  if p_date is null then
    raise exception 'Tanggal wajib diisi';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal satu barang masuk';
  end if;

  -- Idempotensi: request yang sama tidak menambah stok/history dua kali.
  if nullif(trim(p_request_id), '') is not null then
    select count(*) into v_existing
    from public.stock_in
    where request_id = p_request_id;
    if v_existing > 0 then
      return jsonb_build_object('ok', true, 'already', true, 'count', v_existing, 'request_id', p_request_id);
    end if;
  end if;

  for v_index, v_item in
    select ordinality, value
    from jsonb_array_elements(p_items) with ordinality
  loop
    v_product_id := nullif(trim(v_item->>'product_id'), '');
    v_color := coalesce(nullif(trim(v_item->>'variant_color'), ''), 'default');
    v_size := upper(nullif(trim(v_item->>'variant_size'), ''));
    v_qty := coalesce((v_item->>'qty')::integer, 0);
    v_total := coalesce((v_item->>'total_price')::integer, 0);

    if v_product_id is null then
      raise exception 'Baris %: produk wajib dipilih', v_index;
    end if;
    if v_size is null then
      raise exception 'Baris %: ukuran wajib dipilih', v_index;
    end if;
    if v_qty <= 0 then
      raise exception 'Baris %: jumlah harus lebih dari 0', v_index;
    end if;
    if v_total <= 0 then
      raise exception 'Baris %: total harga harus lebih dari 0', v_index;
    end if;

    -- Resolusi produk basis: stok bersama ala series.
    select base_product_id, base_size
      into v_base_id, v_base_size
    from public.product_variants
    where product_id = v_product_id
      and lower(coalesce(color, '')) = lower(v_color)
      and lower(coalesce(size, ''))  = lower(v_size)
    limit 1;

    if not found then
      raise exception 'Baris %: varian % ukuran % tidak ditemukan', v_index, v_product_id, v_size;
    end if;

    if v_base_id is not null then
      v_product_id := v_base_id;
      v_size := upper(coalesce(v_base_size, v_size));
    end if;

    select name, sku into v_name, v_sku
    from public.products
    where id = v_product_id;
    if not found then
      raise exception 'Baris %: produk % tidak ditemukan', v_index, v_product_id;
    end if;

    -- Kunci baris stok target supaya update stok tidak balapan.
    perform 1
    from public.product_variants
    where product_id = v_product_id
      and lower(coalesce(color, '')) = lower(v_color)
      and lower(coalesce(size, ''))  = lower(v_size)
    for update;
    if not found then
      raise exception 'Baris %: stok % ukuran % tidak ditemukan', v_index, v_product_id, v_size;
    end if;

    -- Stok efektif pemilik stok (basis) sebelum baris ini.
    select coalesce(sum(stock), 0)
      into v_old_stock
    from public.product_variants
    where product_id = v_product_id;

    select coalesce(hpp, 0)
      into v_old_hpp
    from public.products
    where id = v_product_id;

    v_cost := v_total::numeric / v_qty;
    v_new_stock := v_old_stock + v_qty;
    v_new_hpp := case
      when v_new_stock > 0
        then (v_old_stock * v_old_hpp + v_qty * v_cost) / v_new_stock
      else 0
    end;

    insert into public.stock_in (
      date, product_id, product_name, sku, variant_color, variant_size,
      qty, cost_per_unit, notes, source, request_id
    ) values (
      p_date, v_product_id, v_name, v_sku, v_color, v_size,
      v_qty, round(v_cost)::integer, p_notes, 'manual', v_request
    );

    update public.product_variants
       set stock = coalesce(stock, 0) + v_qty
     where product_id = v_product_id
       and lower(coalesce(color, '')) = lower(v_color)
       and lower(coalesce(size, ''))  = lower(v_size);

    -- HPP mengikuti produk pemilik stok (induk), bukan baris turunan.
    update public.products
       set hpp = round(v_new_hpp)::integer
     where id = v_product_id;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'already', false, 'count', v_count, 'request_id', v_request);
end
$$;

revoke all on function public.samaqu_increment_stock(text, text, text, integer) from public;
grant execute on function public.samaqu_increment_stock(text, text, text, integer) to service_role;

revoke all on function public.samaqu_stock_in_batch(date, jsonb, text, text) from public;
grant execute on function public.samaqu_stock_in_batch(date, jsonb, text, text) to service_role;
