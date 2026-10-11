import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cancelOrder } from "@/lib/jnt";

/**
 * POST /api/orders/cancel — customer membatalkan pesanannya sendiri dari halaman
 * /akun/pesanan/<order>. Body: { orderNumber }.
 *
 * Sama seperti jalur admin (`/api/admin/orders` action `cancelJnt`), pengiriman di J&T
 * dibatalkan dulu baru status pesanan jadi `dibatalkan` — kalau J&T menolak, status tidak
 * diubah supaya resi tidak menggantung. Bedanya: route ini memverifikasi sesi customer dan
 * memastikan pesanan itu memang miliknya.
 *
 * Stok tidak dikembalikan di sini karena pesanan Open Order (`CYO-`) tidak pernah mengurangi
 * stok di `/api/open-order` — memanggil `samaqu_restore_stock` justru menambah stok yang
 * tidak pernah dipotong.
 */

/** Status yang masih boleh dibatalkan customer (belum diserahkan ke kurir). */
const CANCELLABLE_STATUS = ["pending", "diproses"];

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    const { data: authData, error: authError } = token
      ? await supabaseAdmin.auth.getUser(token)
      : { data: { user: null }, error: null };
    const customerId = authData?.user?.id ?? null;
    if (authError || !customerId) {
      return NextResponse.json({ error: "Silakan masuk dulu untuk membatalkan pesanan." }, { status: 401 });
    }

    const body = await request.json();
    const orderNumber = String(body.orderNumber ?? "").trim();
    if (!orderNumber) {
      return NextResponse.json({ error: "Nomor pesanan wajib diisi" }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, awb_no, jnt_order_id, customer_id")
      .eq("order_number", orderNumber)
      .maybeSingle();

    // Pesanan milik orang lain dibalas 404, bukan 403 — supaya keberadaannya tidak bocor.
    if (!order || order.customer_id !== customerId) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    if (order.status === "dibatalkan") {
      return NextResponse.json({ error: "Pesanan ini sudah dibatalkan" }, { status: 400 });
    }

    if (!CANCELLABLE_STATUS.includes(order.status)) {
      return NextResponse.json(
        { error: "Pesanan sudah diserahkan ke kurir, jadi tidak bisa dibatalkan sendiri. Hubungi admin ya." },
        { status: 400 }
      );
    }

    // Resi sudah terbit saat pesanan dibuat, jadi pengirimannya ikut dibatalkan di J&T.
    if (order.awb_no || order.jnt_order_id) {
      const cancelId = order.jnt_order_id || order.awb_no;
      const cancelResult = await cancelOrder({ orderId: cancelId, remark: "Dibatalkan oleh customer" });
      if (!cancelResult.success) {
        console.error("[ORDER-CANCEL] J&T cancel failed:", cancelResult.raw);
        return NextResponse.json({ error: "Gagal membatalkan pengiriman di J&T. Coba lagi ya." }, { status: 400 });
      }
    }

    // Tabel `orders` tidak punya trigger yang mengisi `updated_at`, jadi jam pembatalan harus
    // ditulis sendiri: linimasa "Pesanan dibatalkan" (strukSteps) membacanya.
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "dibatalkan", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    if (updateError) {
      console.error("[ORDER-CANCEL] Status update error:", updateError);
      return NextResponse.json({ error: "Gagal memperbarui status pesanan" }, { status: 500 });
    }

    console.log("[ORDER-CANCEL] Cancelled by customer:", orderNumber);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ORDER-CANCEL] Failed:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
