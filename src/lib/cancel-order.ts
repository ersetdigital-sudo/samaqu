import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cancelOrder } from "@/lib/jnt";

/**
 * Satu jalur pembatalan pesanan untuk semua pemanggil: customer (`/api/orders/cancel`),
 * admin (tombol "Batalkan di J&T" dan chip status `dibatalkan` di `/api/admin/orders`),
 * serta cron auto-cancel (`/api/cron/auto-cancel`).
 *
 * Urutannya sengaja begini: resi di-void dulu di J&T, baru status pesanan jadi `dibatalkan`.
 * Kalau J&T menolak, status tidak diubah supaya resi aktif tidak tertinggal di belakang
 * pesanan yang sudah dianggap batal.
 */

export interface CancelableOrder {
  id: string;
  order_number: string;
  status: string;
  awb_no: string | null;
  jnt_order_id: string | null;
}

export type CancelOrderResult =
  | { success: true; voidedJnt: boolean }
  | { success: false; stage: "jnt" | "status"; message: string };

/**
 * Pesanan checkout website (`SMQ-`) memotong stok saat dibuat (`samaqu_decrement_stock`);
 * Open Order (`CYO-`) tidak pernah memotong stok — jadi hanya pesanan website yang stoknya
 * dikembalikan, kalau tidak stok yang tidak pernah dipotong malah bertambah.
 */
const hasStockReservation = (orderNumber: string) => orderNumber.startsWith("SMQ-");

export async function cancelOrderCompletely(
  order: CancelableOrder,
  remark: string
): Promise<CancelOrderResult> {
  const supabase = getSupabaseAdmin();
  const cancelId = order.jnt_order_id || order.awb_no;

  if (cancelId) {
    const result = await cancelOrder({ orderId: cancelId, remark });
    if (!result.success) {
      console.error("[CANCEL] J&T void failed:", order.order_number, result.raw);
      // `desc` J&T cuma berbunyi "Request berhasil" walau ditolaknya di `detail[].reason`,
      // jadi alasan aslinya yang dipakai sebagai pesan error.
      return {
        success: false,
        stage: "jnt",
        message:
          result.raw?.detail?.[0]?.reason ||
          result.raw?.desc ||
          "Gagal membatalkan pengiriman di J&T",
      };
    }
    console.log("[CANCEL] J&T voided:", order.order_number, cancelId);
  }

  if (hasStockReservation(order.order_number)) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, color, size, quantity")
      .eq("order_id", order.id);

    for (const item of items ?? []) {
      if (item.product_id && item.color && item.size && item.quantity) {
        await supabase.rpc("samaqu_restore_stock", {
          p_product_id: item.product_id,
          p_color: item.color,
          p_size: item.size,
          p_qty: item.quantity,
        });
      }
    }
  }

  // Tabel `orders` tidak punya trigger yang mengisi jam pembatalan, jadi jamnya ditulis sendiri:
  // linimasa "Pesanan dibatalkan" (strukSteps) membacanya. Dua kolom ditulis — `cancelled_at`
  // (jam batal yang sebenarnya, akurat) dan `updated_at` (dipakai baris lama, lihat `waktuBatal`
  // di src/lib/akun-format.ts).
  //
  // Kolom `cancelled_at` datang dari `supabase/migrations/20261011_order_cancelled_at.sql` yang
  // dijalankan manual di SQL Editor Supabase. Selama SQL itu belum dijalankan, update diulang
  // tanpa kolom tersebut supaya pembatalan tetap jalan — jam batalnya jatuh ke `updated_at`.
  const cancelledAt = new Date().toISOString();
  const statusUpdate = { status: "dibatalkan", updated_at: cancelledAt };
  let { error } = await supabase
    .from("orders")
    .update({ ...statusUpdate, cancelled_at: cancelledAt })
    .eq("id", order.id);

  if (error?.message?.includes("cancelled_at")) {
    console.warn("[CANCEL] orders.cancelled_at belum ada (SQL-nya belum dijalankan), menulis tanpa kolom itu:", error.message);
    ({ error } = await supabase.from("orders").update(statusUpdate).eq("id", order.id));
  }

  if (error) {
    console.error("[CANCEL] Status update error:", order.order_number, error);
    return { success: false, stage: "status", message: "Gagal memperbarui status pesanan" };
  }

  console.log("[CANCEL] Order cancelled:", order.order_number);
  return { success: true, voidedJnt: !!cancelId };
}
