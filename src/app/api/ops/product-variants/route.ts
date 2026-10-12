import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized, stockStatus } from "@/lib/ops-auth";

/**
 * Varian stok untuk dashboard internal.
 * Mengikuti entity `ProductVariant` Base44: satu baris = satu (produk, warna)
 * dengan `stock` berupa map ukuran { XS: n, S: n, ... }.
 * Sumbernya tabel `product_variants` milik website — baris (warna × ukuran)
 * dikelompokkan kembali jadi map, jadi stoknya identik dengan yang dijual.
 */
export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const admin = getSupabaseAdmin();
  const [{ data: products }, { data: rows }] = await Promise.all([
    admin.from("products").select("id, name, series, price, hpp"),
    admin.from("product_variants").select("product_id, color, size, stock, price_override, hex, display_order"),
  ]);

  const byId: Record<string, any> = {};
  for (const p of products || []) byId[p.id] = p;

  const grouped: Record<string, any> = {};
  for (const r of rows || []) {
    const key = `${r.product_id}||${r.color || "default"}`;
    if (!grouped[key]) {
      const prod = byId[r.product_id] || {};
      grouped[key] = {
        id: key,
        product_id: r.product_id,
        product_name: prod.name || r.product_id,
        series_name: prod.series || "",
        color: r.color || "default",
        hex: r.hex || null,
        price: prod.price ?? 0,
        hpp: prod.hpp ?? 0,
        stock: {},
      };
    }
    const size = (r.size || "").toUpperCase();
    if (size) grouped[key].stock[size] = Number(r.stock) || 0;
  }

  const items = Object.values(grouped).map((v: any) => {
    const total = Object.values(v.stock).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    return { ...v, status: stockStatus(total) };
  });

  return NextResponse.json({ items });
}
