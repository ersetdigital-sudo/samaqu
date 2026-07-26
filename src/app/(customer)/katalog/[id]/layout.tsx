import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/site-config";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await supabase.from("products").select("name, description, category, image, price").eq("id", id).single();

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

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
