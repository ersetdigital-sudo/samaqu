-- Penanda refund benar-benar sudah dibayar/dikembalikan.
-- Retur selesai != refund selesai: status retur hanya proses barang,
-- refund_settled_at menandai uangnya sudah keluar.

alter table public.returns
  add column if not exists refund_settled_at timestamptz;
