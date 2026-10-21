/**
 * Origin toko untuk link referral.
 *
 * Portal affiliate bisa diakses lewat subdomain `affiliate.samaqu.id`, tapi link
 * referral harus mengarah ke TOKO (www.samaqu.id) supaya pengunjung mendarat di
 * katalog, bukan di portal partner. Karena itu link dibentuk dari origin toko,
 * bukan dari `window.location.origin`.
 *
 * Override lewat env `NEXT_PUBLIC_SITE_URL` kalau nama domain toko berubah.
 */
const DEFAULT_SITE_ORIGIN = "https://www.samaqu.id";

export function siteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  return DEFAULT_SITE_ORIGIN;
}

/** URL referral lengkap, mis. https://www.samaqu.id/r/SAM-AF-00001-001 */
export function referralUrl(code: string): string {
  return `${siteOrigin()}/r/${code}`;
}

/**
 * Host portal partner. Di host ini middleware me-rewrite path ke /affiliate/*,
 * jadi link portal cukup "/komisi" (URL bersih), bukan "/affiliate/komisi".
 */
export const AFFILIATE_HOST = "affiliate.samaqu.id";

/** Prefix path portal: "" di subdomain portal, "/affiliate" di domain utama. */
export function portalBaseFor(hostname: string): string {
  return hostname === AFFILIATE_HOST ? "" : "/affiliate";
}

/** Path portal yang bersih untuk link internal. */
export function portalPath(base: string, path = ""): string {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!clean) return base || "/";
  return `${base}/${clean}`;
}
