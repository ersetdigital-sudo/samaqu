import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";
import { SITE_NAME, SITE_URL, localeAlternates, OG_IMAGE } from "@/lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // x-pathname di-set middleware: /id/katalog → path "/katalog"
  const pathname = (await headers()).get("x-pathname") || `/${locale}`;
  const path = pathname.replace(new RegExp(`^/(${locales.join("|")})(?=/|$)`), "") || "/";
  const isEn = locale === "en";

  return {
    alternates: localeAlternates(locale, path),
    openGraph: {
      type: "website",
      url: `${SITE_URL}/${locale}${path === "/" ? "" : path}`,
      locale: isEn ? "en_US" : "id_ID",
      alternateLocale: [isEn ? "id_ID" : "en_US"],
      siteName: SITE_NAME,
      images: [OG_IMAGE],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  // Root layout (src/app/layout.tsx) sudah merender <html>/<body> + <Providers> untuk
  // seluruh route; me-render RootLayout lagi di sini membuat <html> bersarang di dalam
  // <body> (hydration error) sekaligus menggandakan tiap provider. Layout locale cukup
  // menambahkan provider pesan next-intl.
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
