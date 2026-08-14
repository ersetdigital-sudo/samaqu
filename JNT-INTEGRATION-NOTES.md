# J&T API Integration Notes

## Status
- **Sandbox**: Active, tested working
- **Production**: Menunggu credentials dari J&T
- **Mapping**: Menunggu J&T kasih kode (origin_code, destination_code, receiver_area)

## Credentials (Testing/Sandbox)
```
JNT_ENV=testing
JNT_ORDER_USERNAME=WITHSAMAQU-DPK01C
JNT_ORDER_API_KEY=6OPU1W
JNT_ORDER_KEY=AKe62df84bJ3d8e4b1hea2R45j11klsb
JNT_TARIFF_KEY=jZ3N1eqgSVmn
JNT_TARIFF_CUS_NAME=WITHSAMAQU-DPK01C
JNT_TRACK_USERNAME=WITHSAMAQU-DPK01C
JNT_TRACK_PASSWORD=jZ3N1eqgSVmn
JNT_COMPANY_ID=WITHSAMAQU-DPK01C
```

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
5. System call J&T Order API → dapet AWB
6. Customer dapat nomor AWB
