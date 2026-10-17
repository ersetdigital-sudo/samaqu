import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, opsActorEmail, unauthorized } from "@/lib/ops-auth";

/**
 * Retur & Tukar Size.
 *
 *   GET  /api/ops/returns                        → daftar (filter type/status/q)
 *   GET  /api/ops/returns?return_number=TKR-…    → satu retur + item
 *   POST /api/ops/returns                        → ajukan retur
 *   PATCH /api/ops/returns                       → approve/reject/receive/complete/cancel/update
 *
 * Stok TIDAK disentuh saat pengajuan. Pergerakan stok baru terjadi saat aksi `receive`
 * lewat RPC `samaqu_apply_return_stock` (atomik + idempoten), dan dibalik lewat
 * `samaqu_reverse_return_stock` saat dibatalkan.
 */

const TYPE = ["tukar_size", "return"];
const STATUSES = ["diajukan", "disetujui", "barang_diterima", "pengganti_dikirim", "selesai", "ditolak", "dibatalkan"];

type Admin = ReturnType<typeof getSupabaseAdmin>;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function wibDateKey() {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function newReturnNumber(type: string) {
  const prefix = type === "tukar_size" ? "TKR" : "RTN";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${wibDateKey()}-${suffix}`;
}

async function itemsOf(admin: Admin, ids: string[]) {
  if (ids.length === 0) return {} as Record<string, any[]>;
  const { data } = await admin
    .from("return_items")
    .select("*")
    .in("return_id", ids)
    .order("created_at", { ascending: true });
  const grouped: Record<string, any[]> = {};
  for (const item of data || []) {
    (grouped[item.return_id] ||= []).push(item);
  }
  return grouped;
}

async function detail(admin: Admin, returnNumber: string) {
  const { data: record, error } = await admin
    .from("returns")
    .select("*")
    .eq("return_number", returnNumber)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 as const };
  if (!record) return { error: "Retur tidak ditemukan", status: 404 as const };
  const id = String(record.id);
  const grouped = await itemsOf(admin, [id]);
  return { record: { ...record, items: grouped[id] || [] } };
}

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  const admin = getSupabaseAdmin();
  const sp = new URL(req.url).searchParams;
  const returnNumber = String(sp.get("return_number") || "").trim();

  try {
    if (returnNumber) {
      const result = await detail(admin, returnNumber);
      if ("error" in result) return bad(String(result.error || "Retur tidak ditemukan"), Number(result.status) || 500);
      return NextResponse.json({ item: result.record });
    }

    const type = String(sp.get("type") || "").trim();
    const status = String(sp.get("status") || "").trim();
    const q = String(sp.get("q") || "").trim().toLowerCase();
    const limitRaw = Number(sp.get("limit") || 300);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 300;

    let query = admin.from("returns").select("*").order("created_at", { ascending: false }).limit(limit);
    if (TYPE.includes(type)) query = query.eq("type", type);
    if (STATUSES.includes(status)) query = query.eq("status", status);

    const { data: rows, error } = await query;
    if (error) return bad(error.message, 500);

    const filtered = q
      ? (rows || []).filter((row) =>
          [row.return_number, row.order_number, row.customer_name, row.customer_whatsapp]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q)),
        )
      : rows || [];

    const grouped = await itemsOf(admin, filtered.map((row) => row.id));
    return NextResponse.json({
      items: filtered.map((row) => ({ ...row, items: grouped[row.id] || [] })),
    });
  } catch (error) {
    console.error("[OPS] returns GET:", error);
    return bad("Gagal mengambil data retur", 500);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  const admin = getSupabaseAdmin();

  try {
    const body = await req.json().catch(() => ({}));
    const type = String(body?.type || "").trim();
    const orderNumber = String(body?.order_number || "").trim();
    const inputItems = Array.isArray(body?.items) ? body.items : [];

    if (!TYPE.includes(type)) return bad("Jenis retur tidak valid");
    if (!orderNumber) return bad("Nomor pesanan wajib diisi");
    if (inputItems.length === 0) return bad("Pilih minimal satu produk");

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, order_number, customer_id, customer_name, customer_whatsapp, status, order_items(*)")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (orderError) return bad(orderError.message, 500);
    if (!order) return bad("Pesanan tidak ditemukan", 404);
    if (order.status === "dibatalkan") return bad("Pesanan yang dibatalkan tidak bisa diretur");

    const orderItems = new Map((order.order_items || []).map((item: any) => [item.id, item]));
    const rows: Record<string, unknown>[] = [];

    for (const raw of inputItems) {
      const orderItem = orderItems.get(String(raw?.order_item_id || "")) as any;
      if (!orderItem) return bad("Item pesanan tidak cocok dengan pesanan ini");

      const qty = Math.max(1, Math.min(Number(raw?.qty) || 1, Number(orderItem.quantity) || 1));
      const condition = raw?.condition === "damaged" ? "damaged" : "sellable";
      const replacementSize =
        type === "tukar_size" ? String(raw?.replacement_size || "").trim().toUpperCase() : null;

      if (type === "tukar_size") {
        if (!replacementSize) return bad(`Ukuran pengganti untuk ${orderItem.product_name} wajib dipilih`);
        if (replacementSize === String(orderItem.size || "").toUpperCase()) {
          return bad(`Ukuran pengganti ${orderItem.product_name} harus berbeda dari ukuran asal`);
        }
        const { data: variant } = await admin
          .from("product_variants")
          .select("stock")
          .eq("product_id", orderItem.product_id)
          .eq("color", orderItem.color || "default")
          .eq("size", replacementSize)
          .maybeSingle();
        if (!variant) return bad(`Ukuran ${replacementSize} tidak tersedia untuk ${orderItem.product_name}`);
        // Kecukupan stok dicek atomik oleh `samaqu_apply_return_stock` (menghormati stok
        // bersama ala series). Pengecekan `stock` mentah di sini bisa salah untuk series turunan.
      }

      rows.push({
        order_item_id: orderItem.id,
        product_id: orderItem.product_id,
        product_name: orderItem.product_name,
        color: orderItem.color || "default",
        size: String(orderItem.size || ""),
        replacement_size: replacementSize,
        qty,
        price: Number(orderItem.price) || 0,
        condition,
      });
    }

    const createdBy = await opsActorEmail(req);
    let record: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await admin
        .from("returns")
        .insert({
          return_number: newReturnNumber(type),
          type,
          status: "diajukan",
          order_id: order.id,
          order_number: order.order_number,
          customer_id: order.customer_id || null,
          customer_name: order.customer_name || "-",
          customer_whatsapp: order.customer_whatsapp || null,
          reason: String(body?.reason || "").trim() || null,
          notes: String(body?.notes || "").trim() || null,
          shipping_in_cost: Math.max(0, Math.round(Number(body?.shipping_in_cost) || 0)),
          shipping_out_cost: Math.max(0, Math.round(Number(body?.shipping_out_cost) || 0)),
          shipping_payment_status: body?.shipping_payment_status === "paid" ? "paid" : "unpaid",
          refund_amount: Math.max(0, Math.round(Number(body?.refund_amount) || 0)),
          refund_method: String(body?.refund_method || "").trim() || null,
          created_by: createdBy,
        })
        .select("*")
        .single();
      if (!error) {
        record = data;
        break;
      }
      lastError = error;
      if (error.code !== "23505") break;
    }
    if (!record) return bad(lastError?.message || "Gagal menyimpan retur", 500);

    const { data: insertedItems, error: itemError } = await admin
      .from("return_items")
      .insert(rows.map((row) => ({ ...row, return_id: record.id })))
      .select("*");
    if (itemError) {
      await admin.from("returns").delete().eq("id", record.id);
      return bad(itemError.message, 500);
    }

    return NextResponse.json({ item: { ...record, items: insertedItems || [] } }, { status: 201 });
  } catch (error) {
    console.error("[OPS] returns POST:", error);
    return bad("Gagal membuat retur", 500);
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  const admin = getSupabaseAdmin();

  try {
    const body = await req.json().catch(() => ({}));
    const returnNumber = String(body?.return_number || "").trim();
    const action = String(body?.action || "").trim();
    if (!returnNumber) return bad("Nomor retur wajib diisi");

    const current = await detail(admin, returnNumber);
    if ("error" in current) return bad(String(current.error || "Retur tidak ditemukan"), Number(current.status) || 500);
    const record = current.record;

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const now = new Date().toISOString();

    if (action === "update") {
      if (["selesai", "dibatalkan"].includes(record.status)) return bad("Retur yang sudah final tidak bisa diubah");
      if (body?.reason !== undefined) patch.reason = String(body.reason || "").trim() || null;
      if (body?.notes !== undefined) patch.notes = String(body.notes || "").trim() || null;
      if (body?.shipping_in_awb !== undefined) patch.shipping_in_awb = String(body.shipping_in_awb || "").trim() || null;
      if (body?.shipping_in_cost !== undefined) patch.shipping_in_cost = Math.max(0, Math.round(Number(body.shipping_in_cost) || 0));
      if (body?.shipping_out_cost !== undefined) patch.shipping_out_cost = Math.max(0, Math.round(Number(body.shipping_out_cost) || 0));
      if (body?.shipping_payment_status !== undefined) {
        patch.shipping_payment_status = body.shipping_payment_status === "paid" ? "paid" : "unpaid";
      }
      if (body?.refund_amount !== undefined) patch.refund_amount = Math.max(0, Math.round(Number(body.refund_amount) || 0));
      if (body?.refund_method !== undefined) patch.refund_method = String(body.refund_method || "").trim() || null;
      if (body?.refund_status !== undefined) patch.refund_status = String(body.refund_status || "").trim() || null;
    } else if (action === "approve") {
      if (record.status !== "diajukan") return bad("Hanya retur berstatus diajukan yang bisa disetujui");
      patch.status = "disetujui";
      patch.approved_at = now;
    } else if (action === "reject") {
      if (record.status !== "diajukan") return bad("Hanya retur berstatus diajukan yang bisa ditolak");
      patch.status = "ditolak";
      patch.cancelled_at = now;
    } else if (action === "receive") {
      if (record.status !== "disetujui") return bad("Setujui retur dulu sebelum menerima barang");
      const { error } = await admin.rpc("samaqu_apply_return_stock", { p_return_id: String(record.id) });
      if (error) return bad(error.message || "Gagal menerapkan pergerakan stok", 400);
      patch.status = "barang_diterima";
      patch.received_at = now;
    } else if (action === "complete") {
      if (!["barang_diterima", "pengganti_dikirim"].includes(record.status)) {
        return bad("Status retur belum siap diselesaikan");
      }
      if (record.type === "tukar_size" && !record.shipping_out_awb) {
        return bad("Buat resi pengganti dulu sebelum menyelesaikan tukar size");
      }
      patch.status = "selesai";
      patch.completed_at = now;
      if (record.type === "return") patch.refund_status = "selesai";
    } else if (action === "cancel") {
      if (record.status === "selesai") return bad("Retur yang sudah selesai tidak bisa dibatalkan");
      if (record.stock_applied_at) {
        const { error } = await admin.rpc("samaqu_reverse_return_stock", { p_return_id: String(record.id) });
        if (error) return bad(error.message || "Gagal membalik pergerakan stok", 400);
      }
      patch.status = "dibatalkan";
      patch.cancelled_at = now;
    } else {
      return bad("Aksi retur tidak dikenal");
    }

    const { data: updated, error } = await admin
      .from("returns")
      .update(patch)
      .eq("id", record.id)
      .select("*")
      .single();
    if (error) return bad(error.message, 500);

    return NextResponse.json({ item: { ...updated, items: record.items } });
  } catch (error) {
    console.error("[OPS] returns PATCH:", error);
    return bad("Gagal memperbarui retur", 500);
  }
}
