import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createJntOrderForOrder } from "@/lib/jnt/order-from-order";

export async function PATCH(request: NextRequest) {
  try {
    const { orderId, orderNumber, status, action } = await request.json();
    const identifier = orderNumber || orderId;
    console.log("[ADMIN] PATCH request:", { identifier, status, action });

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
      // `orders.updated_at` tidak diisi trigger apa pun — jam pembatalan ditulis manual
      // supaya linimasa "Pesanan dibatalkan" (strukSteps) akurat.
      const { error } = await supabaseAdmin
        .from("orders")
        .update({ status: "dibatalkan", updated_at: new Date().toISOString() })
        .eq("order_number", identifier);

      if (error) {
        console.error("[ADMIN] Failed to update order status after J&T cancel:", error);
        return NextResponse.json({ error: "J&T dibatalkan tapi gagal update status" }, { status: 500 });
      }

      // Restore stock for all order items (resolves base product via RPC)
      const { data: orderItems } = await supabaseAdmin
        .from("order_items")
        .select("product_id, color, size, quantity")
        .eq("order_id", (await supabaseAdmin.from("orders").select("id").eq("order_number", identifier).single()).data?.id);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (item.product_id && item.color && item.size && item.quantity) {
            await supabaseAdmin.rpc("samaqu_restore_stock", {
              p_product_id: item.product_id,
              p_color: item.color,
              p_size: item.size,
              p_qty: item.quantity,
            });
          }
        }
        console.log("[ADMIN] Stock restored for cancelled order:", identifier, "items:", orderItems.length);
      }

      return NextResponse.json({ success: true, message: "Berhasil membatalkan pesanan di J&T" });
    }

    // ── "Atur Pesanan": buat resi J&T setelah pembayaran diverifikasi ──
    // Dulu resi terbit otomatis saat customer checkout; sekarang admin yang memicunya (ala
    // Shopee Seller Centre). Sukses → pesanan langsung berstatus `diproses`.
    if (action === "createJnt") {
      const { data: order, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_whatsapp, shipping_address, shipping_city, shipping_postal_code, total, weight, payment_method, awb_no, status, order_items(product_id, product_name, quantity)"
        )
        .eq("order_number", identifier)
        .single();

      if (fetchError || !order) {
        return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
      }

      if (order.awb_no) {
        return NextResponse.json(
          { error: `Pesanan ini sudah punya nomor resi J&T (${order.awb_no}).` },
          { status: 400 }
        );
      }

      if (order.status === "dibatalkan") {
        return NextResponse.json({ error: "Pesanan sudah dibatalkan, resi tidak bisa dibuat." }, { status: 400 });
      }

      const result = await createJntOrderForOrder({
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_whatsapp: order.customer_whatsapp,
        shipping_address: order.shipping_address,
        shipping_city: order.shipping_city,
        shipping_postal_code: order.shipping_postal_code,
        total: order.total,
        weight: order.weight,
        payment_method: order.payment_method,
        order_items: order.order_items ?? [],
      });

      if (!result.success || !result.awbNo) {
        console.error("[ADMIN] J&T order create failed:", identifier, result.error);
        return NextResponse.json({ error: `Gagal membuat resi J&T: ${result.error}` }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ awb_no: result.awbNo, jnt_order_id: order.order_number, status: "diproses" })
        .eq("id", order.id);

      if (updateError) {
        console.error("[ADMIN] Failed to save J&T AWB:", updateError);
        return NextResponse.json({ error: "Resi J&T terbit tapi gagal disimpan. Coba lagi." }, { status: 500 });
      }

      console.log("[ADMIN] J&T AWB created:", identifier, result.awbNo);
      return NextResponse.json({ success: true, awbNo: result.awbNo, status: "diproses" });
    }

    // Normal status update
    if (!status) {
      return NextResponse.json({ error: "Status wajib diisi" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("order_number", identifier);

    if (error) {
      console.error("[ADMIN] Failed to update order status:", JSON.stringify(error));
      return NextResponse.json({ error: "Gagal memperbarui status pesanan", detail: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ADMIN] Update order status error:", error?.message, error?.stack);
    return NextResponse.json({ error: "Terjadi kesalahan server", detail: error?.message }, { status: 500 });
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

    // Fetch order status + items before deletion for stock restoration
    const { data: fullOrder } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", uuidId)
      .single();

    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("product_id, color, size, quantity")
      .eq("order_id", uuidId);

    // Restore stock for pending/dibatalkan orders (stock was decremented)
    if (orderItems && orderItems.length > 0 && fullOrder?.status === "pending") {
      for (const item of orderItems) {
        if (item.product_id && item.color && item.size && item.quantity) {
          await supabaseAdmin.rpc("samaqu_restore_stock", {
            p_product_id: item.product_id,
            p_color: item.color,
            p_size: item.size,
            p_qty: item.quantity,
          });
        }
      }
      console.log("[ADMIN] Stock restored for deleted order:", identifier, "items:", orderItems.length);
    }

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
