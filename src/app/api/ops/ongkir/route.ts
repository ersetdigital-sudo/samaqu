import { NextRequest, NextResponse } from "next/server";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { productWeightMapFromRows, sumWeightGramsBySize, variantWeightMapFromRows } from "@/lib/shipping-weight";

/**
 * Cek ongkir J&T untuk drawer Transaksi (ops).
 *
 * TARIF TIDAK DIHITUNG DI SINI. Perhitungan tarif (termasuk pemetaan kode area J&T dan
 * cache 10 menit) tetap milik route yang sudah dipakai website checkout & Open Order:
 * `POST /api/shipping/jnt-cost`. Route ini hanya menyiapkan BERAT-nya — memakai fungsi berat
 * bersama `src/lib/shipping-weight.ts` (berat varian → berat produk), dengan fallback yang
 * sama seperti checkout: minimal 300 g, 800 g untuk unit yang beratnya belum diisi.
 *
 *   POST /api/ops/ongkir  { city, kecamatan, items: [{ product_id, color, size, quantity }] }
 *   → { data: [{ courier, service, description, cost, etd }], weight_grams, city, kecamatan }
 */
export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  try {
    const body = await req.json();
    const city = String(body?.city || "").trim();
    const kecamatan = String(body?.kecamatan || "").trim();
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (!city || !kecamatan) {
      return NextResponse.json({ error: "Kota/kabupaten dan kecamatan tujuan belum diisi." }, { status: 400 });
    }

    const items = rawItems
      .map((item: any) => ({
        productId: String(item?.product_id || "").trim(),
        color: String(item?.color || "default").trim() || "default",
        size: String(item?.size || "").trim(),
        quantity: Math.max(1, Math.round(Number(item?.quantity) || 0)),
      }))
      .filter((item: { productId: string; size: string }) => item.productId && item.size);

    if (items.length === 0) {
      return NextResponse.json({ error: "Pilih produk dulu (minimal 1 item dengan ukuran)." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const productIds = [...new Set(items.map((item: { productId: string }) => item.productId))];
    const [{ data: productRows }, { data: variantRows }] = await Promise.all([
      admin.from("products").select("id, weight").in("id", productIds),
      admin.from("product_variants").select("product_id, color, size, weight").in("product_id", productIds),
    ]);

    const { grams, missingQty } = sumWeightGramsBySize(
      items,
      productWeightMapFromRows(productRows as { id?: string | null; weight?: number | null }[]),
      variantWeightMapFromRows(
        variantRows as { product_id?: string | null; color?: string | null; size?: string | null; weight?: number | null }[],
      ),
    );
    const weightGrams = Math.max(300, grams + missingQty * 800);

    const tariffRes = await fetch(new URL("/api/shipping/jnt-cost", req.nextUrl.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, district: kecamatan, weight: weightGrams }),
    });
    const tariff = await tariffRes.json().catch(() => null);

    if (!tariff) {
      return NextResponse.json({ error: "Gagal mengambil tarif J&T. Coba lagi." }, { status: 502 });
    }
    if (tariff.configured === false) {
      return NextResponse.json({ error: "J&T API belum dikonfigurasi.", configured: false });
    }
    if (!tariffRes.ok) {
      return NextResponse.json({ error: tariff.error || "Tarif J&T untuk tujuan ini tidak tersedia." }, { status: tariffRes.status });
    }

    return NextResponse.json({
      data: Array.isArray(tariff.data) ? tariff.data : [],
      weight_grams: weightGrams,
      city,
      kecamatan,
    });
  } catch (error) {
    console.error("[OPS] ongkir:", error);
    return NextResponse.json({ error: "Gagal cek ongkir. Coba lagi." }, { status: 500 });
  }
}
