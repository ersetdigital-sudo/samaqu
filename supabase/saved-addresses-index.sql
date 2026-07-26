-- Partial unique index: only one default address per customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_per_customer
ON saved_addresses (customer_id)
WHERE is_default = true;
