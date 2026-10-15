-- Berat kirim Extra Cover & Hanger (gram) — diatur dari menu admin "Open Order"
-- (komponen `OpenOrderSettingsForm`). Dipakai untuk hitungan ongkir J&T di wizard
-- /open-order dan divalidasi ulang di server (`src/app/api/open-order/route.ts`).
--
-- Nilai kosong/NULL = pakai default 300 g (lihat `DEFAULT_OPEN_ORDER_ADDON_WEIGHT`
-- di `src/lib/open-order-config.ts`).
alter table public.store_settings
  add column if not exists open_order_addon_weight integer;

-- Isi nilai awal untuk baris setting yang sudah ada supaya form admin langsung terisi.
update public.store_settings
  set open_order_addon_weight = 300
  where id = 1 and open_order_addon_weight is null;
