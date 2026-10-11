-- Jam pembatalan pesanan yang akurat (`orders.cancelled_at`).
--
-- Sebelumnya jam pembatalan menumpang `updated_at`, padahal tabel `orders` tidak punya trigger
-- yang mengisinya: baris lama masih menyimpan `updated_at` = `created_at` persis, jadi jam
-- batalnya tidak pernah tersimpan dan hanya bisa ditampilkan sebagai "(perkiraan)"
-- (lihat `waktuBatal` di src/lib/akun-format.ts). Sejak kolom ini ada, `cancelOrderCompletely()`
-- (customer, admin, cron auto-cancel) menulis jam batal yang sebenarnya ke sini.
--
-- Jalankan manual di SQL Editor Supabase (sandbox tidak punya jalur DDL). Kode tetap jalan
-- sebelum SQL ini dijalankan: update pembatalan mengulang dirinya tanpa kolom `cancelled_at`,
-- hanya saja linimasa masih memakai `updated_at` seperti sebelumnya.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.cancelled_at IS
  'Jam pesanan benar-benar dibatalkan (diisi cancelOrderCompletely). NULL = dibatalkan sebelum kolom ini ada.';

-- Backfill: pesanan yang dibatalkan setelah ketiga jalur pembatalan mulai menulis `updated_at`
-- sendiri menyimpan jam batalnya yang sebenarnya di kolom itu — nilai yang berbeda dari
-- `created_at` adalah jam pembatalannya, persis nilai yang selama ini dipakai `waktuBatal`.
-- Baris dengan `updated_at` = `created_at` sengaja dibiarkan NULL: jam batalnya memang tidak
-- pernah tersimpan, dan menyalin jam pembuatan akan terbaca seperti jam batal yang pasti.
UPDATE orders
   SET cancelled_at = updated_at
 WHERE status = 'dibatalkan'
   AND cancelled_at IS NULL
   AND updated_at IS NOT NULL
   AND updated_at <> created_at;
