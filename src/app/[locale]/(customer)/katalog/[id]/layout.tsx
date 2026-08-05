import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-config";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await supabase.from("products").select("id, name, description, category, image, price, colors").eq("id", id).single();

  if (!product) {
    return { title: "Produk Tidak Ditemukan — SAMAQU" };
  }

  const description = product.description || `${product.name} — ${product.category} premium dari ${SITE_NAME}. Bahan pilihan, jahitan rapi, cocok untuk ibadah dan acara istimewa.`;
  const ogImage = product.image || `${SITE_URL}/og-product.png`;

  return {
    title: `${product.name} — ${product.category} Premium`,
    description,
    keywords: [product.name, product.category, SITE_NAME, "Muslim Menswear", "Thobe", "Kandora", "Busana Muslim Pria", "Baju Koko", "Premium"],
    openGraph: {
      title: `${product.name} — ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/katalog/${product.id}`,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 800, height: 1000, alt: product.name }],
      type: "website",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
    alternates: { canonical: `${SITE_URL}/katalog/${product.id}` },
  };
}

export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: product } = await supabase.from("products").select("id, name, description, category, image, price, colors").eq("id", id).single();

  const jsonLd = product ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
        contactPoint: { "@type": "ContactPoint", telephone: "+62-85212150100", contactType: "customer service", availableLanguage: "Indonesian" },
      },
      {
        "@type": "Product",
        name: product.name,
        description: product.description || `${product.name} — ${product.category} premium dari ${SITE_NAME}`,
        image: product.image?.startsWith("http") ? product.image : `${SITE_URL}${product.image || "/images/og-product.png"}`,
        sku: product.id,
        brand: { "@type": "Brand", name: SITE_NAME },
        category: product.category,
        color: Array.isArray(product.colors) ? product.colors.join(", ") : "",
        offers: {
          "@type": "Offer",
          url: `${SITE_URL}/katalog/${product.id}`,
          priceCurrency: "IDR",
          price: product.price,
          availability: "https://schema.org/InStock",
          seller: { "@id": `${SITE_URL}#organization` },
          itemCondition: "https://schema.org/NewCondition",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Katalog", item: `${SITE_URL}/katalog` },
          { "@type": "ListItem", position: 3, name: product.name },
        ],
      },
    ],
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
