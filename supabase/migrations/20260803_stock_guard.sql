-- Stock guard: atomic decrement/restore untuk cegah oversell & race condition.
-- Dipanggil dari /api/orders via supabase.rpc(). Dijalankan SECURITY DEFINER
-- (owner = postgres) sehingga RLS tidak memblokir, sesuai pola counter Supabase.
-- Aman: operasi hanya menyentuh baris product_variants yang cocok dengan
-- (product_id, color, size) persis, dan tidak bisa membuat stok negatif.

-- ── Decrement stok secara atomik ──
-- Returns TRUE kalau stok cukup (atau varian tidak dikelola → tanpa baris varian).
-- Returns FALSE kalau stok tidak cukup untuk p_qty.
CREATE OR REPLACE FUNCTION samaqu_decrement_stock(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_qty INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN
    RETURN FALSE;
  END IF;

  -- FOR UPDATE mengunci baris sampai transaksi selesai → 2 request bersamaan
  -- tidak bisa sama-sama membaca stok terakhir (race condition tercegah).
  SELECT stock INTO v_stock
  FROM product_variants
  WHERE product_id = p_product_id AND color = p_color AND size = p_size
  FOR UPDATE;

  IF v_stock IS NULL THEN
    -- Tidak ada baris varian → stok tidak dikelola (produk tanpa varian) → anggap tersedia
    RETURN TRUE;
  END IF;

  IF v_stock < p_qty THEN
    RETURN FALSE;
  END IF;

  UPDATE product_variants
  SET stock = v_stock - p_qty
  WHERE product_id = p_product_id AND color = p_color AND size = p_size;

  RETURN TRUE;
END;
$$;

-- ── Restore stok (rollback) kalau order gagal dibuat ──
CREATE OR REPLACE FUNCTION samaqu_restore_stock(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_qty INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN
    RETURN;
  END IF;

  UPDATE product_variants
  SET stock = stock + p_qty
  WHERE product_id = p_product_id AND color = p_color AND size = p_size;
END;
$$;

-- ── Jaring pengaman: stok tidak boleh negatif (meski ada bug di update lain) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_stock_non_negative'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT product_variants_stock_non_negative CHECK (stock >= 0);
  END IF;
END $$;

-- ── Akses ──
GRANT EXECUTE ON FUNCTION samaqu_decrement_stock(TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION samaqu_restore_stock(TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;
