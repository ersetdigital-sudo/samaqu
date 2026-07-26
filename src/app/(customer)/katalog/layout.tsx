import { Metadata } from "next";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Katalog Produk — SAMAQU",
  description: "Jelajahi koleksi busana pria muslim premium SAMAQU. Thobe, Kandora, Koko, Vest, Kabak, Cover Hanger — bahan pilihan, jahitan rapi.",
  keywords: ["katalog SAMAQU", "beli thobe", "kandora pria", "baju koko", "busana muslim"],
  openGraph: {
    title: "Katalog Produk — SAMAQU",
    description: "Koleksi busana pria muslim premium. Thobe, Kandora, Koko, Vest, Kabak.",
    url: `${SITE_URL}/katalog`,
  },
  alternates: { canonical: `${SITE_URL}/katalog` },
};

export default function KatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
