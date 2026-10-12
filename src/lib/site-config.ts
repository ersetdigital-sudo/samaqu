// Single source of truth for site URL
// Change this one value when domain changes
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.samaqu.id").replace(/\/$/, "");
export const SITE_NAME = "SAMAQU";
export const SITE_DESCRIPTION = "Premium Muslim Menswear — Busana pria muslim premium berkualitas tinggi.";
export const SITE_LOCALES = ["id", "en"] as const;
export const DEFAULT_LOCALE = "id";
export const SITE_CONTACT = {
  whatsapp: "+62-85212150100",
  email: "halo@samaqu.id",
  instagram: "https://www.instagram.com/samaqu.id",
};

/** Kartu share/OG default (route: src/app/opengraph-image.tsx). */
export const OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "SAMAQU — Busana Muslim Pria Premium",
};

/**
 * Canonical + hreflang untuk satu halaman.
 * `path` tanpa prefix locale, contoh: "" (home) atau "/katalog".
 */
export function localeAlternates(locale: string, path = "") {
  const clean = path === "/" ? "" : path;
  return {
    canonical: `${SITE_URL}/${locale}${clean}`,
    languages: {
      id: `${SITE_URL}/id${clean}`,
      en: `${SITE_URL}/en${clean}`,
      "x-default": `${SITE_URL}/${DEFAULT_LOCALE}${clean}`,
    },
  };
}
