import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";

/**
 * Barang masuk (entity `StockIn` Base44).
 *
 * Penting: menambah barang masuk LANGSUNG menaikkan stok hidup di
 * `product_variants.stock` (RPC samaqu_increment_stock), dan menghapusnya
 * mengurangi lagi. Jadi stok website & dashboard internal tidak pernah beda.
 */
const FIELDS = ["date", "product_id", "product_name", "sku", "variant_color", "variant_size", "qty", "cost_per_unit", "notes", "source"] as const;

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) if (body?.[f] !== undefined && body[f] !== "") out[f] = body[f];
  if (out.qty !== undefined) out.qty = Number(out.qty) || 0;
  if (out.cost_per_unit !== undefined) out.cost_per_unit = Number(out.cost_per_unit) || 0;
  return out;
}

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "1000", 10) || 1000, 1), 3000);
  const desc = (sp.get("sort") || "").includes("desc");

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("stock_in")
    .select("*")
    .order("created_at", { ascending: !desc })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  try {
    const body = await req.json();
    const row = pick(body);
    if (!row.product_id || !row.date) return NextResponse.json({ error: "Produk & tanggal wajib" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("stock_in").insert(row).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Naikkan stok hidup kalau ada varian (warna & ukuran) yang jelas
    let stockUpdated = false;
    if (row.variant_color && row.variant_size && Number(row.qty) > 0) {
      const { data: ok } = await admin.rpc("samaqu_increment_stock", {
        p_product_id: row.product_id,
        p_color: String(row.variant_color),
        p_size: String(row.variant_size),
        p_qty: Number(row.qty),
      });
      stockUpdated = !!ok;
    }
    return NextResponse.json({ item: data, stockUpdated });
  } catch (e) {
    console.error("[OPS] stock-in POST:", e);
    return NextResponse.json({ error: "Gagal menyimpan barang masuk" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  try {
    const body = await req.json().catch(() => null);
    const id = body?.id || new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: row } = await admin.from("stock_in").select("*").eq("id", id).maybeSingle();

    // Baris otomatis (pembatalan/retur/tukar size) tidak boleh dihapus dari sini:
    // stoknya sudah diterapkan oleh alur asalnya dan pembalikannya harus lewat alur itu.
    if (row && ["batal", "tukar_size", "return"].includes(String(row.source || ""))) {
      return NextResponse.json(
        { error: "Baris otomatis dari retur/pembatalan tidak bisa dihapus dari sini" },
        { status: 400 },
      );
    }

    const { error, count } = await admin.from("stock_in").delete({ count: "exact" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Tarik kembali stoknya (guard: RPC increment menerima qty negatif)
    if (row && row.variant_color && row.variant_size && Number(row.qty) > 0) {
      await admin.rpc("samaqu_increment_stock", {
        p_product_id: row.product_id,
        p_color: String(row.variant_color),
        p_size: String(row.variant_size),
        p_qty: -Math.abs(Number(row.qty)),
      });
    }
    return NextResponse.json({ deleted: count ?? 0 });
  } catch (e) {
    console.error("[OPS] stock-in DELETE:", e);
    return NextResponse.json({ error: "Gagal menghapus barang masuk" }, { status: 500 });
  }
}
