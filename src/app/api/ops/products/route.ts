import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized, stockStatus } from "@/lib/ops-auth";

/**
 * Produk untuk dashboard internal.
 * Bentuk yang dikembalikan mengikuti entity `Product` app Base44:
 * { sku, name, hpp, price, stock, initial_stock, status, product_type }
 * datanya dibaca dari tabel `products` + total stok dari `product_variants`
 * (tabel yang sama dipakai website, jadi stoknya satu sumber).
 */

const PRODUCT_FIELDS = [
  "sku",
  "name",
  "hpp",
  "price",
  "initial_stock",
  "product_type",
  "status_stok",
  "category",
  "series",
  "colors",
  "image",
  "weight",
] as const;

async function withTotals(admin: ReturnType<typeof getSupabaseAdmin>, products: any[]) {
  // `base_product_id` = stok bersama ala series: series turunan tidak memegang stoknya
  // sendiri, stoknya milik produk basis (perilaku yang sama dipakai `samaqu_decrement_stock`).
  // Jadi stok yang benar-benar bisa dijual = stok produk basisnya.
  const { data: variants } = await admin
    .from("product_variants")
    .select("product_id, stock, base_product_id");
  const ownStock: Record<string, number> = {};
  const baseLink: Record<string, string> = {};
  for (const v of variants || []) {
    if (v.base_product_id) {
      baseLink[v.product_id] = v.base_product_id;
      continue;
    }
    ownStock[v.product_id] = (ownStock[v.product_id] || 0) + (Number(v.stock) || 0);
  }
  return products.map((p) => {
    const total = ownStock[p.id] || 0;
    const baseId = baseLink[p.id] as string | undefined;
    // Stok efektif: series turunan memakai stok basis; produk biasa memakai stoknya sendiri.
    const efektif = baseId ? ownStock[baseId] || 0 : total;
    const baseProduk = baseId ? products.find((b) => b.id === baseId) : null;
    return {
      id: p.id,
      sku: p.sku || String(p.id || "").toUpperCase(),
      name: p.name,
      hpp: p.hpp ?? 0,
      price: p.price ?? 0,
      stock: total,
      initial_stock: p.initial_stock ?? 0,
      status: stockStatus(total),
      // ── Tambahan untuk halaman Produk ops. Field lama di atas sengaja TIDAK diubah
      //    supaya halaman lain (mis. Barang Masuk) tidak ikut berubah perilakunya. ──
      stock_efektif: efektif,
      status_efektif: stockStatus(efektif),
      /** Terisi hanya kalau stok produk ini menumpang produk lain (series turunan). */
      stok_bersama: baseId
        ? { mengikuti: baseProduk?.name || baseId, series: baseProduk?.series || null, stock: efektif }
        : null,
      /** Jenis kain (relasi `products.jenis_kain_id`) — dipakai kolom & detail di /ops. */
      jenis_kain: p.jenis_kain
        ? {
            id: p.jenis_kain.id,
            name: p.jenis_kain.name,
            material: p.jenis_kain.material ?? null,
            texture: p.jenis_kain.texture ?? null,
            suitable_for: p.jenis_kain.suitable_for ?? null,
            care_instructions: p.jenis_kain.care_instructions ?? null,
          }
        : null,
      product_type: p.product_type || "normal",
      category: p.category,
      series: p.series,
      colors: p.colors,
      image: p.image,
    };
  });
}

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("products").select("*, jenis_kain(*)").order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const items = await withTotals(admin, data || []);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  try {
    const body = await req.json();
    const admin = getSupabaseAdmin();
    const row: Record<string, unknown> = { id: body.id, name: body.name };
    for (const f of PRODUCT_FIELDS) if (body[f] !== undefined) row[f] = body[f];
    const { data, error } = await admin.from("products").insert(row).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (e) {
    console.error("[OPS] products POST:", e);
    return NextResponse.json({ error: "Gagal menyimpan produk" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  try {
    const body = await req.json();
    const { id, ...patch } = body || {};
    if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
    const row: Record<string, unknown> = {};
    for (const f of PRODUCT_FIELDS) if (patch[f] !== undefined) row[f] = patch[f];

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("products").update(row).eq("id", id).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (e) {
    console.error("[OPS] products PATCH:", e);
    return NextResponse.json({ error: "Gagal mengubah produk" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  try {
    const body = await req.json().catch(() => null);
    const id = body?.id || new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

    const admin = getSupabaseAdmin();
    // Hapus varian dulu (stok & ukuran), baru produknya.
    await admin.from("product_variants").delete().eq("product_id", id);
    const { error, count } = await admin.from("products").delete({ count: "exact" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: count ?? 0 });
  } catch (e) {
    console.error("[OPS] products DELETE:", e);
    return NextResponse.json({ error: "Gagal menghapus produk" }, { status: 500 });
  }
}
