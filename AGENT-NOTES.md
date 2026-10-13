# CATATAN UNTUK AGENT BERIKUTNYA — SAMAQU

Dokumen ini biar agent berikutnya (atau developer baru) tidak bingung: apa yang sudah dibangun,
di mana letaknya, aturan yang harus dipatuhi, dan jebakan teknis yang sudah pernah kena.

> **Token/akses rahasia TIDAK ada di file ini** (biar aman kalau repo-nya publik).
> Semua token (Supabase PAT, Vercel, Base44, dsb) ada di **`.agent-secrets.local.md`** di root repo —
> file itu sudah di-`.gitignore`, jangan pernah di-commit dan jangan ditempel ke chat.

---

## 1. Gambaran besar

- **Website brand** `www.samaqu.id` — Next.js App Router + Supabase + Cloudinary, deploy di Vercel.
  Tema **monokrom** (hitam/putih/abu). Warna semantik yang tetap dipakai: merah untuk `Dibatalkan`,
  hijau untuk WhatsApp.
- **Dashboard internal (ops)** `office.samaqu.id` (juga bisa `samaqu.id/ops`) — shell-nya di
  `src/components/ops/OpsShell.tsx` + `src/app/ops/**`. Ini pengganti app Base44 (Base44 **sudah
  tidak dipakai**). Datanya satu sumber: Supabase yang sama dengan website.
  Ada 3 hal berbeda yang sama-sama bernama "Base44" — jangan ketuker:
  **(a) platform/sandbox** tempat repo ini dijalankan & di-preview (`docker-compose.base44.yml`,
  `.base44/env.defaults`, `/run/base44/app.env`) — ini infra, bukan koneksi aplikasi;
  **(b) app Base44 lama** = dashboard ops versi sebelumnya, sekarang cuma jadi **referensi desain**;
  **(c) nama shim** `base44` di `src/lib/ops-api.ts` — murni penamaan internal supaya halaman hasil
  port tidak perlu diubah; tidak ada SDK/env/endpoint Base44 (semua `fetch` ke `/api/ops/*`).
- **Dashboard admin website** (`/admin`) — punya tema sendiri (`#admin-root`), **jangan diubah**
  kalau tidak diminta.

Prioritas user: dashboard internal **harus mirip/identik** dengan app Base44 (light mode, biru),
dan setiap fitur **harus benar-benar berfungsi** (jangan tombol pajangan, jangan data palsu).

---

## 2. Struktur penting

| Bagian | Lokasi |
|---|---|
| Shell/sidebar/login ops | `src/components/ops/OpsShell.tsx` |
| Footer ops ("© 2026 SAMAQU OFFICE · Engineered by Surya") | `src/components/ops/OpsFooter.tsx` |
| Tema ops (scoped, biar website tidak kena) | `src/app/ops/ops.css` |
| Halaman ops | `src/app/ops/**` (leads, follow-up, master-produk, leads/laporan, rekap-pembelian) |
| API ops | `src/app/api/ops/**` (leads, followups, products, product-variants, stock-in, transactions) |
| Auth ops | `src/lib/ops-auth.ts` (Supabase session + tabel `admins`, hasil di-cache 5 menit) |
| Aturan bisnis follow-up (WIB, status, outcome) | `src/lib/ops-followup.ts` |
| Shim data-layer ala Base44 (`base44.entities.X.list()`) | `src/lib/ops-api.ts` — ini **API kita sendiri**, bukan Base44 |
| Resolusi **stok bersama ala series** (`base_product_id`) | `src/lib/ops-stock.ts` (`resolveStock`) — dipakai bersama oleh `/api/ops/products`, `/api/ops/product-variants`, `/api/ops/dashboard` |
| Logo resmi | `public/logo.svg` (wordmark, rasio 2560×853) |

### Tabel database utama

- `leads` — data lead + kolom follow-up: `pic`, `produk`, `last_contact_at`, `next_followup_at`,
  `followup_status` (`baru`/`dijadwalkan`/`selesai`/`lost`/`dnd`), `outcome`, `note_followup`,
  `lost_reason`, `do_not_contact`.
- `lead_activities` — timeline follow-up; unik `(lead_id, request_id)` untuk anti duplikat.
- `products`, `product_variants` (stok per warna × ukuran; `base_product_id` = baris menumpang
  stok produk basis), `jenis_kain` (master jenis kain; relasi `products.jenis_kain_id` — kolom lama
  `products.kain` sudah tidak dipakai), `stock_in` (barang masuk),
  `orders` + `order_items` (penjualan website, status order bahasa Indonesia: `selesai`,
  `dibatalkan`, `diproses`, `pending`), `admins` (wajib: `user_id`, `email`, `role`).

---

## 3. Aturan yang sudah ditetapkan user (jangan dilanggar tanpa diminta)

