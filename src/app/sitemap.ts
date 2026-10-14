import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_LOCALES, DEFAULT_LOCALE } from "@/lib/site-config";

// Sitemap di-cache 1 jam supaya produk baru ikut terdaftar tanpa redeploy.
export const revalidate = 3600;

type Freq = "weekly" | "monthly";

/** Halaman publik yang layak diindeks (urutan = prioritas). */
const STATIC_PAGES: { path: string; priority: number; changeFrequency: Freq }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/katalog", priority: 0.9, changeFrequency: "weekly" },
  { path: "/testimoni", priority: 0.7, changeFrequency: "weekly" },
  { path: "/tentang-kami", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/panduan-ukuran", priority: 0.6, changeFrequency: "monthly" },
  { path: "/create-your-price", priority: 0.6, changeFrequency: "weekly" },
  { path: "/garansi-retur", priority: 0.5, changeFrequency: "monthly" },
  { path: "/cara-pesan", priority: 0.5, changeFrequency: "monthly" },
  { path: "/sama-quran", priority: 0.5, changeFrequency: "monthly" },
];

/** Satu path → entri per locale, masing-masing membawa hreflang lengkap. */
function localizedEntries(
  path: string,
  lastModified: Date,
  changeFrequency: Freq,
  priority: number,
): MetadataRoute.Sitemap {
  const suffix = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const locale of SITE_LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${suffix}`;
  }
  languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}${suffix}`;

  return SITE_LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}${suffix}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries = STATIC_PAGES.flatMap((page) =>
    localizedEntries(page.path, now, page.changeFrequency, page.priority),
  );

  const { data: products } = await supabase
    .from("products")
    .select("id, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const productEntries = (products || []).flatMap((p) =>
    localizedEntries(
      `/katalog/${p.id}`,
      p.created_at ? new Date(p.created_at) : now,
      "weekly",
      0.8,
    ),
  );

  return [...staticEntries, ...productEntries];
}
