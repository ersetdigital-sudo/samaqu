import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-config";

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

export default async function KatalogLayout({ children }: { children: React.ReactNode }) {
  const { data: products } = await supabase.from("products").select("id, name, category, price, image").order("created_at", { ascending: true }).limit(50);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: SITE_NAME,
        url: SITE_URL,
      },
      {
        "@type": "CollectionPage",
        name: "Katalog Produk SAMAQU",
        description: "Koleksi busana pria muslim premium dari SAMAQU",
        url: `${SITE_URL}/katalog`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: products?.length || 0,
          itemListElement: (products || []).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/katalog/${p.id}`,
            item: { "@type": "Product", name: p.name, sku: p.id, image: p.image?.startsWith("http") ? p.image : `${SITE_URL}${p.image || ""}`, offers: { "@type": "Offer", priceCurrency: "IDR", price: p.price, availability: "https://schema.org/InStock" } },
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Katalog" },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
