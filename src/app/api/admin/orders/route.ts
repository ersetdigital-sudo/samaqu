import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: "Order ID dan status wajib diisi" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", orderId);

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
    const { orderId } = await request.json();
    console.log("[ADMIN] Delete order request:", orderId);

    if (!orderId) {
      return NextResponse.json({ error: "Order ID wajib diisi" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Delete order items first
    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("[ADMIN] Failed to delete order items:", itemsError);
      return NextResponse.json({ error: "Gagal menghapus item pesanan", detail: itemsError.message }, { status: 500 });
    }

    // Delete the order
    const { error: orderError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (orderError) {
      console.error("[ADMIN] Failed to delete order:", orderError);
      return NextResponse.json({ error: "Gagal menghapus pesanan", detail: orderError.message }, { status: 500 });
    }

    console.log("[ADMIN] Order deleted successfully:", orderId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ADMIN] Delete order error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server", detail: error.message }, { status: 500 });
  }
}
