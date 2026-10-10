import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";

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
