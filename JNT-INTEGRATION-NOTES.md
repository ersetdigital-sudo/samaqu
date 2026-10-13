# J&T API Integration Notes

## Status
- **Production (2026-10-13)**: kredensial diterima & diverifikasi — create order ✅ (resi
  `JO0329847318`), tariff ✅ (Rp68.000), track ✅, cancel/void ✅ (endpoint production).
  Pemilik akan merotasi kredensial.
- **Sandbox**: Active, tested working
- **Mapping**: sebagian jalan — origin Depok = `DPK`; uji order production memakai fallback `JKT` → `MEH`.

## Credentials

Credentials are stored in `.env.local` (not committed). See `.env.local` for actual values.

## Database Migration (Run di Supabase SQL Editor)
```sql
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS shipping_provider TEXT DEFAULT 'rajaongkir';
```

## Testing Results
- **Order API**: ✅ Work (signature fix: base64(hex(md5(data+key))))
- **Tariff Check**: ✅ Work (Jakarta-Kalideres: Rp7.878)
- **Track API**: ✅ Work
- **Cancel API**: ✅ Work
- **Depok**: ❌ Belum ada di sandbox (origin_code salah)

## Yang Perlu Di-Follow-Up ke J&T
1. Kirim `database-lokasi-samaqu.csv` ke Danny di grup
2. Minta 3 kode: origin_code, destination_code, receiver_area
3. Minta production credentials + endpoints
4. Testing Depok di production environment

## File Lokasi
- `database-lokasi-samaqu.csv` — Daftar lokasi buat mapping
- `test-case-results.txt` — Hasil test cases buat docx
- `src/lib/jnt/` — Semua J&T API integration code
- `.env.local` — Credentials (jangan di-push!)

## Signature Format (Penting!)
```typescript
// PHP: base64_encode(md5($data . $key))
// Node.js: base64(hex(md5(data + key)))
const hexHash = createHash("md5").update(data + key).digest("hex");
const signature = Buffer.from(hexHash).toString("base64");
```

## Admin Settings
- Toggle provider: RajaOngkir / J&T API Langsung
- Setting: Admin → Settings → Provider Pengiriman

## Flow
1. Admin pilih "J&T API Langsung" di settings
2. Customer checkout → pilih alamat
3. System call J&T Tariff API → tampilkan ongkir
4. Customer pilih ongkir → buat pesanan
5. Admin verifikasi bayar → **Atur Pesanan** → System call J&T Order API → dapat AWB
6. Customer dapat nomor AWB

## Status pengiriman (revisi 2026-10-14)
Resi terbit ≠ paket dikirim. Alur:
`Perlu Dikirim` → **Atur Pesanan** (resi terbit, `orders.shipping_status='menunggu_pickup'`,
status pesanan tetap `diproses`) → J&T **pemindaian pertama** (`sync-tracking` → `shipping_status='dikirim'`,
`orders.status='dikirim'`) → paket diterima (`status_code=200` → `selesai`).

- Logika transisi: `src/lib/jnt/tracking-sync.ts` (+ `track-status.ts`: `isShipped`/`isDelivered`).
- Riwayat tracking disimpan di tabel `order_tracking_events` (idempoten, `event_key` unik) +
  snapshot di kolom `orders.tracking_*`.
- Sinkronisasi: `GET /api/cron/sync-tracking` (Bearer `CRON_SECRET`) dijadwalkan **cron-job eksternal**
  (tidak ada webhook J&T).
- Tidak ada kode J&T yang di-hardcode: pemindaian pertama apa pun dianggap "Dikirim"; kode tak dikenal
  tetap disimpan mentah tanpa menebak.
- Blocker lama tetap: kredensial Order/Cancel API production masih ditolak → "Atur Pesanan" bisa gagal.
