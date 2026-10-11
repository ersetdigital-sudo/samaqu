# AGENTS.md — running this repo in the Base44 sandbox

Notes that are not obvious from the manifests.

## What this app is

Next.js 16 (App Router, Turbopack dev) + next-intl + Tailwind 4. All data lives in a
**hosted Supabase project** — there is no local database, ORM, or migration runner in
this setup. `supabase/*.sql` files are applied manually against the hosted project.

`src/lib/supabase.ts` creates the Supabase client at **module scope**, so
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be non-empty or the
whole bundle fails to load. `SUPABASE_SERVICE_ROLE_KEY` is needed at request time by
`src/lib/supabase-admin.ts` (admin/order/cron API routes).

## Run it

```bash
docker compose -f docker-compose.base44.yml up -d --build
docker compose -f docker-compose.base44.yml logs -f web
```

- Only one service (`web`): `node:22`, repo bind-mounted at `/app`, `next dev` on
  `0.0.0.0:3000`, healthcheck probing `http://127.0.0.1:3000/`.
- Dependencies install **inside the container on startup** into the bind-mounted
  `node_modules`, stamped with `node_modules/.base44-lock` (compared against
  `package-lock.json`). Change `package.json`/`package-lock.json` → the next container
  start re-syncs automatically. To force it: `docker compose ... exec web sh -c 'rm node_modules/.base44-lock'` then restart.
- `npm ci` in the repo originally failed (`@swc/helpers` missing from the lockfile);
  `package-lock.json` was regenerated with `npm install` to match `package.json`.
  Re-run `npm install` if the lock ever drifts again.

## Environment / secrets

- `.base44/env.defaults` holds **placeholders** so the app boots before credentials
  exist; it is loaded first in `env_file`.
- Real values come from the platform secret file `/run/base44/app.env`, loaded **last**,
  so they always override the placeholders. Never move a user-supplied key into
  compose `environment:`, and never write secret values into the repo.
- Supabase keys are **required for a meaningful preview**: with placeholders the site
  shell renders (home page falls back to static data) but the catalog (`/katalog`),
  accounts, cart/checkout, orders and admin panel query an unreachable project and come
  up empty. `/katalog` has **no** static fallback — an empty product list is the sign
  the Supabase credentials are missing/wrong.
- Optional integrations that degrade silently when unset: Cloudinary (admin image
  upload), RajaOngkir (shipping cost), J&T Express (tariff/order/track), Meta Pixel.

## Media backup (Cloudinary originals)

The Cloudinary account that hosted most media is no longer accessible (its API key/secret
are unknown), so admin image upload is dead while delivery URLs keep working. Copies of
every reachable original live in the Supabase project's **public** Storage bucket
`media-backup` (`image/…`, `video/…`, plus `_manifest.json` mapping original URL →
bucket path → table). Re-run a backup with the Supabase REST + Storage APIs
(`/rest/v1/<table>` to find URLs, strip the Cloudinary transform segment to get the
original, then POST `/storage/v1/object/media-backup/<path>`); one-off scripts belong in
`/tmp`, never in the repo. ~64 older URLs on the clouds `dgtixuop0` / `dfxc4ceya` return
401 at source (testimonials, category/`katalog_info`/`size_guide` images, old order
items) — unfixable without those accounts; product main images are all intact.

Those dead references were cleaned up on request: 22 gallery rows deleted
(`category_images` 6, `katalog_info_images` 6, `bio_carousel_images` 5,
`size_guide_images` 5), `testimonials.image_url`/`video_url` and
`order_items.product_image` emptied (14 + 36 rows), and `garansi_retur_page` hero/CTA
pointed back at the local `/garansi/*.png` assets. The deleted rows are recoverable from
`_deleted-refs-snapshot.json` in the same bucket.
- The home "Koleksi" grid has static `FALLBACK_CATEGORIES` in
  `src/components/Koleksi.tsx` and uses DB rows only when they exist, so deleting
  `category_images` falls back to `public/images/*.png` rather than an empty section.

## Static assets under public/

`src/middleware.ts` runs the next-intl locale redirect for every path except the
prefixes listed in its `matcher`, so **each folder in `public/` must be listed there**.
`/garansi/*` was missing: `/garansi/hero-web.png` was redirected to
`/id/garansi/hero-web.png` → 404, which is why the garansi page's own default images
never loaded. Exclude with a trailing slash (`garansi/`) so bare `/<folder>` routes that
start with the same word — `/garansi-retur` must still redirect to `/id/garansi-retur` —
keep working.

## Sandbox-only overrides

- `next.config.ts` appends `allowedDevOrigins: ['3000-' + BASE44_PUBLIC_HOST_SUFFIX]`
  **only when `BASE44_PREVIEW_MODE === '1'`**, because the preview proxies the dev
  server through a different origin and Next otherwise rejects cross-origin dev
  asset/HMR requests (403). Unset/none → identical config to upstream.
  Verify: a `GET` on a `/_next/static/chunks/...` URL with
  `Origin: https://3000-$BASE44_PUBLIC_HOST_SUFFIX` must return 200.

## i18n layout (root vs locale)

`src/app/layout.tsx` is the App Router root layout: it renders `<html>`/`<body>` (fonts,
metadata, JSON-LD) and wraps children in `<Providers>`. `src/app/[locale]/layout.tsx` must
therefore **not** render it again — it only mounts `NextIntlClientProvider` around `children`.

Rendering `<RootLayout>` from the locale layout nests `<html>` inside `<body>` (browser
hydration error) and mounts every provider twice (cart, toast, locale, and — the visible one —
`MetaPixelProvider`, i.e. a duplicate pageview). The root layout has to keep the html shell
because top-level `/admin` (excluded from the locale middleware) also renders under it. Verify
a change here by counting tags in the SSR output: `curl -s .../id/open-order | grep -c '<html'`
must be `1`.

## Rich text messages (i18n)

next-intl 4 treats `<tag>` inside a message as ICU rich text. Reading such a message with
plain `t()` throws and falls back to the raw key (logged as `FORMATTING_ERROR` /
`INVALID_MESSAGE`), which is how the home, about and Sama Quran pages ended up rendering
key names. Rules that now hold:

- HTML in a message must use **closed** ICU tags — `<br></br>`, `<span>…</span>`. A
  self-closing `<br/>` is passed through as literal text, and tag **attributes** are
  rejected outright (`INVALID_TAG`), so styling is re-applied by the handler.
- Read such a message with `t.markup(key, { tag: (chunks) => "<tag>…</tag>" })`; it returns a
  string for `dangerouslySetInnerHTML`. Sites: `CaraPemesanan` (`subtitleLead` + `subtitle`),
  `SamaQuran` (`perjalananTitle`, `values.*`), both `tentang-kami` pages (`storyP1`).
- `useSafeTranslations`' no-provider fallback mirrors `markup`/`rich`/`raw`, so callers keep
  working (and type-checking) when `NextIntlClientProvider` isn't mounted.

## Verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' -L http://localhost:3000/     # expect 200 (redirects to /id)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/id/katalog # expect 200, and product cards in the browser
# If a route that just worked starts returning 404 right after the container is
# recreated, the bind-mounted .next Turbopack cache has gone stale — `docker compose
# -f docker-compose.base44.yml restart web` restores it (no code change needed).
docker compose -f docker-compose.base44.yml ps                          # web must be (healthy)
```

## Open Order (alur pesanan Create Your Price)

The old Google Form ("OPEN ORDER SAMAQU — Create Your Price") is now a **6-step wizard** on
**/open-order**: daftar produk → detail produk → keranjang → data pemesan → review → pesanan
berhasil, all inside one client component (`src/app/[locale]/(customer)/open-order/page.tsx` is
a thin wrapper around `src/components/open-order/OpenOrderWizard.tsx`). The wizard owns all the
state (cart lines, product draft, customer data, J&T ongkir, submit) and renders one focused
component per step: `StepCatalog`, `StepProduct`, `StepCart`, `StepCustomer`, `StepReview`,
`StepSuccess`, plus the `ui.tsx` primitives and `types.ts`. `OpenOrderForm.tsx` and
`OpenOrderProducts.tsx` were deleted — do not resurrect them.

Presentation follows the **katalog** look (cream `--cream`, espresso `--espresso`, gold `--gold`,
Cormorant serif headings) — on request the wizard was switched off the earlier monochrome style.
The palette lives once in `src/components/open-order/ui.tsx` (`INK`/`MUTED`/`LINE`/`FIELD_BG`/`GOLD`,
plus `Chip`, `Counter`, `PrimaryButton`, …), so a colour change belongs there, not in each step;
step components pass those tokens via inline styles. `StepCatalog` cards mirror the katalog
`ProductCard` (cream-bright card, 3/4 image, serif name, gold "Kain …", outlined "Lihat Detail"
button) and `StepProduct` mirrors the katalog detail page (gold "Detail Produk" eyebrow, serif
title, "Pilih Series / Warna / Ukuran" chip rows, cream "Harga Minimum" card). Indonesian copy is
hardcoded inside the step components and is not part of the i18n flow (the now-unused `openOrder`
keys are still in `src/i18n/messages/{id,en}.json`).

The offering — which kain are sold, their ready-stock colors, the series names and the minimum
price per series — is **derived from the catalog `products` table**, not written by hand.
`src/lib/open-order-offering.ts` → `buildOpenOrderProducts(rows)` groups Thobe rows by their
`jenis_kain` code and takes each row's color from the product name (`"Thobe Navy"` → `Navy`), its
`series`, and its `minimum_price` as the Create-Your-Price floor (fallback `price`); one catalog
row is one kain × warna × series combination, so changing a price or adding a color in the
catalog is enough — no code edit. Scope is `category === "Thobe"`. The input type
`OpenOrderCatalogRow` is structural, so the same function serves the client (from `getProducts()`,
which embeds `jenis_kain(*)`) and the API route (admin client, same embed).

Only what is not catalog data stays static in `src/lib/open-order-config.ts`: `OPEN_ORDER_PERIOD`,
the `OPEN_ORDER_ADDON` (Cover & Hanger) price/weight, and `OPEN_ORDER_SIZES` (S–XXL, the size list
the wizard offers and the API validates against — these `products` rows carry no sizes). A derived
product's shipping `weight` comes from the catalog rows too. Client prices are never trusted (see
the API notes below). `src/lib/open-order-catalog.ts` holds the shared display helpers: `money`,
series price tiers, catalog photo matching, and `openOrderVariants(products, catalog)` — one card
per derived product × ready-stock color, which is what the step-1 grid renders.

Step 2 (detail produk) shows the **real catalog photos**, not the single thumbnail: `catalogProductFor`
+ `openOrderGallery` look up the `products` row for the selected **kain + warna + series** (in the live
DB each row *is* one warna × series combination, e.g. `thobe-navy-bayati`, with its own `images`
array) and render that row's photos in the catalog's order — same photos as the catalog detail
gallery, minus the videos (videos are filtered out; `getProductThumbnail`/`openOrderImage` still feed
the small card/cart thumbnails). Switching a warna or series chip swaps the gallery and resets it to
the first photo.

Submissions POST to **`/api/open-order`** (`src/app/api/open-order/route.ts`; the `[locale]/api`
copy is the dead duplicate — the live API is the one under `src/app/api/`). The route re-reads
`products` (+ `jenis_kain`) with the admin client, rebuilds the offering via
`buildOpenOrderProducts()` and re-validates product/series/color/quantity and the price floor
against it (client prices are never trusted), then writes ordinary rows into
**`orders` + `order_items`**, so they appear in the
existing admin dashboard (`/[locale]/admin`, "Pesanan" tab) with the normal status flow:

- `order_number` uses the prefix **`CYO-`** (`SMQ-` = website checkout) — that is how the two
  kinds of order are told apart in the admin list,
- `shipping_method` = `J&T - <service>` and `shipping_cost` = the J&T tariff for the customer's
  kecamatan (see the ongkir note below); it falls back to `manual` / 0 when kecamatan is empty
  or the J&T call fails, and then the admin arranges shipping later,
- `payment_method` `bank` (legacy value, renders as "Transfer Bank"),
- `status` `pending`, and `shipping_notes` = `IG @username · <customer note>` (each part only
  when filled) — the admin order detail renders that as "Catatan", which is where the Instagram
  handle is read. The wizard no longer asks for Instagram (the reference flow has no such
  field), so `instagram` is **optional** in the route and `shipping_notes` holds just the
  customer note,
- `shipping_postal_code` is filled from the wizard's "Kode Pos" field (the orders table already
  had the column),
- `order_items.size` comes from the wizard's size chips and is validated against
  `OPEN_ORDER_SIZES` — it used to be hardcoded `null`,
- **Create Your Price**: the wizard's detail step sends the customer's chosen `price` per item.
  The route clamps it to the selected series' catalog minimum price (`price = max(series.price, client price)`,
  so a client can never go below the minimum) and stores `price` + `customer_price` = that
  value with `minimum_price` = the series price — exactly the pair the admin order detail
  already renders as `Min: … · Dipilih: …`. The add-on row keeps both columns `null`. Anything
  else about product/series/color/quantity is still re-derived from the config,
- the Cover & Hanger add-on is one extra `order_items` row (`product_id` `addon-cover-hanger`),
  toggled in step 3 (keranjang) — the wizard has no add-on page section.

Ongkir (J&T shipping): the form asks for **Kecamatan**; once ~3+ chars are typed the client
debounces 1s and POSTs `{ city, district, weight }` to **`/api/shipping/jnt-cost`** (the same
J&T Tariff API the checkout uses, via `src/lib/jnt/*`), keeps the cheapest service and shows it
as the `Ongkir` line that feeds the bottom `Total`. Weight counts the current lines at each
product's catalog `weight` × qty, plus 300 g for the Cover & Hanger add-on, min 300 g. The picked method/cost ride
along in the POST body as `shipping: { method, cost }`; `/api/open-order` does **not** re-verify
the tariff (same trust model as `/api/orders`) — it only clamps the cost to ≥ 0 and folds it into
`total`. J&T credentials are **required for a price**: `JNT_TARIFF_KEY` + `JNT_TARIFF_CUS_NAME`,
and the route also gates on `JNT_ORDER_USERNAME`. Without them the route answers **200** with
`{ data: [], configured: false, error: "J&T API belum dikonfigurasi" }` — a missing credential is a
normal state, not a server failure, so the log stays free of a 500 (and of one `console.error` per
keystroke) while the `error` field is kept so the checkout callers behave exactly as before; the route
logs a single `console.warn` per process. `OpenOrderWizard` detects `configured: false` and shows the
fallback message with the ongkir line at `—` without a `console.error` (the order still submits,
admin prices shipping later) — that is the state of this sandbox: no J&T credential is stored, so
live tariffs stay off until credentials are supplied — sekarang admin bisa mengisinya sendiri lewat
form di Pengaturan (lihat "Kredensial J&T Express (form admin)" di bawah). Nilai J&T **testing**
yang dulu dipakai app ini ada di commit `e48a6fe`; nilai asli tidak boleh masuk repo. `JNT_ENV`
defaults to `testing`, dipakai selama kolom `env` di `jnt_settings` masih kosong.

No new table: the hosted Supabase project has **no DDL path** from the sandbox, so a new table
would have needed the user to run SQL by hand. Verified dead ends with the stored credentials:
`SUPABASE_SERVICE_ROLE_KEY` **cannot** run DDL — `/pg/query` and `/pg/meta/query` are 404
("requested path is invalid") and there is no `exec_sql` RPC (`PGRST202`), and PostgREST offers
no DDL verb at all. Running SQL from the sandbox needs a Supabase **Management API** personal
access token (`sbp_…`, sent as `Authorization: Bearer` to
`https://api.supabase.com/v1/projects/<ref>/database/query`, ref = the subdomain of
`NEXT_PUBLIC_SUPABASE_URL`) or the project's **database password** for a direct Postgres
connection; neither ships with this app. Don't re-probe the service-role key for DDL.

Page presentation (not obvious from the code):

- The page still renders **without the navbar**: `src/app/[locale]/(customer)/layout.tsx` skips
  `<Navbar />` for path suffixes in `NAVBAR_HIDDEN_SUFFIXES` (`/open-order`). The wizard brings
  its own sticky header instead (step title, `n/6` counter, progress bar, close → `/` on step 1
  and a back chevron after that) — the old espresso/gold hero is gone.
- Steps 2–5 render in a centred `max-w-2xl` column; step 1 (the product grid + fabric filter
  tabs) uses the full `max-w-5xl` width.
- Step 4 (data pemesan) picks the destination from RajaOngkir via
  `src/components/open-order/LocationPicker.tsx` — Provinsi → Kota/Kabupaten → Kecamatan, fed by
  `/api/shipping/provinces` + `/api/shipping/districts` (the province/city/district lists are
  cached in Supabase `shipping_cache` and do load in this sandbox, key from `store_settings`
  falling back to `RAJAONGKIR_API_KEY`). The picker stores the RajaOngkir **names** in
  `customer.city` / `customer.district`, so ongkir no longer depends on the customer's spelling.
  If the lists can't be loaded it falls back to the old plain Kota + Kecamatan text inputs, so the
  order still submits; the same debounced `/api/shipping/jnt-cost` call and the same graceful
  `configured: false` fallback (`Ongkir —`) apply either way. Langkah 4 juga menampilkan **baris
  Ongkir** sendiri (label service + harga, `Menghitung…` selagi menunggu, `—` + catatan saat gagal)
  tepat di bawah Kode Pos — nilainya dari state wizard yang sama dengan langkah 5, jadi terhitung
  sekali. Sebelum wilayah dipilih, barisnya `—` dengan petunjuk singkat memilih provinsi/kota/kecamatan.
- The period line under the title comes from `store_settings.open_order_period`, diatur di menu admin
  **Open Order** dan dibaca lewat `useStoreSettings()` (`StepCatalog` merendernya sebagai `Periode …`).
  `OPEN_ORDER_PERIOD` di `src/lib/open-order-config.ts` ("8-15 Agustus 2026") kini hanya **nilai
  default/fallback** — dipakai selama kolomnya kosong.
- The **Extra Cover & Hanger** row in step 3 follows the catalog look: a cream card with a thin
  gold spine on the left edge (grows to full height on hover), a sans-serif espresso name and
  price (on request, matched to the cart lines / summary rows), a gold uppercase caption, and a round gold ring that fills with a check while the
  add-on is selected (`is-on` class). Its CSS is scoped in `StepCart.tsx` (the `ADDON_CSS` string
  rendered in a `<style>` tag) instead of being added to the shared `ui.tsx` tokens, because the
  ornament is used nowhere else; the row is still the same toggle button (click selects/deselects)
  and only its appearance changed. The summary box below it lists the item lines, an `Extra Cover &
  Hanger` line while the add-on is selected, and a `Total` (subtotal + add-on) so toggling the card
- **Halaman detail pesanan akun** (`/[locale]/akun/pesanan/<order_number>`) memakai tata letak rincian
  pesanan ala marketplace (latar abu terang `#F5F6F7`, kartu putih radius 12, aksen terracotta `#B4552F`):
  renderernya satu komponen klien `src/components/akun/RincianPesanan.tsx` (CSS scoped dengan awalan `rp-`
  di dalam komponen itu, mengikuti pola `ADDON_CSS` di `StepCart.tsx`), sementara file route hanya
  mengambil pesanan lewat `getCustomerOrders()` lalu merendernya. Urutan bloknya: banner status → "Info
  Pengiriman" → "Alamat Pengiriman" (alamat dipotong 2 baris + tombol "Lihat") → kartu produk (baris
  `Total Pesanan` dibuka untuk Ringkasan Pembayaran) → "Status Pesanan" yang dilipat (`<details>`) →
  tombol "Lacak Pesanan" lengket di atas nav bawah (`bottom: var(--mobile-nav-h)`); untuk pesanan
  `pending`/`diproses` ada tombol sekunder **"Batalkan Pesanan"** (putih, teks merah) di bawahnya →
  `POST /api/orders/cancel` lewat `ConfirmModal`, dan setelah berhasil statusnya ditimpa lokal jadi `dibatalkan`.
  Blok "Butuh Bantuan?" (Garansi & Pengembalian / Hubungi Admin / Panduan Ukuran) sudah **dihapus**
  atas permintaan pemilik — jangan ditambahkan lagi di halaman ini.
  Di **desktop** halaman ini jadi satu lembar **"Struk Hangat"**: `.rp-wrap` dibatasi `max-width:600px`
  dan terpusat, latar halaman dibiarkan transparan (krem milik `AkunShell`) sehingga yang tampak hanya
  kertas struknya. Pembungkus `<div className="rp-sheet">` membalut banner → kartu-kartu → aksi:
  **mobile** `display:contents` (tata letak lama persis sama), **desktop** jadi satu lembar krem
  (`#FFFDF8`, border `#EFE6D9`, radius 16, shadow lembut) dengan pemisah antar-blok berupa garis
  putus-putus (`#E7DCCB`) ala struk; kartu di dalamnya dibuat transparan tanpa border
  (`.rp-card{background:none;border:0}`), ringkasan pembayaran memakai krem `#FCF8F1`, dan teks
  sekunder dihangatkan (`#7E746B`). Aturan pemisah harus ditulis **terakhir** di blok `@media` supaya
  menang atas `.rp-card{border:0}`. Breakpoint `<768px` tidak berubah (mobile identik).
  Halaman ini **tidak lagi memakai `STRUK_CSS`/`StrukHeader`** (keduanya masih dipakai halaman lacak —
  jangan hapus, dan perbaikan gaya halaman lacak terpisah). Foto produk memakai `order_items.product_image`
  dengan `object-fit: contain` di atas kotak abu muda **tanpa bingkai/lis** (permintaan pemilik: lis emas
  lama jelek, dan foto tidak boleh terpotong), dengan `FALLBACK_PHOTO` (aset Base44) kalau kolomnya kosong —
  banyak `order_items` lama memang menyimpan `product_image` NULL. Blok "Info Pengiriman" memanggil
  `/api/jnt/track` sekali (hanya bila ada resi) untuk baris update terakhir. Header halaman lama
  (`AkunHeader` dari `AkunShell.tsx`) masih dipakai halaman akun lain, jadi jangan ubah gaya globalnya
  untuk halaman ini.
  visibly changes the amount; ongkir is added in step 5 (review) — dan sudah tampil juga sebagai
  baris tersendiri di langkah 4, tepat di bawah Kode Pos.
- **Checkout Open Order wajib punya akun**: langkah 4 adalah gerbangnya. Kalau belum ada sesi
  customer, langkah 4 merender `StepAuth` (masuk/daftar **inline** — bukan redirect — supaya
  keranjang & data yang sudah diisi di state wizard tidak hilang) dan judul header jadi
  "Masuk / Daftar"; sesi dibaca sekali saat `OpenOrderWizard` mount lewat `getCurrentCustomer()`.
  Setelah masuk/daftar, form data pemesan langsung tampil terisi nama + WhatsApp dari akun (hanya
  field yang masih kosong) dan judul kembali "Data Pemesanan". Kalau project Supabase meminta
  verifikasi email, `signUp` tidak menghasilkan sesi: `StepAuth` pindah ke tab Masuk sambil
  menampilkan pesan cek email.
- `/api/open-order` **menolak** request tanpa sesi (`401`; header `Authorization: Bearer
  <access_token>` diverifikasi `supabaseAdmin.auth.getUser`) dan menolak sesi yang bukan akun
  pelanggan (`403`, dicek dari baris `customers` — `orders.customer_id` ber-FK ke tabel itu, jadi
  insert-nya akan gagal kalau tidak dicek). Order disimpan dengan `customer_id` +
  `customer_email` **dari token**, bukan dari body — order `CYO-` jadi muncul di `/akun/pesanan`.
  (Order checkout website lama maupun baru masih `customer_id: null`; itu di luar cakupan gerbang
  ini.)
  Sebelum gerbang `customers` ini ada, akun auth tanpa baris `customers` membuat insert `orders`
  gagal `23503` (FK `orders_customer_id_fkey`) → `500`. Sekarang kasus itu berhenti di `403`:
  pernah ada **satu akun lama** (dibuat 2026-07-25) yang tidak punya baris `customers`, jadi
  `403` di log bukan tanda gerbangnya rusak — cek dulu `GET /rest/v1/customers?id=eq.<uid>`.
- The admin **Pesanan** panel splits the list into sub-tabs **Pesanan Website** / **Open Order**
  (`orderSource` state): Open Order rows are the `CYO-` numbers, everything else is the website
  checkout, and the status chips (Semua/pending/diproses/selesai) filter inside the selected tab.
  Kedua route dashboard admin — `/admin` (`src/app/admin/page.tsx`, di luar prefix locale lewat
  `src/middleware.ts`) dan `/id/admin` — kini merender **satu komponen yang sama**:
  `src/app/[locale]/admin/page.tsx` cuma `export { default } from "@/app/admin/page"`. Dulu file itu
  salinan penuh dan sudah drift (kartu Pengaturan tidak ikut tersalin), jadi cukup ubah
  `src/app/admin/page.tsx`. **Subhalaman** admin lain (`produk`, `voucher`, `open-order`,
  `testimoni`, `ukuran-produk`, dll.) masih punya salinan locale sendiri dan tetap perlu diedit di
  dua tempat.
  **Drawer detail pesanan** kedua dashboard memakai komponen bersama
  **`src/components/admin/OrderDetailDrawer.tsx`** — panel meluncur dari kanan, pola yang sama dengan
  `ProductDetailDrawer` (`ODR_CSS`, kelas `odr-`, lebar 640 px / penuh di mobile). Isinya satu
  komponen bersama **`src/components/admin/OrderDetailContent.tsx`**, yang memakai susunan & gaya
  halaman detail pesanan customer: banner status berwarna → "Info Pengiriman" (kurir + **Nomor
  Resi J&T**) → **"Metode Pembayaran"** → "Alamat Pengiriman" → kartu produk + baris "Total
  Pesanan" yang dilipat → "Status Pesanan" (linimasa `strukSteps`) → aksi. **Nomor resi dan metode
  pembayaran sengaja jadi blok yang selalu terlihat** (permintaan pemilik: "kok resi-nya ilang",
  "harusnya tampil metode pembayaran") — dulu keduanya hanya ada di dalam ringkasan "Total Pesanan"
  yang terlipat dan resi cuma ditempel di belakang nama kurir (`J&T - EZ: JO…`), jadi terbaca
  seperti hilang. Nomor pesanan `awb_no` tetap terisi otomatis saat pesanan masuk
  (`/api/open-order` & `/api/orders` memanggil J&T Order Create) — resi kosong di drawer berarti
  order itu memang belum punya `awb_no`, bukan field-nya yang dibuang; halaman detail customer
  (`RincianPesanan.tsx`) tidak ikut diubah. Header drawer (nomor pesanan + tanggal + tombol X) hidup di
  `OrderDetailDrawer.tsx` saja; nomor pesanan memakai font UI admin (dulu serif Cormorant di header
  modal — permintaan pemilik: "samain kaya yg lain biar seragam"). Drawer tertutup lewat X, klik
  latar, atau `Escape`, dan `z-index`-nya **50** supaya `ConfirmModal` (Hapus Pesanan / Batalkan
  J&T, juga z-50 tapi dirender setelah drawer) tetap tampil di atasnya. Gaya/DOM-nya dipinjam dari
  `RincianPesanan`: kelas `rp-`,
  `RINCIAN_CSS`, dan `FALLBACK_PHOTO` **diekspor dari sana** — ubah salah satunya, halaman customer
  dan drawer admin ikut berubah (itu yang diinginkan: satu sumber gaya). Kontrol khusus admin
  (chip "Ubah Status", WhatsApp, Cetak Label, Batalkan J&T, Hapus Pesanan) memakai kelas `od-` di
  `OD_CSS` file yang sama. Perbedaan yang disengaja dari halaman customer: baris item tetap memakai
  `Kain <kode> · <series> · <warna> · <size> × <qty>` (warna `default` disembunyikan) dengan
  `Min: … · Dipilih: …` untuk Open Order, ditambah baris Email + Catatan di blok alamat, dan **tanpa**
  panggilan `/api/jnt/track`. `order_items` di query kedua dashboard menyertakan `product_image`
  untuk thumbnail (object-fit contain, tanpa bingkai). Perubahan lain pada panel Pesanan tetap harus
  dikerjakan di kedua file.
  **Di bawah breakpoint `lg` daftar pesanan tidak memakai tabel**: kedua dashboard merender
  `src/components/admin/OrdersMobileList.tsx` — kartu berisi nomor pesanan · pill status · nama
  pelanggan · `tanggal · total`, dan bila prop `onSelect` diberi kartunya jadi tombol yang membuka
  drawer detail (dengan chevron); tanpa `onSelect` kartunya statis. Komponen itu menyembunyikan
  dirinya sendiri di `lg` (`lg:hidden`), sedangkan `<table>`-nya tetap di dalam pembungkus
  `overflow-x-auto` yang sama dan cukup diberi `hidden lg:table` — jangan menambah pembungkus kedua
  (dua root elemen di dalam ternary `{loading ? … : ( … )}` menghasilkan parse error JSX
  "Expected '</', got 'ident'"). Baris "Pesanan Terbaru" di dashboard memakai komponen yang sama
  (5 baris pertama, tanpa `onSelect`) dan baris chip filter pesanan memakai `flex-wrap` supaya
  "Selesai" tidak terpotong di layar ~370 px.
  **Tata letak drawer detail di mobile** (permintaan pemilik: "kurang rapih, bikin lebih responsif",
  lalu "pastikan responsif di mobile"): `ODR_CSS` membuat drawer selebar penuh di bawah 768 px
  (header lebih rapat, `padding:14px 16px`) — breakpoint-nya sengaja sama (768 px) dengan breakpoint
  "struk" di `RINCIAN_CSS`; `OrderDetailContent`'s `OD_CSS` menambahkan override `max-width:767.98px`
  yang **hanya** berlaku di dalam drawer: `.od-root .rp-root` jadi transparan (latar abu `#F5F6F7`
  milik halaman customer dibuang, kalau tidak ada blok abu di dalam lembar drawer), banner status
  menempel di bawah header drawer (`margin-top:0` + radius 0), chip "Ubah Status" jadi grid 2×2 dan
  tombol aksi jadi baris penuh (flex-wrap membuat 3 chip + 1 dan tombol berlebar pincang). Yang
  ≥768 px tidak berubah: drawer 640 px dengan lembar "struk hangat" krem 600 px terpusat di dalamnya.
- **Dashboard akun** (`/[locale]/akun`, `src/app/[locale]/akun/page.tsx`) ditata ulang untuk mobile:
  baris "Pesanan Terakhir" = satu baris atas (thumbnail, nama pesanan + `#nomor · tanggal` yang
  dipotong `truncate` satu baris, chevron rata tengah) lalu satu baris penuh di bawahnya berisi
  harga + pill status yang rata dengan tepi kartu (blok `sm:hidden`; pasangan `hidden sm:block`
  dengan kolom kanan harga/pill mempertahankan tata letak desktop persis seperti sebelumnya).
  Kartu "Akses Cepat" menumpuk ikon (36 px) + chevron di baris atas dengan judul + subteks
  didorong ke bawah lewat `mt-auto`, dan `min-h-[112px]` menjaga keempat kartu sejajar walau
  judulnya membungkus dua baris di layar ~370 px.
- **Sidebar akun (desktop) harus muat tanpa scroll** (permintaan pemilik: "harusnya ngga ada scroll
  di menunya, bikin responsif di semua ukuran") — sama seperti sidebar admin yang lebih dulu
  dirapatkan. `AkunShell`'s `<aside>`: `<nav>` memakai **`min-h-0`** (tanpa itu flex item tidak bisa
  mengecil dari isinya, jadi menu luber dan scrollbar muncul) + kelas `akun-side-nav` / `-brand` /
  `-group` / `-item` / `-foot`, dan blok CSS di `src/app/globals.css` yang (a) menyembunyikan
  scrollbar nav (`scrollbar-width: none` + `::-webkit-scrollbar{display:none}`) dan (b)
  merapatkan jarak vertikal lewat kueri `max-height` 820 / 700 / 600 / 520 px (di bawah 520 px
  label grup disembunyikan). Lebar & warna sidebar tidak berubah, dan semua halaman `/akun/*`
  ikut karena semuanya memakai shell yang sama. Kueri itu di luar `@layer` Tailwind, jadi
  menang atas utility `py-*` (jangan dipindah ke dalam layer).
  **Tidak bisa diverifikasi lewat preview**: `/akun/*` butuh sesi **customer**, sedangkan sesi
  yang diputar ulang preview adalah sesi **admin** → selalu mendarat di `/akun/login`. Uji manual:
  masuk sebagai customer di `/id/akun`, lalu kecilkan tinggi jendela (≤700 px, lalu ≤600 px) dan
  pastikan tidak ada bar di menu.
- **Nav bawah ala aplikasi (mobile)** di semua halaman toko: `src/components/MobileBottomNav.tsx`
  (Beranda · Kategori · Open Order · Pesanan · Akun) dipasang oleh
  `src/app/[locale]/(customer)/layout.tsx` dan tampil di bawah breakpoint `lg` — sama dengan navbar
  atas yang beralih ke drawer di sana. Tingginya satu variabel CSS, `--mobile-nav-h`
  (`src/app/globals.css`: 0 px di desktop, 62 px di bawah 1024 px); layout memakai variabel itu untuk
  padding bawah halaman, dan tiga halaman yang punya bar aksi bawah sendiri (keranjang, checkout,
  detail produk) menggeser bar-nya dengan `bottom-[var(--mobile-nav-h)]` supaya tidak bertumpuk.
  Elemen mengambang ikut aturan itu: tombol WhatsApp `AutoCTA` (hanya dipasang di beranda) memakai
  `bottom-[calc(var(--mobile-nav-h)_+_1.5rem)]` — dengan `bottom-6` tombolnya menutupi menu "Akun".
  Route group `src/app/(customer)/` (tanpa locale) sengaja tidak disentuh — middleware me-redirect
  semua path toko ke `/<locale>/…`, jadi pohon itu tidak terpakai.
- **Jendela Open Order diatur dari dashboard admin** (dulu hardcode `OPEN_ORDER_PERIOD`).
  Menu sidebar **Open Order** → `/admin/open-order` (+ salinan `/id/admin/open-order`); kedua route
  hanya merender `src/components/admin/OpenOrderSettingsForm.tsx` di dalam `AdminShell` — formulirnya
  **satu file** supaya dua halaman itu tidak dobel. (Entri sidebar-nya sendiri masih perlu ada di
  `AdminShell`'s `navGroups` **dan** di sidebar dua dashboard admin, karena masing-masing punya sidebar.)
  **Urutan item di grup "Lainnya" wajib identik di kedua sidebar** (`AdminShell`'s `navGroups` dan
  blok "Lainnya" di `src/app/admin/page.tsx`): kalau tidak, menu terlihat "berubah urutan" begitu
  admin membuka salah satu subhalaman — dulu "Open Order" ada di posisi ketiga di `AdminShell` tapi
  paling bawah di dashboard. Urutan yang benar: Konten Website · Pengaturan · Voucher · Testimoni ·
  Panduan Ukuran · Halaman Garansi &amp; Retur · Open Order. Verifikasi tanpa browser:
  `curl -s http://localhost:3000/admin/open-order | grep -o 'href="/admin[^"]*"'` harus sama
  urutannya dengan sidebar dashboard (yang di-SSR spinner, jadi bandingkan dengan sumber `page.tsx`).
  Admin memilih **tanggal mulai + tanggal tutup** (`<input type="date">`) dan **series yang dibuka**
  (chip multi-pilih dari katalog); tidak ada lagi toggle buka/tutup manual.
- Aturan jendela ada di **satu** modul, `src/lib/open-order-window.ts` — dipakai halaman admin
  *dan* publik: `resolveOpenOrderState()` (`before` / `open` / `closed`, dibandingkan sebagai teks
  `YYYY-MM-DD` lokal, bukan objek `Date`, supaya tidak bergeser zona waktu),
  `formatOpenOrderPeriod()` ("8 Agustus 2026 – 15 Agustus 2026"), dan `openOrderSeriesList()`.
  Tanggalnya belum diisi → `open_order_active` lama dipakai sebagai fallback, jadi perilaku lama
  tidak berubah sampai admin mengisi tanggal. `OpenOrderWizard` merender layar pesan (bukan langkah 1)
  untuk `before` ("Open Order belum dibuka" + tanggal mulainya) dan `closed`
  ("Nanti Open Order berikutnya") — murni di klien.
- **Batasi series**: `open_order_series` (JSONB array nama series; `[]` = semua series) disaring oleh
  `restrictOpenOrderProducts()` di `src/lib/open-order-offering.ts` — produk yang tidak punya series
  terpilih ikut hilang, jadi series yang ditutup tidak muncul di langkah 1 maupun chip series di
  langkah 2. Route `/api/open-order` menerapkan saringan yang sama (baca `store_settings` dengan
  admin client) supaya series yang ditutup tidak bisa dipesan lewat request langsung; kalau kolomnya
  belum ada, select-nya gagal dan dianggap "semua series".
- `useStoreSettings()` (`src/lib/store-settings.ts`) membawa `open_order_start_date`,
  `open_order_end_date`, dan `open_order_series` (dinormalkan lewat `openOrderSeriesList`).
- Kolomnya datang dari **`supabase/open-order-settings.sql` yang harus dijalankan manual** di SQL
  editor Supabase (sandbox tidak punya jalur DDL, sama seperti kolom pengaturan lain). Selama belum
  dijalankan, halaman admin menampilkan peringatan dan simpan akan gagal; halaman publik tetap jalan
  dengan `OPEN_ORDER_PERIOD`.
  **Sudah dijalankan untuk `open_order_period` + `open_order_active`** (2026-10-10, peringatan di
  halaman admin hilang dan simpan→muat-ulang terbukti mem-persist).
  **Kolom baru — `open_order_start_date`, `open_order_end_date`, `open_order_series` (JSONB) — ada di
  file yang sama dan harus dijalankan ulang** (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, jadi aman
  diulang). Selama belum dijalankan: halaman admin menampilkan peringatan dan simpan gagal, sedangkan
  halaman publik tetap jalan dengan perilaku lama (tanggal kosong → fallback `open_order_active`).
  Cek cepat: `curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/store_settings?select=id,open_order_period,open_order_active,open_order_start_date,open_order_end_date,open_order_series" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"`.
- `src/types/lucide-react.d.ts` adalah shim tipe tulis-tangan berisi daftar ikon yang boleh diimpor
  proyek ini — ikon lucide baru (di sini `AlertTriangle`, `LayoutGrid`, `Save`) harus ditambahkan ke
  situ, kalau tidak `tsc` gagal dengan TS2305 walaupun ikonnya ada saat runtime.
- The success screen shows the order number and the "Menunggu Konfirmasi Admin" badge; "Lihat
  Pesanan Saya" points at `/akun/pesanan`, which needs a logged-in customer.

Verify: open `/id/open-order` and click through — product card → warna/ukuran/series + harga
(Create Your Price, minimum = harga series) → TAMBAH KE PESANAN → keranjang → data pemesan (an
empty form is blocked with a message) → SUBMIT PESANAN. Then check
`docker compose -f docker-compose.base44.yml logs web | grep OPEN-ORDER` and confirm the row
under `/id/admin` → Pesanan carries `size`, the postal code and "Min: … · Dipilih: …".
**Delete that test order afterwards** (admin detail → Hapus, or the Supabase REST API) so it
does not pollute the real order list. The price clamp can be checked without the UI: a POST to
`/api/open-order` with a below-minimum `price` must come back with `total` equal to the series
minimum.
```

## Kredensial J&T Express (kartunya sudah dihapus dari dashboard)

Kartu **"Kredensial J&T Express"** dan komponen `src/components/admin/JntCredentialsForm.tsx` sudah
**dihapus dari panel Pengaturan** atas permintaan pemilik — kredensial J&T diatur lewat environment
variable (platform secrets / Vercel), dan `getJntConfig()` memang sudah membacanya dari sana, jadi
integrasi ongkir/AWB/track tidak berubah. Route **`/api/admin/jnt-settings`** dan tabel
`jnt_settings` sengaja dibiarkan (tidak lagi dipakai UI); catatan di bawah masih berlaku kalau
kartunya nanti dihidupkan lagi.

- Disimpan di tabel **`jnt_settings`** (satu baris, `id = 1`), **bukan** `store_settings`:
  `store_settings` punya policy "Public read" dan dibaca anon client (`select("*")` di
  `src/lib/store-settings.ts`), jadi kredensial di sana akan ikut terkirim ke browser. `jnt_settings`
  dibuat **tanpa policy RLS** → hanya service role yang bisa membacanya.
- Tabelnya dibuat lewat **`supabase/jnt-settings.sql`**, dijalankan manual di SQL Editor Supabase
  (sandbox tidak punya jalur DDL). Sebelum dijalankan: form menampilkan peringatan, tombol simpan
  nonaktif, dan GET `/api/admin/jnt-settings` membalas `{ tableReady: false }`. Jalankan dulu
  sebelum memakai form ini.
- Akses lewat **`/api/admin/jnt-settings`** (GET status, POST simpan). Route-nya memverifikasi
  session Supabase **dan** keanggotaan di tabel `admins`, dan hanya mengembalikan status terisi +
  pilihan `env` — nilai kredensial tidak pernah dikirim ke browser (karena itu nilai lama tidak bisa
  ditampilkan; field kosong = jangan diubah).
- `getJntConfig()` di `src/lib/jnt/config.ts` kini **async**: baca `jnt_settings` dengan service role
  (cache 60 detik; `clearJntConfigCache()` dipanggil setelah simpan) → field yang kosong jatuh ke
  environment variable (`JNT_ORDER_USERNAME`, `JNT_TARIFF_KEY`, …). Pemanggilnya sudah `await`
  (`src/lib/jnt/{tariff,order,track,cancel}.ts`, `/api/shipping/jnt-cost`, `/api/jnt/test`), dan
  `getJntBaseUrl(endpoint, env)` menerima env supaya pilihan testing/production dari form ikut
  terpakai.
- Tanpa kredensial sama sekali perilakunya tidak berubah: `/api/shipping/jnt-cost` tetap membalas
  `{ configured: false }` (bukan 500), dan `/api/jnt/test` tidak lagi menyertakan `orderApiKey` di
  responsnya (dulu membocorkan key).

Verify: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/jnt-settings` →
`401` (tanpa session admin). POST `/api/shipping/jnt-cost` tanpa kredensial → `configured: false`.
Simpan-dari-form baru bisa terbukti setelah `supabase/jnt-settings.sql` dijalankan.

**Kredensial J&T sekarang datang dari platform secrets** (2026-10-11): `JNT_ORDER_USERNAME`,
`JNT_ORDER_API_KEY`, `JNT_TARIFF_KEY`, `JNT_TARIFF_CUS_NAME`, `JNT_TRACK_PASSWORD` diisi pemilik
toko lewat kartu secrets Base44 (`/run/base44/app.env`), dibaca `getJntConfig()` dari environment
variable. **Tabel `jnt_settings` masih belum dibuat** (GET `/rest/v1/jnt_settings` masih 404) dan itu
tidak lagi menghalangi ongkir — form admin tetap butuh SQL itu kalau nanti mau dipakai.

Kredensial toko ini **production**, bukan demo: `data` + `sign` yang sama membalas
`{ is_success: "false", message: "fail" }` di `demo-general.inuat-jntexpress.id`, tetapi
`is_success: "true"` di `partner-track.jet.co.id`. Karena itu `JNT_ENV=production` diset di
`.base44/env.defaults` (bukan rahasia, jadi aman di repo; nilai dari dashboard tetap menang).
Kalau ongkir tiba-tiba `fail` lagi, cek `JNT_ENV` dulu sebelum menuduh sign/kredensialnya salah.

## Halaman pesanan customer (`/akun/pesanan`)

Yang tidak kelihatan dari kode:

- **Status di detail pesanan mengikuti `orders.status`**, bukan hardcode: `strukSteps()` di
  `src/lib/akun-format.ts` (dirender `src/components/akun/RincianPesanan.tsx`) memetakan pending → baru dikonfirmasi,
  diproses → diproses, dikirim → diserahkan ke kurir/dalam perjalanan, selesai → semua langkah
  selesai, dibatalkan → linimasa berhenti di langkah pembatalan (banner tone `cancel`). **Dulu langkah 1 & 2
  selalu "done"**, jadi pesanan `pending` di akun tampak sudah diproses sementara admin
  menampilkannya `pending` — itu bug yang diperbaiki, jangan kembalikan hardcode itu.
- Label pill ikut disamakan dengan admin: `pending` = **"Menunggu Pembayaran"** (dipakai daftar
  pesanan, dashboard akun, banner struk, dan modal admin), `dibatalkan` pakai `akun-pill-batal` (merah). Dipakai bersama oleh `/akun` (dashboard),
  list pesanan, dan detail — ubah di `src/lib/akun-format.ts` saja.
- **Foto "Informasi Produk" diambil dari katalog.** Baris `order_items` pesanan Open Order tidak
  menyimpan `product_image` (route `/api/open-order` tidak pernah mengisinya), jadi
  `orderItemImage(item, catalog)` di `src/lib/open-order-catalog.ts` mencocokkan `kain` + warna +
  `series` ke baris `products` lalu memakai `getProductThumbnail`. Karena itu
  `getCustomerOrders()` di `src/lib/customer-auth.ts` **wajib memilih `kain, series`** — kalau
  kolomnya tidak ikut di-select, fotonya hilang tanpa error (placeholder ikon lagi).
- **Nomor resi terbit saat pesanan dibuat**: `/api/open-order` sekarang memanggil J&T Order Create
  (`createOrder` di `src/lib/jnt/*`) tepat setelah baris `order_items` masuk, lalu menyimpan
  `awb_no` + `jnt_order_id` (dan mengembalikan `awbNo`), sama seperti `/api/orders` pada checkout
  website. Kode area dari nama wilayah RajaOngkir: `getOriginCode("DEPOK")` (= "DPK"),
  `getDestinationCode(city)`, `getReceiverArea(city, district)` — wizard menyimpan nama resmi
  ("Kota Depok", "Beji") dan `area-mapping.ts` membuang prefix administratif, jadi biarkan
  namanya apa adanya. Kegagalan J&T hanya di-`console.error` (`[OPEN-ORDER] J&T`) dan pesanan
  tetap tersimpan, jadi **resi kosong ≠ pesanan gagal**; periksa log sebelum menuduh route-nya.
  Pesanan yang sudah ada sebelum perubahan ini tetap tanpa resi (tidak ada backfill, dan belum
  ada tombol "buat resi" di admin).
- **Customer bisa membatalkan pesanannya sendiri**: `POST /api/orders/cancel` (body
  `{ orderNumber }`, header `Authorization: Bearer <access_token>`) — verifikasi sesi, pesanan
  harus milik customer itu (kalau bukan → 404, bukan 403), hanya status `pending`/`diproses` yang
  boleh, batalkan pengiriman di J&T dulu baru `status = dibatalkan`. Stok **tidak** dikembalikan
  karena `/api/open-order` tidak pernah memotong stok (memanggil `samaqu_restore_stock` justru
  menambah stok yang tidak pernah diambil). Tombolnya di blok aksi
  `src/components/akun/RincianPesanan.tsx` (di bawah "Lacak Pesanan") + `ConfirmModal`.

Verify (mobile 374px, akun customer):

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/orders/cancel \
  -H 'Content-Type: application/json' -d '{"orderNumber":"CYO-..."}'   # 401 tanpa sesi
```

Lalu di browser: buka `/id/akun/pesanan` → detail pesanan. Timeline harus sama dengan status di
`/id/admin` (Pesanan), foto produk muncul (Cloudinary), kartu **Nomor Resi** terisi begitu pesanan
baru dibuat, dan tombol **Batalkan Pesanan** muncul hanya untuk `pending`/`diproses`. Bikin
pesanan uji sebisa mungkin **dibatalkan lalu dihapus** (admin detail → Hapus, atau REST
`DELETE /rest/v1/orders?order_number=eq.…`) agar daftar pesanan asli tidak kotor.

## Drawer detail produk admin

Detail produk admin kini satu komponen bersama, **`src/components/admin/ProductDetailDrawer.tsx`**
(panel gelap charcoal `#1b1e25`, kartu `#232730`, aksen hijau `#22c55e` / biru `#3b82f6` — permintaan
pemilik "drawer modern", mengikuti referensi desain yang dikirim). Dipakai di **dua tempat**:

- **Drawer dari daftar produk**: `ProductsCatalog` menerima prop `onDetail(id)`; tombol mata di
  kartu memanggilnya (dulu `<Link>` ke halaman detail). Kedua dashboard (`/admin` dan `/id/admin`)
  menyimpan `selectedProductId` dan merender `<ProductDetailDrawer productId={…} onClose={…} />`
  tepat sebelum `<OrderDetailDrawer … />`. Drawer tertutup lewat tombol **Tutup**, klik latar, atau
  `Escape`.
- **Halaman route tetap ada** (`/admin/produk/detail/<id>` + salinan locale) dan sekarang hanya
  merender `ProductDetailPanel` dengan `mode="page"` (lembar terpusat, gaya sama) — jadi tidak ada
  dua tampilan detail yang berbeda. Ubah tampilan detail → ubah komponen itu saja.

Angka drawer semuanya dari data asli: stok & SKU dari `product_variants`, harga dari `products`
(harga minimum bila Create Your Price aktif), penjualan dari `order_items`. Skema **tidak** punya
"stok awal"/"total masuk"/"profit", jadi baris statistiknya memakai angka nyata (Total Pesanan,
Total Transaksi, Varian Menipis) — jangan mengarang kolom yang tidak ada. Gaya ditulis di string
`PD_CSS` (pola sama seperti `RINCIAN_CSS`), kelasnya berawalan `pd-`.

**Verifikasi manual** (route admin tidak bisa dicapai lewat navigasi SPA preview:
`window.__base44_preview.navigate('/admin'|'/id/admin')` mengubah URL tapi konten tidak berganti,
dan full page load di-reset ke route home pada panggilan preview berikutnya — jadi perubahan
dashboard admin **tidak bisa** dibuktikan lewat preview tool, cukup `tsc --noEmit` bersih + curl
`/admin` & `/id/admin` = 200 tanpa error kompilasi di log): buka
`/id/admin` → panel **Produk** → klik tombol mata di kartu produk; drawer harus meluncur dari kanan,
tombol **Tutup** menutupnya, dan `/admin/produk/detail/<id>` menampilkan panel yang sama.
Untuk **drawer detail pesanan**: panel **Order Management** → klik baris pesanan (atau tombol
"Detail"); drawer meluncur dari kanan dengan nomor pesanan (font UI, bukan serif) + tanggal di
header, lalu isi struk (banner status → info pengiriman → alamat → produk → Total Pesanan →
Status Pesanan); chip "Ubah Status" & tombol aksi (WhatsApp / Cetak Label / Hapus) tetap bekerja,
dan tutup lewat **X**, klik latar, atau `Escape`. Ulangi di lebar <768 px: drawer selebar penuh,
chip status 2×2, tombol aksi satu kolom.

## Panel Pengaturan (read-only + Edit) & panel Pelanggan

- Seluruh isi panel **Pengaturan** kini di **`src/components/admin/SettingsSections.tsx`** (satu
  default export `SettingsPanel`), bukan lagi inline di `page.tsx`. Semua kartunya memakai pola yang
  sama: default **read-only** — nilai tampil sebagai teks dan footer hanya punya tombol **Edit** —
  lalu klik Edit membuat field jadi input dan footer jadi **Simpan + Batal** (Batal mengembalikan
  nilai awal). Pembungkusnya `SettingsCard` + `Field` di
  **`src/components/admin/SettingsCard.tsx`**; kartu pengaturan baru sebaiknya memakai keduanya
  (state form & fungsi simpan tetap milik section-nya).
  Kartu yang ikut pola ini: Informasi Toko, Alamat Pengiriman Toko, Provider Pengiriman, Ekspedisi
  Aktif, API Key RajaOngkir, Sosial Media, Meta Pixel. `PaymentMethodsManager` sengaja **tidak**
  ikut — itu pengelola daftar (tambah/hapus per metode), bukan satu form.
- **Alamat Pengiriman Toko** memuat daftar wilayahnya lewat `loadLists()` lalu memasang nilai
  kecamatan *setelah* daftarnya ada (kalau tidak, `<select>` tampil kosong). `Batal` memuat ulang
  daftar kalau provinsi/kota sempat diubah, supaya nilai aslinya tetap punya option yang cocok.
  Di mode read-only label "Memuat…" hanya muncul selama daftarnya masih diambil.
- Panel **Pelanggan** kini `src/components/admin/CustomersView.tsx`: kartu ringkas per pelanggan
  (tanggal lahir, total belanja, jumlah pesanan, belanja terakhir) + tombol **"Riwayat Belanja &
  Alamat (n)"**, plus chip filter "Ulang Tahun Bulan Ini" dan kartu ringkasan di atasnya.
- **Tombol Export di panel Pelanggan** merakit CSV-nya di **`src/lib/customer-csv.ts`**
  (`customersToCsv` + `formatWhatsapp`), bukan lagi inline di `CustomersView`. Permintaan pemilik:
  "pas di export No WA nya malah berantakan" — Excel mengubah digit panjang (`85299954529`) jadi
  notasi ilmiah `8,52999E+10`, jadi No WA sekarang ditulis sebagai teks `+62 852-9995-4529`
  (angka aslinya tidak diubah, cuma awalan `62`/`0` dibuang dulu). Tanda `+`/`-` membuat Excel
  memperlakukannya sebagai teks, dan panjang tiap baris jadi seragam; tanggal lahir tetap
  `YYYY-MM-DD`. File itu sengaja bebas JSX/React supaya bisa diuji langsung tanpa browser:
  `docker compose exec -T web node --input-type=module -e "import {formatWhatsapp} from './src/lib/customer-csv.ts'; console.log(formatWhatsapp('085299954529'))"`
  (Node 22 sudah men-strip tipe TS, jadi impor `.ts` langsung jalan). Ekspor lewat UI sendiri cuma
  bisa dicek sampai "tidak ada error console" — unduhan `blob:` tidak muncul di
  `getNetworkRequests`, jadi isi CSV-nya dibuktikan lewat Node di atas, bukan lewat preview.
- **Drawer detail pelanggan** = `src/components/admin/CustomerDetailDrawer.tsx` (panel netral
  putih/abu tema admin, kelas `cd-`, lebar 460 px / penuh di bawah 768 px, tutup lewat X / klik
  latar / `Escape` — pola sama dengan `ProductDetailDrawer`/`OrderDetailDrawer`). Isinya: header
  (avatar inisial + nama + WhatsApp + badge "Belum daftar") → ringkasan 2×2 (total belanja, jumlah
  pesanan, belanja terakhir, tanggal lahir) → **"Alamat Pengiriman"** → **"Riwayat Belanja"**.
  Alamat diambil dari `orders` (tabel `customers` tidak menyimpan alamat): route
  `/api/admin/customers` men-`select` `shipping_address, shipping_city, shipping_postal_code` lalu
  menggabungkannya jadi satu string `address` per order; drawer men-dedupe alamat unik dan
  mengurutkannya dari yang terakhir dipakai (`Dipakai n×` bila dipakai berkali-kali). Tipe
  `AdminCustomer`/`CustomerOrder` sekarang **diekspor dari drawer** dan diimpor `CustomersView`
  (jangan didefinisikan ulang di CustomersView). Kartu pelanggan tidak lagi membuka riwayat
  belanja inline — satu-satunya jalan ke detail adalah tombol drawer itu.
- Datanya dari **`/api/admin/customers`** (`src/app/api/admin/customers/route.ts`, service role).
  Ini **wajib** lewat route: tabel `customers` punya policy RLS "read own", jadi anon client admin
  tidak bisa membaca pelanggan lain. Route-nya memverifikasi sesi Supabase + keanggotaan tabel
  `admins` (pola sama dengan `/api/admin/jnt-settings`), lalu menggabungkan `customers` dengan
  `orders` — order lama yang `customer_id`-nya null dicocokkan lewat nama, dan pembeli tanpa akun
  tetap tampil sebagai entri "Belum daftar" supaya tidak ada yang hilang dari daftar.
  **Total belanja tidak menghitung pesanan `dibatalkan`.**
- Halaman **profil pelanggan** (`/[locale]/akun/profil`) memakai pola yang sama dengan kartu
  Pengaturan admin (diminta pemilik: "samain button nya kaya di menu setting admin"): Nama, Email,
  Nomor HP/WhatsApp, dan Tanggal Lahir tampil sebagai **teks read-only** dengan satu tombol **Edit**;
  setelah diklik barulah muncul input + **Simpan Perubahan + Batal** (Batal mengembalikan nilai yang
  terakhir tersimpan, dan setelah Simpan berhasil halaman kembali read-only). Tanggal lahir
  ditampilkan sebagai `15 Agustus 1995`, atau "Belum diisi". Polanya ditiru dari `SettingsCard` tapi
  gayanya tetap gaya halaman akun (hijau `#0f3d33` / krem), bukan tema admin.
  **Route ini tidak bisa dibuka preview tool** (`navigate('/id/akun/profil')` mengubah URL tapi
  konten tetap halaman home), jadi perubahan halaman profil diverifikasi lewat `tsc --noEmit` +
  `curl /id/akun/profil` = `200`, sisanya uji manual — jangan buang panggilan preview untuk itu.
  `birth_date` dibaca dengan fallback tanpa kolom itu kalau migration
  `supabase/migrations/20260910_customer_birth_date.sql` belum dijalankan.
  **Migration itu BELUM dijalankan** (dicek 2026-10-11: `select=id,name,birth_date` → `400`
  `42703 column customers.birth_date does not exist`), jadi tanggal lahir belum tersimpan di mana
  pun. Simpan profil customer (`/[locale]/akun/profil`) menulis `birth_date` langsung dari browser,
  dan tanpa kolomnya PostgREST menolak seluruh update dengan **400** — itulah error
  `rest/v1/customers?id=eq.<uuid>` di console. Sandbox tidak punya jalur DDL, jadi kolomnya dibuat
  lewat SQL Editor Supabase: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;`
  (sudah ada di `supabase/migrations/20260910_customer_birth_date.sql`). Selama belum dijalankan,
  halaman profil tetap menyimpan nama/WhatsApp (update diulang tanpa `birth_date`) dan menampilkan
  toast bahwa tanggal lahir gagal disimpan.
  Cek cepat kolom: `curl -s -o /dev/null -w '%{http_code}\n' "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/customers?select=id,birth_date&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"`
  → `200` berarti kolomnya sudah ada (`400` = belum).
  Cek cepat: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/customers`
  → `401` tanpa sesi admin.
- Verifikasi panel-panel ini lewat preview: sesi admin user ikut diputar ulang, jadi
  `preview_screenshot({ path: "/admin" })` lalu `preview_execute_code` (klik "Pengaturan"/
  "Pelanggan" — panelnya tombol in-page, bukan route) berhasil. Yang diuji: 7 tombol **Edit** dan
  0 **Simpan/Batal** saat read-only, `Nama Toko` = "SAMAQU" sebagai teks, setelah Edit muncul input
  bernilai sama + Simpan/Batal, Batal kembali ke read-only, kartu J&T tidak ada lagi, dan panel
  Pelanggan memuat (59 pelanggan, 4 kartu ringkasan) tanpa error.
