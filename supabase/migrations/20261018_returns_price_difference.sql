-- Selisih harga Tukar Size (additive).
-- original price = harga yang benar-benar dibayar (order_items.price / harga katalog item asal)
-- replacement price = harga varian ukuran pengganti (price_override ?? products.price)
-- price_difference = (replacement_price - original_price) * qty
--   positif = customer bayar tambahan, negatif = refund ke customer.

alter table public.returns
  add column if not exists price_difference_total integer not null default 0,
  add column if not exists price_difference_status text not null default 'unpaid',
  add column if not exists price_difference_settled_at timestamptz,
  add column if not exists price_difference_method text;

alter table public.return_items
  add column if not exists replacement_price integer not null default 0,
  add column if not exists price_difference integer not null default 0;
