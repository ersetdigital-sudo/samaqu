import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { affiliateSession, affiliateUnauthorized } from "@/lib/affiliate/auth";

/**
 * "Produk Saya" — produk yang dipilih affiliate untuk dipromosikan.
 * Dipisah dari `affiliate_links` supaya satu produk bisa punya banyak tautan
 * (tiap kanal punya link sendiri) tapi tetap punya status "aktif/nonaktif" tunggal.
 */
export async function GET(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("affiliate_id", session.affiliate.id)
    .order("created_at", { ascending: false });

  const rows = (data || []) as { id: string; product_id: string; is_promoted: boolean }[];
  if (rows.length === 0) return NextResponse.json({ items: [] });

  const productIds = rows.map((r) => r.product_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, price, image")
    .in("id", productIds);

  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, url, is_video, display_order")
    .in("product_id", productIds)
    .order("display_order");

  const { data: variants } = await supabase
    .from("product_variants")
    .select("product_id, stock")
    .in("product_id", productIds);

  const { data: links } = await supabase
    .from("affiliate_links")
    .select("id, product_id")
    .eq("affiliate_id", session.affiliate.id);

  const productMap = new Map<string, { name: string; category: string; price: number; image: string | null }>();
  for (const p of (products || []) as { id: string; name: string; category: string; price: number; image: string | null }[]) {
    productMap.set(p.id, p);
  }

  const imageMap = new Map<string, string>();
  for (const img of (images || []) as { product_id: string; url: string; is_video: boolean | null }[]) {
    if (img.is_video) continue;
    if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, img.url);
  }

  const stockMap = new Map<string, number>();
  for (const v of (variants || []) as { product_id: string; stock: number | null }[]) {
    if (!v.product_id) continue;
    stockMap.set(v.product_id, (stockMap.get(v.product_id) || 0) + Number(v.stock || 0));
  }

  const linkCount = new Map<string, number>();
  const linkIdsByProduct = new Map<string, string[]>();
  for (const l of (links || []) as { id: string; product_id: string | null }[]) {
    if (!l.product_id) continue;
    linkCount.set(l.product_id, (linkCount.get(l.product_id) || 0) + 1);
    const arr = linkIdsByProduct.get(l.product_id) || [];
    arr.push(l.id);
    linkIdsByProduct.set(l.product_id, arr);
  }

  // Klik per produk (dari jejak klik tautan) & pesanan per produk (dari komisi).
  const clicksByProduct = new Map<string, number>();
  const ordersByProduct = new Map<string, number>();

  const allLinkIds = Array.from(linkIdsByProduct.values()).flat();
  if (allLinkIds.length > 0) {
    const { data: clickRows } = await supabase
      .from("affiliate_clicks")
      .select("link_id")
      .eq("affiliate_id", session.affiliate.id)
      .in("link_id", allLinkIds);

    for (const row of (clickRows || []) as { link_id: string | null }[]) {
      if (!row.link_id) continue;
      for (const [productId, ids] of linkIdsByProduct) {
        if (ids.includes(row.link_id)) {
          clicksByProduct.set(productId, (clicksByProduct.get(productId) || 0) + 1);
        }
      }
    }
  }

  const { data: commissionRows } = await supabase
    .from("affiliate_commissions")
    .select("link_id")
    .eq("affiliate_id", session.affiliate.id);

  for (const row of (commissionRows || []) as { link_id: string | null }[]) {
    if (!row.link_id) continue;
    for (const [productId, ids] of linkIdsByProduct) {
      if (ids.includes(row.link_id)) {
        ordersByProduct.set(productId, (ordersByProduct.get(productId) || 0) + 1);
      }
    }
  }

  const items = rows.map((row) => {
    const product = productMap.get(row.product_id);
    return {
      id: row.id,
      productId: row.product_id,
      name: product?.name ?? row.product_id,
      category: product?.category ?? "",
      price: product?.price ?? 0,
      image: imageMap.get(row.product_id) || product?.image || "",
      stock: stockMap.get(row.product_id) || 0,
      links: linkCount.get(row.product_id) || 0,
      clicks: clicksByProduct.get(row.product_id) || 0,
      orders: ordersByProduct.get(row.product_id) || 0,
      promoted: row.is_promoted,
    };
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || "").trim();
  const promoted = body.promoted === true;

  if (!productId) {
    return NextResponse.json({ error: "ID produk wajib diisi." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  const { error } = await supabase.from("affiliate_products").upsert(
    { affiliate_id: session.affiliate.id, product_id: productId, is_promoted: promoted },
    { onConflict: "affiliate_id,product_id" },
  );

  if (error) {
    console.error("[affiliate] Gagal menyimpan produk saya:", error.message);
    return NextResponse.json({ error: "Gagal menyimpan produk." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const productId = String(req.nextUrl.searchParams.get("productId") || "").trim();
  if (!productId) {
    return NextResponse.json({ error: "ID produk wajib diisi." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  await supabase
    .from("affiliate_products")
    .delete()
    .eq("affiliate_id", session.affiliate.id)
    .eq("product_id", productId);

  return NextResponse.json({ ok: true });
}
