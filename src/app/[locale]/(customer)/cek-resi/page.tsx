import type { Metadata } from "next";
import { SITE_URL, localeAlternates, OG_IMAGE } from "@/lib/site-config";
import CekResiClient from "@/components/public/CekResiClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = "Cek Resi J&T";
  const description =
    "Lacak paket SAMAQU lewat nomor resi J&T Express. Lihat status dan riwayat pengiriman.";
  return {
    title,
    description,
    alternates: localeAlternates(locale, "/cek-resi"),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/cek-resi`,
      locale: locale === "en" ? "en_US" : "id_ID",
      images: [OG_IMAGE],
    },
  };
}

export default function CekResiPage() {
  return <CekResiClient />;
}
