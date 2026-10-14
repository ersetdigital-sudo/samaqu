import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createJntOrderForOrder } from "@/lib/jnt/order-from-order";
import { trackShipment } from "@/lib/jnt/track";
import { applyTrackingToOrder } from "@/lib/jnt/tracking-sync";
import { cancelOrderCompletely } from "@/lib/cancel-order";
import { notifyCustomerOrderPaid } from "@/lib/fonnte";
import { SITE_URL } from "@/lib/site-config";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";

export async function PATCH(request: NextRequest) {
  if (!(await isOpsAdmin(request))) return unauthorized();
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
        .select("id, order_number, status, awb_no, jnt_order_id, stock_reserved")
        .eq("order_number", identifier)
        .single();

      if (fetchError || !order) {
        return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
      }

      if (!order.awb_no && !order.jnt_order_id) {
        return NextResponse.json({ error: "Pesanan ini belum memiliki AWB J&T" }, { status: 400 });
      }

      // Void resi di J&T dulu, stok website dikembalikan, baru status `dibatalkan` — satu jalur
      // bersama dengan chip status & cron auto-cancel (lihat src/lib/cancel-order.ts).
      const result = await cancelOrderCompletely(order, "Dibatalkan oleh admin");
      if (!result.success) {
        return result.stage === "jnt"
          ? NextResponse.json({ error: `Gagal batalkan J&T: ${result.message}` }, { status: 400 })
          : NextResponse.json({ error: "J&T dibatalkan tapi gagal update status" }, { status: 500 });
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
          "id, order_number, customer_name, customer_whatsapp, shipping_address, shipping_city, shipping_postal_code, total, weight, payment_method, awb_no, status, order_items(product_id, product_name, color, size, quantity)"
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

      // PENTING: resi terbit ≠ paket sudah dikirim. Status pesanan tetap `diproses`
      // (masih "Perlu Dikirim") dan status pengiriman jadi `menunggu_pickup`. Baru naik ke
      // `dikirim` setelah J&T melaporkan pemindaian (lihat src/lib/jnt/tracking-sync.ts).
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          awb_no: result.awbNo,
          jnt_order_id: order.order_number,
          status: "diproses",
          shipping_status: "menunggu_pickup",
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("[ADMIN] Failed to save J&T AWB:", updateError);
        return NextResponse.json({ error: "Resi J&T terbit tapi gagal disimpan. Coba lagi." }, { status: 500 });
      }

      console.log("[ADMIN] J&T AWB created:", identifier, result.awbNo);
      return NextResponse.json({ success: true, awbNo: result.awbNo, status: "diproses", shippingStatus: "menunggu_pickup" });
    }

    // ── Sinkronkan status pengiriman dari tracking J&T (dipicu admin saat "Lacak Paket") ──
    // Logika transisinya sama dengan cron; ini cuma mempercepat saat admin sedang melihat pesanan.
    if (action === "syncTracking") {
      const { data: order, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, status, shipping_status, awb_no")
        .eq("order_number", identifier)
        .single();

      if (fetchError || !order) {
        return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
      }
      if (!order.awb_no) {
        return NextResponse.json({ error: "Pesanan ini belum punya nomor resi J&T." }, { status: 400 });
      }

      const track = await trackShipment(order.awb_no);
      const result = await applyTrackingToOrder(supabaseAdmin, order, track);
      return NextResponse.json({
        success: true,
        ...result,
        track: track.success ? track.data : null,
        trackError: track.success ? null : track.error || null,
      });
    }

    // Normal status update
    if (!status) {
      return NextResponse.json({ error: "Status wajib diisi" }, { status: 400 });
    }

    // Chip "Ubah Status" di drawer admin: `dibatalkan` harus lewat jalur void resi yang sama,
    // dan pesanan yang sudah punya resi J&T tidak boleh dikembalikan ke `pending` — kombinasi
    // itulah yang dulu meninggalkan pesanan `pending` dengan resi yang masih hidup.
    if (status === "dibatalkan" || status === "pending") {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, status, awb_no, jnt_order_id, stock_reserved")
        .eq("order_number", identifier)
        .maybeSingle();

      const resi = order?.awb_no || order?.jnt_order_id;

      if (status === "pending" && resi) {
        return NextResponse.json(
          { error: `Pesanan ini sudah punya resi J&T (${resi}). Status tidak bisa dikembalikan ke pending.` },
          { status: 400 }
        );
      }

      if (status === "dibatalkan" && order) {
        const result = await cancelOrderCompletely(order, "Dibatalkan oleh admin");
        if (!result.success) {
          return result.stage === "jnt"
            ? NextResponse.json({ error: `Gagal batalkan J&T: ${result.message}` }, { status: 400 })
            : NextResponse.json({ error: "Gagal memperbarui status pesanan" }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }
    }

    // Dipakai untuk notifikasi "pembayaran diterima" (pending → diproses): butuh status SEBELUM
    // diubah + kontak customer, jadi dibaca dulu.
    const previous = status === "diproses"
      ? (
          await supabaseAdmin
            .from("orders")
            .select("status, order_number, customer_name, customer_whatsapp")
            .eq("order_number", identifier)
            .maybeSingle()
        ).data
      : null;

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("order_number", identifier);

    if (error) {
      console.error("[ADMIN] Failed to update order status:", JSON.stringify(error));
      return NextResponse.json({ error: "Gagal memperbarui status pesanan", detail: error.message, code: error.code }, { status: 500 });
    }

    // Pembayaran baru diverifikasi (pending → diproses) → kabari customer lewat WhatsApp, supaya
    // admin tidak perlu mengetik pesan satu-satu. Best effort: gagal kirim tidak menggagalkan update.
    if (previous && previous.status === "pending" && previous.customer_whatsapp) {
      const number = previous.order_number || identifier;
      try {
        await notifyCustomerOrderPaid({
          orderNumber: number,
          customerName: previous.customer_name || "",
          customerWhatsapp: previous.customer_whatsapp,
          orderUrl: `${SITE_URL}/akun/pesanan/${number}`,
        });
      } catch (e) {
        console.error("[ADMIN] Notif pembayaran ke customer gagal:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ADMIN] Update order status error:", error?.message, error?.stack);
    return NextResponse.json({ error: "Terjadi kesalahan server", detail: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isOpsAdmin(request))) return unauthorized();
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
      .select("status, stock_reserved")
      .eq("id", uuidId)
      .single();

    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("product_id, color, size, quantity")
      .eq("order_id", uuidId);

    // Restore stock for pending orders whose stock was actually decremented. `stock_reserved`
    // memastikan pesanan Open Order (`CYO-`) LAMA — yang dibuat sebelum Open Order ikut memotong
    // stok — tidak ikut dikembalikan (stok hantu). Pesanan `dibatalkan` tidak disentuh di sini:
    // stoknya sudah dikembalikan `cancelOrderCompletely()` saat pembatalan.
    if (orderItems && orderItems.length > 0 && fullOrder?.status === "pending" && fullOrder?.stock_reserved === true) {
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
