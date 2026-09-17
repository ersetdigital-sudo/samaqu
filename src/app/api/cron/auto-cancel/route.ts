import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Auto-cancel unpaid orders after 24 hours.
 * GET /api/cron/auto-cancel — safe for Vercel Cron or manual trigger.
 * Restores stock via samaqu_restore_stock RPC (resolves base product).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends CRON_SECRET header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Find unpaid orders older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: expiredOrders, error: fetchError } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  if (fetchError) {
    console.error("[AUTO-CANCEL] Fetch error:", fetchError);
    return NextResponse.json({ error: "Gagal mengambil pesanan" }, { status: 500 });
  }

  if (!expiredOrders || expiredOrders.length === 0) {
    return NextResponse.json({ cancelled: 0, message: "Tidak ada pesanan expired" });
  }

  let cancelled = 0;
  let errors = 0;

  for (const order of expiredOrders) {
    try {
      // Fetch order items for stock restoration
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, color, size, quantity")
        .eq("order_id", order.id);

      // Restore stock for each item
      if (items && items.length > 0) {
        for (const item of items) {
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

      // Update status to auto-cancelled
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "dibatalkan" })
        .eq("id", order.id);

      if (updateError) {
        console.error("[AUTO-CANCEL] Status update error:", order.order_number, updateError);
        errors++;
      } else {
        cancelled++;
        console.log("[AUTO-CANCEL] Cancelled:", order.order_number, "items:", items?.length ?? 0);
      }
    } catch (e) {
      console.error("[AUTO-CANCEL] Unexpected error:", order.order_number, e);
      errors++;
    }
  }

  return NextResponse.json({ cancelled, errors, total: expiredOrders.length });
}
