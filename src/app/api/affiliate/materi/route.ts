import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { affiliateSession, affiliateUnauthorized } from "@/lib/affiliate/auth";
import { getAffiliateSettings, rateForProduct } from "@/lib/affiliate/settings";

/**
 * Materi promosi — foto/video produk resmi SAMAQU yang boleh dipakai affiliate.
 * Sumbernya katalog asli (`products` + `product_images`), bukan file contoh.
 */
export async function GET(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);

  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, price")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  const list = (products || []) as { id: string; name: string; category: string; price: number }[];
  if (list.length === 0) return NextResponse.json({ materials: [] });

  const ids = list.map((p) => p.id);
  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, url, is_video, display_order")
    .in("product_id", ids)
    .order("display_order");

  const byProduct = new Map<string, { url: string; is_video: boolean }[]>();
  for (const img of (images || []) as { product_id: string; url: string; is_video: boolean | null }[]) {
    if (!img.url) continue;
    const arr = byProduct.get(img.product_id) || [];
    arr.push({ url: img.url, is_video: img.is_video === true });
    byProduct.set(img.product_id, arr);
  }

  const materials = list
    .map((product) => {
      const media = byProduct.get(product.id) || [];
      const image = media.find((m) => !m.is_video)?.url;
      const video = media.find((m) => m.is_video)?.url;
      if (!image && !video) return null;
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        rate: rateForProduct(settings, product.id),
        image: image || null,
        video: video || null,
        downloadable: !!image,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ materials });
}
