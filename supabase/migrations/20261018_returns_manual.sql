-- Retur manual: pesanan yang belum tercatat di sistem.
-- Alamat disimpan di record retur supaya resi pengganti tetap bisa dibuat
-- tanpa baris `orders`. Additive saja.

alter table public.returns
  add column if not exists shipping_address text,
  add column if not exists shipping_city text,
  add column if not exists shipping_kecamatan text,
  add column if not exists shipping_postal_code text;