1. **Bahasa & gaya**: UI berbahasa Indonesia, gaya dashboard biru/ungu (Base44-like). Tab aktif
   **solid** (bukan gradient) di halaman Produk & Follow-up.
2. **Timezone**: perhitungan "hari ini"/"terlambat" pakai **WIB di server**, bukan timezone browser.
3. **Follow-up Center**: jangan pernah menulis "pesan terkirim" (belum ada integrasi WA resmi),
   jangan auto-complete tugas hanya karena WhatsApp dibuka, jangan auto-buat order.
4. **Angka harus dari data asli**. Kalau data kosong (mis. `stock_in` masih 0 baris), tampilkan 0
   apa adanya — jangan diisi contoh.
5. **Jangan update data massal tanpa izin** (mis. 474 lead lama sengaja belum dijadwalkan).
6. **/ops light mode only**, dan tema website tidak boleh ketularan.

---

## 4. Jebakan teknis yang sudah pernah kejadian (baca sebelum ngoding)

1. **Halaman /ops memakai `initialData: []` + React Query.**
   QueryClient di `OpsShell.tsx` **wajib** tetap memasang `initialDataUpdatedAt: 0`.
   Kalau tidak, array kosong dianggap data segar (`staleTime`), query tidak jalan, dan **semua
   tabel tampil kosong** (ini pernah kejadian dan bikin panik).
2. **PowerShell 5.1 membaca `.ps1` sebagai Windows-1252.** Jangan tulis karakter non-ASCII
   (em dash, `·`, `–`) di dalam skrip `.ps1` — bikin parse error. Kalau perlu kirim teks non-ASCII,
   tulis blok-nya lewat file UTF-8 terpisah lalu dibaca `[IO.File]::ReadAllText(..., UTF8)`.
3. **Edit file besar (`src/app/ops/master-produk/page.jsx`, ±1.800 baris) hati-hati.**
   Pola yang aman: cari anchor unik → hitung batas blok → ganti lewat skrip → **verifikasi** hasilnya.
   Pernah satu kali anchor `) : (` salah tangkap dan menghapus blok besar — pemulihannya:
   `git checkout -- <file>` (working tree bersih = aman, karena semua perubahan sudah di-commit).
   Setelah edit besar: jalankan `git diff --stat` dan cek nama-nama komponen penting masih ada.
4. **Build bisa lama / timeout.** Jalankan `npx tsc --noEmit && npm run build` sebagai background
   task (tool `shell_command` dengan `run_in_background: true`), lalu tunggu hasilnya — jangan
   tunggu di foreground dengan timeout pendek.
5. **Deploy Vercel**: cek statusnya via REST API (lihat `.agent-secrets.local.md`). Kadang
   `git_info_fail` → cukup redeploy.
6. **Region**: function Vercel dipatok `bom1` (`vercel.json` + setting project) supaya dekat dengan
   database Supabase (`ap-south-1`/Mumbai). Sebelum ini function di `iad1` (Washington) dan tiap
   request API 1,4–2,7 detik. **Jangan ubah region tanpa mengukur latency** (script pola pengukuran
   ada di riwayat kerja: ukur `npx`/Invoke-RestMethod ke `/api/ops/*` 3x, ambil rata-rata).
7. **Menguji API /ops**: butuh token admin Supabase (dibuat sementara, lalu dihapus) — caranya ada di
   `.agent-secrets.local.md`. Setelah uji, **pulihkan data produksi** dan laporkan kondisi akhir.
8. **"Stok bersama ala series" — pakai satu resolver, jangan hitung stok mentah sendiri.**
   Baris `product_variants` yang punya `base_product_id` **tidak memegang stok**; angkanya hidup di
   produk basisnya (40 dari 61 produk di DB adalah seri turunan). Resolusinya di
   `src/lib/ops-stock.ts` (`resolveStock`). Kalau pakai `sumStock(v.stock)` mentah, seri turunan
   terbaca 0 → dulu Laporan Stok bilang "41 varian habis" padahal 40 cuma menumpang stok basis.
   Keterangan di UI memakai **nama series** ("Bayati mengikuti Jiharkah"), sama seperti panel admin
   — **bukan** nama produk, karena satu nama produk dipakai banyak series.
9. **Barang Masuk: stok dinaikkan di SERVER, jangan tulis ulang dari klien.**
   `POST /api/ops/stock-in` sudah menaikkan `product_variants.stock` lewat RPC
   `samaqu_increment_stock` (termasuk resolve ke produk basis); form hanya membuat baris `stock_in`.
   Dulu form ikut menulis lewat `base44.entities.ProductVariant.update` yang **tidak ada** di shim,
   jadi simpan *selalu* gagal dengan pesan palsu `"ProductVariant.update is not a function"`
   padahal stoknya sudah tersimpan. Juga: HPP weighted-average wajib dibulatkan (`Math.round`)
   karena `products.hpp` bertipe **integer** (pecahan ditolak: `invalid input syntax for type integer`).
