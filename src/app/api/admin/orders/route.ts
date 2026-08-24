import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest) {
  try {
    const { orderId, orderNumber, status, action } = await request.json();
    const identifier = orderNumber || orderId;

    if (!identifier) {
      return NextResponse.json({ error: "Order ID wajib diisi" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Cancel J&T order before updating status
    if (action === "cancelJnt") {
      const { data: order, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("awb_no, jnt_order_id")
        .eq("order_number", identifier)
        .single();

      if (fetchError || !order) {
        return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
      }

      if (!order.awb_no && !order.jnt_order_id) {
        return NextResponse.json({ error: "Pesanan ini belum memiliki AWB J&T" }, { status: 400 });
      }

      const cancelId = order.jnt_order_id || order.awb_no;
      console.log("[ADMIN] Cancelling J&T order:", cancelId);

      const { cancelOrder } = await import("@/lib/jnt");
      const cancelResult = await cancelOrder({ orderId: cancelId, remark: "Dibatalkan oleh admin" });
      console.log("[ADMIN] J&T cancel result:", cancelResult);

      if (!cancelResult.success) {
        const desc = cancelResult.raw?.desc || "Gagal membatalkan di J&T";
        return NextResponse.json({ error: `Gagal batalkan J&T: ${desc}` }, { status: 400 });
      }

      // Update status to dibatalkan
      const { error } = await supabaseAdmin
        .from("orders")
        .update({ status: "dibatalkan" })
        .eq("order_number", identifier);

      if (error) {
        console.error("[ADMIN] Failed to update order status after J&T cancel:", error);
        return NextResponse.json({ error: "J&T dibatalkan tapi gagal update status" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Berhasil membatalkan pesanan di J&T" });
    }

    // Normal status update
    if (!status) {
      return NextResponse.json({ error: "Status wajib diisi" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("order_number", identifier);

    if (error) {
      console.error("[ADMIN] Failed to update order status:", error);
      return NextResponse.json({ error: "Gagal memperbarui status pesanan" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN] Update order status error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { orderId, orderNumber } = await request.json();
    const identifier = orderNumber || orderId;
    console.log("[ADMIN] Delete order request:", identifier);

    if (!identifier) {
      return NextResponse.json({ error: "Order ID wajib diisi" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Lookup UUID id from order_number
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_number", identifier)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const uuidId = order.id;

    // Delete voucher usages first (foreign key reference)
    const { data: deletedVouchers, error: voucherError } = await supabaseAdmin
      .from("voucher_usages")
      .delete()
      .eq("order_id", uuidId)
      .select();

    console.log("[ADMIN] Voucher usages delete result:", { deleted: deletedVouchers?.length ?? 0, error: voucherError?.message });

    if (voucherError) {
      console.error("[ADMIN] Failed to delete voucher usages:", voucherError);
      return NextResponse.json({ error: "Gagal menghapus data voucher", detail: voucherError.message }, { status: 500 });
    }

    // Delete order items
    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", uuidId);

    if (itemsError) {
      console.error("[ADMIN] Failed to delete order items:", itemsError);
      return NextResponse.json({ error: "Gagal menghapus item pesanan", detail: itemsError.message }, { status: 500 });
    }

    // Delete the order
    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", uuidId);

    if (orderError) {
      console.error("[ADMIN] Failed to delete order:", orderError);
      return NextResponse.json({ error: "Gagal menghapus pesanan", detail: orderError.message }, { status: 500 });
    }

    console.log("[ADMIN] Order deleted successfully:", identifier);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ADMIN] Delete order error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server", detail: error.message }, { status: 500 });
  }
}
