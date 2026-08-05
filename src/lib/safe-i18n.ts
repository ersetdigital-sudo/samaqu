"use client";

import { useLocale as useNextIntlLocale, useTranslations as useNextIntlTranslations } from "next-intl";

/**
 * Safe wrapper for useLocale that returns "id" as fallback
 * when NextIntlClientProvider context is not available (e.g. during prerendering)
 */
export function useSafeLocale(): string {
  try {
    return useNextIntlLocale();
  } catch {
    return "id";
  }
}

/**
 * Default Indonesian translations fallback when next-intl context is not ready.
 * Prevents raw key names (e.g. "nav.home") from appearing on screen.
 */
const DEFAULT_MESSAGES: Record<string, Record<string, string>> = {
  nav: {
    home: "Home", katalog: "Katalog", testimoni: "Testimoni", tentang: "Tentang Kami",
    bantuan: "Bantuan", panduan: "Panduan Ukuran", cara_pesan: "Cara Pesan", faq: "FAQ",
    garansi_retur: "Garansi & Retur", cyp: "Create Your Price", sama_quran: "Sama Quran",
    account: "Account", chat_admin: "Chat Admin", bantuan_title: "Butuh bantuan? Hubungi kami.",
  },
};

/**
 * Safe wrapper for useTranslations that returns a fallback translation function
 * when NextIntlClientProvider context is not available
 */
export function useSafeTranslations(namespace?: string) {
  try {
    return useNextIntlTranslations(namespace);
  } catch {
    const ns = namespace || "nav";
    const fallback = DEFAULT_MESSAGES[ns] || {};
    return (key: string) => {
      const fullKey = key.includes(".") ? key.split(".").pop()! : key;
      return fallback[fullKey] || key;
    };
  }
}
