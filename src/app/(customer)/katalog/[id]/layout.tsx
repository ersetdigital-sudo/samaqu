import { Metadata } from "next";
import { supabase } from "@/lib/supabase";

const SITE_URL = "https://samaqu.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await supabase.from("products").select("*").eq("id", id).single();

  if (!product) {
    return { title: "Produk Tidak Ditemukan — SAMAQU" };
  }

  const description = product.description || `${product.name} — ${product.category} premium dari SAMAQU. Bahan pilihan, jahitan rapi, cocok untuk ibadah dan acara istimewa.`;
  const imageUrl = product.image || product.images?.[0] || `${SITE_URL}/og-product.png`;
  const price = product.price;

  return {
    title: `${product.name} — SAMAQU | ${product.category} Premium`,
    description,
    keywords: [
      product.name, product.category, "SAMAQU", "Muslim Menswear", "Thobe", "Kandora",
      "Busana Muslim Pria", "Baju Koko", "Premium", product.kain, product.series,
    ].filter(Boolean),
    openGraph: {
      title: `${product.name} — SAMAQU`,
      description,
      url: `${SITE_URL}/katalog/${product.id}`,
      siteName: "SAMAQU",
      images: [{ url: imageUrl, width: 800, height: 1000, alt: product.name }],
      type: "website",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — SAMAQU`,
      description,
      images: [imageUrl],
    },
    alternates: { canonical: `${SITE_URL}/katalog/${product.id}` },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
