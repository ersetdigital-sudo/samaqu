import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cancelOrderCompletely } from "@/lib/cancel-order";

/**
 * Auto-cancel unpaid orders after 24 hours.
 * GET /api/cron/auto-cancel — safe for Vercel Cron or manual trigger.
 *
 * Pembatalannya memakai jalur bersama `cancelOrderCompletely()`: kalau pesanan ternyata
 * masih memegang resi J&T (mis. statusnya pernah ditarik balik ke `pending` dari chip admin),
 * resinya di-void dulu baru status jadi `dibatalkan` — kalau J&T menolak, pesanan dilewati
 * supaya resi aktif tidak menggantung. Stok dikembalikan untuk pesanan yang benar-benar
 * memotongnya (penanda `orders.stock_reserved`), baik checkout website (`SMQ-`) maupun
 * Open Order (`CYO-`) — lihat src/lib/cancel-order.ts.
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
    .select("id, order_number, status, awb_no, jnt_order_id, stock_reserved")
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
      const result = await cancelOrderCompletely(order, "Dibatalkan otomatis (belum dibayar 24 jam)");

      if (result.success) {
        cancelled++;
        console.log("[AUTO-CANCEL] Cancelled:", order.order_number);
      } else {
        console.error("[AUTO-CANCEL] Gagal membatalkan:", order.order_number, result.stage, result.message);
        errors++;
      }
    } catch (e) {
      console.error("[AUTO-CANCEL] Unexpected error:", order.order_number, e);
      errors++;
    }
  }

  return NextResponse.json({ cancelled, errors, total: expiredOrders.length });
}
