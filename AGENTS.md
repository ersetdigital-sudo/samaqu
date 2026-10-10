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
live tariffs stay off until the J&T secrets are supplied. The J&T **testing** credential values this app used before live in
commit `e48a6fe`; supply them through the platform secrets (`/run/base44/app.env`), never in the
repo. `JNT_ENV` defaults to `testing`.

No new table: the hosted Supabase project has **no DDL path** from the sandbox (no `exec_sql`
RPC, `/pg/query` invalid), so a new table would have needed the user to run SQL by hand.

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
  `configured: false` fallback (`Ongkir —`) apply either way.
- The period line under the title comes from `OPEN_ORDER_PERIOD` in `src/lib/open-order-config.ts`
  ("8-15 Agustus 2026"), rendered by `StepCatalog` as `Periode …` — edit that constant to change it.
- The **Extra Cover & Hanger** row in step 3 follows the catalog look: a cream card with a thin
  gold spine on the left edge (grows to full height on hover), the serif espresso name, a gold
  uppercase caption, the serif price and a round gold ring that fills with a check while the
  add-on is selected (`is-on` class). Its CSS is scoped in `StepCart.tsx` (the `ADDON_CSS` string
  rendered in a `<style>` tag) instead of being added to the shared `ui.tsx` tokens, because the
  ornament is used nowhere else; the row is still the same toggle button (click selects/deselects)
  and only its appearance changed. The summary box below it lists the item lines, an `Extra Cover &
  Hanger` line while the add-on is selected, and a `Total` (subtotal + add-on) so toggling the card
  visibly changes the amount; ongkir is only added in step 5 (review).
- Deliberately not reproduced from the reference: the bottom tab bar (the site has its own
  chrome/floaters).
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