10. **`pending` = belum bayar, BUKAN penjualan.** Stok **tetap dipotong** saat order dibuat
   (checkout website `SMQ-` maupun Open Order `CYO-` → RPC `samaqu_decrement_stock` +
   `orders.stock_reserved = true`; dilepas lagi oleh `/api/cron/auto-cancel` setelah 24 jam —
   ini sengaja, untuk cegah oversell). Tapi angka penjualan hanya dari `diproses`/`selesai`:
   lihat `PAID_ORDER_STATUS` di `src/app/api/ops/dashboard/route.ts`. Di `/api/ops/transactions`
   status barisnya `return` (batal) / `pending` (belum bayar) / `completed` (lunas).
   Catatan: pengembalian stok saat batal ditentukan kolom `orders.stock_reserved`, **bukan**
   awalan nomor pesanan (`src/lib/cancel-order.ts`).

---

## 5. Kondisi data yang perlu diketahui (kalau bikin fitur baru)

- `stock_in` **masih 0 baris** → semua KPI "Barang Masuk" bernilai 0 (bukan bug). Form Barang
  Masuk **sudah berfungsi** (stok naik lewat RPC di server — lihat jebakan #9); kalau diuji, hapus
  lagi baris `stock_in`-nya dan kembalikan stok.
- `products.hpp` masih **0** di semua produk (HPP belum diisi) → margin/nilai stok ikut 0.
- `products.kain` (kolom LAMA) **kosong di semua produk** — jangan dipakai. Sumber jenis kain
  sekarang relasi `products.jenis_kain_id` → tabel `jenis_kain` (5 baris: `B-01`, `B-02`, `A-02`,
  `C.01`, `B02`), terisi di **61/61** produk; di ops tampil sebagai kolom "Jenis Kain".
  `products.series` terisi di **60 dari 61** produk (kecuali `Kandora Superblack`) → kalau kosong
  tampilkan "Belum diatur", jangan dikarang.
- **474 lead lama** belum punya `next_followup_at` → mereka ada di antrean "Perlu Dijadwalkan".
  User belum memutuskan mau jadwalkan massal atau tidak.
- Tab **Barang Keluar** mengambil **semua** baris order supaya sama dengan tabel di bawahnya;
  baris batal diberi badge "Batal", belum bayar diberi badge "Belum bayar". Angka card-nya ikut
  menghitung keduanya (stok memang berkurang), sedangkan **angka penjualan** (omset/HPP/laba/
  terlaris di dashboard, Produk Terlaris, riwayat penjualan detail produk) **hanya dari yang lunas**.
  User belum memutuskan apakah batal/belum bayar mau dikeluarkan juga dari card Barang Keluar.
- **Sisa 1 URL gambar lama** Base44 di `src/components/akun/RincianPesanan.tsx` (bukan koneksi data).

---

## 6. Alur kerja yang biasa dipakai di repo ini

1. Edit kode → `npx tsc --noEmit` (0 error) → `npm run build` (background, tunggu exit 0).
2. `git add -A` → commit (pesan bahasa Indonesia, akhiri trailer
   `Co-authored-by: CommandCodeBot <noreply@commandcode.ai>`) → `git push origin HEAD`.
3. Tunggu deploy READY (poll REST API) → **verifikasi di bundle produksi** (fetch chunk JS lalu
   cari string/kelas baru) atau lewat API untuk data.
4. Kalau mengubah data saat uji: pulihkan, lalu laporkan kondisi akhir data.

---

## 7. Yang belum dikerjakan (kandidat lanjutan)

- Modul ops yang masih "SOON": Dashboard, Transaksi, Return, Pengeluaran, Target Profit, Laporan.
- Template pesan WhatsApp + tombol "Salin Pesan" (butuh tabel `wa_templates`).
- Upload/assign PIC dari UI di halaman Leads (API `set_pic` sudah ada).
- Isi `products.hpp` (butuh data) dan `stock_in` (butuh input barang masuk dari produksi).
- Keputusan user yang masih menggantung: penjadwalan 474 lead lama, apakah batal/belum bayar
  dikeluarkan dari card Barang Keluar, dan apakah card tab Daftar Produk/Barang Masuk/Keluar mau
  diseragamkan jadi putih semua.
- **Buang shim `base44`** di `/ops` (ganti nama `base44` → mis. `opsApi`, atau panggil `/api/ops/*`
  langsung dari 11 berkas pemakai) — user minta ditunda. Konsep/klarifikasi Base44 ada di bagian 1.
- **Kebijakan belum bayar**: sekarang stok dipotong saat order dibuat. Kalau user mau stok baru
  dipotong saat dibayar, pindahkan `samaqu_decrement_stock` dari `/api/orders` + `/api/open-order`
  ke saat status jadi `diproses`, lalu sesuaikan `PAID_ORDER_STATUS`.
