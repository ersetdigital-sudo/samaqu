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
 * Safe wrapper for useTranslations that returns a passthrough function
 * when NextIntlClientProvider context is not available
 */
export function useSafeTranslations(namespace?: string) {
  try {
    return useNextIntlTranslations(namespace);
  } catch {
    // Fallback: return key as-is
    return (key: string) => key;
  }
}
