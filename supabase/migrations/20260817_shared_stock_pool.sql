-- Shared stock pool: derived series (Imron, Bayati, Karim, Imalah) share stock
-- from base products (Jiharkah, Nahawand) instead of each having independent stock.
--
-- How it works:
-- - product_variants gets base_product_id + base_size columns
-- - Base series (Jiharkah, Nahawand): base_product_id = NULL, stock stored directly
-- - Derived series: base_product_id = base product, base_size = mapped size
--   Stock is NOT stored on derived variants (stock = 0)
-- - RPC + display logic resolve to base product when base_product_id is set

-- ── Add columns ──
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS base_product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_size TEXT;

CREATE INDEX IF NOT EXISTS idx_variants_base ON product_variants(base_product_id) WHERE base_product_id IS NOT NULL;

-- ── Updated RPC: resolve base product before decrement ──
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
  v_base_product_id TEXT;
  v_base_size TEXT;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN
    RETURN FALSE;
  END IF;

  -- Check if this variant has a base product (derived series)
  SELECT base_product_id, base_size INTO v_base_product_id, v_base_size
  FROM product_variants
  WHERE product_id = p_product_id AND color = p_color AND size = p_size
  LIMIT 1;

  -- Resolve to base product if linked
  IF v_base_product_id IS NOT NULL AND v_base_size IS NOT NULL THEN
    p_product_id := v_base_product_id;
    p_size := v_base_size;
  END IF;

  -- FOR UPDATE locks the row until transaction completes
  SELECT stock INTO v_stock
  FROM product_variants
  WHERE product_id = p_product_id AND color = p_color AND size = p_size
  FOR UPDATE;

  IF v_stock IS NULL THEN
    -- No variant row → stock not managed → assume available
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

-- ── Updated RPC: resolve base product before restore ──
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
DECLARE
  v_base_product_id TEXT;
  v_base_size TEXT;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN
    RETURN;
  END IF;

  -- Check if this variant has a base product (derived series)
  SELECT base_product_id, base_size INTO v_base_product_id, v_base_size
  FROM product_variants
  WHERE product_id = p_product_id AND color = p_color AND size = p_size
  LIMIT 1;

  -- Resolve to base product if linked
  IF v_base_product_id IS NOT NULL AND v_base_size IS NOT NULL THEN
    p_product_id := v_base_product_id;
    p_size := v_base_size;
  END IF;

  UPDATE product_variants
  SET stock = stock + p_qty
  WHERE product_id = p_product_id AND color = p_color AND size = p_size;
END;
$$;

-- ── Safety: stock cannot go negative ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_stock_non_negative'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT product_variants_stock_non_negative CHECK (stock >= 0);
  END IF;
END $$;

-- ── Access ──
GRANT EXECUTE ON FUNCTION samaqu_decrement_stock(TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION samaqu_restore_stock(TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;
