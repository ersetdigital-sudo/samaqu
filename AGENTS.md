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

## Open Order (form pesanan Create Your Price)

The old Google Form ("OPEN ORDER SAMAQU — Create Your Price") is now a page on the site:
**/open-order** (`src/app/[locale]/(customer)/open-order/page.tsx` +
`src/components/OpenOrderForm.tsx`). The offering (products, series, colors, prices and the
Cover & Hanger add-on) is a **static** list in `src/lib/open-order-config.ts` — it comes from
the form, not from the `products` table, so edit that file to change prices. Each product also
carries a shipping `weight` in grams there (used to price J&T shipping). The page's price list,
the form summary and the server-side validation all read from it.

Submissions POST to **`/api/open-order`** (`src/app/api/open-order/route.ts`; the `[locale]/api`
copy is the dead duplicate — the live API is the one under `src/app/api/`). The route
re-validates product/series/color/quantity and prices from the config (client prices are never
trusted) and writes ordinary rows into **`orders` + `order_items`**, so they appear in the
existing admin dashboard (`/[locale]/admin`, "Pesanan" tab) with the normal status flow:

- `order_number` uses the prefix **`CYO-`** (`SMQ-` = website checkout) — that is how the two
  kinds of order are told apart in the admin list,
- `shipping_method` = `J&T - <service>` and `shipping_cost` = the J&T tariff for the customer's
  kecamatan (see the ongkir note below); it falls back to `manual` / 0 when kecamatan is empty
  or the J&T call fails, and then the admin arranges shipping later,
- `payment_method` `bank` (legacy value, renders as "Transfer Bank"),
- `status` `pending`, and `shipping_notes` = `IG @username · <customer note>` — the admin order
  detail renders that as "Catatan", which is where the Instagram handle is read,
- the Cover & Hanger add-on is one extra `order_items` row (`product_id` `addon-cover-hanger`).

Ongkir (J&T shipping): the form asks for **Kecamatan**; once ~3+ chars are typed the client
debounces 1s and POSTs `{ city, district, weight }` to **`/api/shipping/jnt-cost`** (the same
J&T Tariff API the checkout uses, via `src/lib/jnt/*`), keeps the cheapest service and shows it
as the `Ongkir` line that feeds the bottom `Total`. Weight counts the current lines at the config
`weight` × qty, plus 300 g for the Cover & Hanger add-on, min 300 g. The picked method/cost ride
along in the POST body as `shipping: { method, cost }`; `/api/open-order` does **not** re-verify
the tariff (same trust model as `/api/orders`) — it only clamps the cost to ≥ 0 and folds it into
`total`. J&T credentials are **required for a price**: `JNT_TARIFF_KEY` + `JNT_TARIFF_CUS_NAME`,
and the route also gates on `JNT_ORDER_USERNAME`. Without them the route answers **200** with
`{ data: [], configured: false, error: "J&T API belum dikonfigurasi" }` — a missing credential is a
normal state, not a server failure, so the log stays free of a 500 (and of one `console.error` per
keystroke) while the `error` field is kept so the checkout callers behave exactly as before; the route
logs a single `console.warn` per process. `OpenOrderForm` detects `configured: false` and shows the
fallback message with the ongkir line at `—` without a `console.error` (the order still submits,
admin prices shipping later). The J&T **testing** credential values this app used before live in
commit `e48a6fe`; supply them through the platform secrets (`/run/base44/app.env`), never in the
repo. `JNT_ENV` defaults to `testing`.

No new table: the hosted Supabase project has **no DDL path** from the sandbox (no `exec_sql`
RPC, `/pg/query` invalid), so a new table would have needed the user to run SQL by hand.

Page presentation (not obvious from the code):

- The page renders **without the navbar**: `src/app/[locale]/(customer)/layout.tsx` skips
  `<Navbar />` for path suffixes listed in `NAVBAR_HIDDEN_SUFFIXES` (`/open-order`), and the
  page hero carries its own logo + close link back to `/`.
- Price/product cards come from `src/components/OpenOrderProducts.tsx`, which fetches the
  catalog client-side (`getProducts()`) and matches each config product to catalog rows:
  thobe by **`jenis_kain.name` === config `kain`** (B-01 / A-02), narrowed with the config's
  ready-stock colors found in the catalog product name (`Thobe <warna>`); Vest by product
  name (no catalog row exists yet, so it renders as a dark placeholder without a detail link).
  Photo/weight are catalog data; **prices still come only from `src/lib/open-order-config.ts`**
  (the API keeps validating them server-side).

Verify: open `/id/open-order`, submit a test order, then check
`docker compose -f docker-compose.base44.yml logs web | grep OPEN-ORDER` and that the row shows
under `/id/admin` → Pesanan. **Delete that test order afterwards** (admin detail → Hapus) so it
does not pollute the real order list.
```
