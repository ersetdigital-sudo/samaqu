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

## Sandbox-only overrides

- `next.config.ts` appends `allowedDevOrigins: ['3000-' + BASE44_PUBLIC_HOST_SUFFIX]`
  **only when `BASE44_PREVIEW_MODE === '1'`**, because the preview proxies the dev
  server through a different origin and Next otherwise rejects cross-origin dev
  asset/HMR requests (403). Unset/none → identical config to upstream.
  Verify: a `GET` on a `/_next/static/chunks/...` URL with
  `Origin: https://3000-$BASE44_PUBLIC_HOST_SUFFIX` must return 200.

## Known pre-existing app noise (not a setup problem)

- `CaraPemesanan.tsx` logs `FORMATTING_ERROR: … context variable "strong" was not
  provided` because the `caraPemesanan.subtitle` message contains `<strong>` tags and
  is rendered through `t()` with `dangerouslySetInnerHTML`. next-intl logs the error and
  the page still returns 200. Left as-is; it is app-level, unrelated to the sandbox.

## Verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' -L http://localhost:3000/     # expect 200 (redirects to /id)
docker compose -f docker-compose.base44.yml ps                          # web must be (healthy)
```
