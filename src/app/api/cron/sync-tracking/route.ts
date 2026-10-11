import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { trackShipment } from "@/lib/jnt/track";
import { isDelivered } from "@/lib/jnt/track-status";

/**
 * Sinkronkan status pesanan dengan pelacakan J&T: begitu paket **diterima** penerima
 * (J&T `status_code` 200), pesanan otomatis jadi `selesai` — admin tidak perlu mengubah
 * statusnya sendiri.
 *
 * GET /api/cron/sync-tracking — aman dipanggil Vercel Cron / cron eksternal
 * (header `Authorization: Bearer $CRON_SECRET`) atau manual. Hanya pesanan yang punya
 * resi dan statusnya belum final (`pending`/`diproses`/`dikirim`) yang diperiksa;
 * pesanan tanpa resi dilewati tanpa error.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends CRON_SECRET header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, awb_no, status")
    .in("status", ["pending", "diproses", "dikirim"])
    .not("awb_no", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[SYNC-TRACKING] Fetch error:", error);
    return NextResponse.json({ error: "Gagal mengambil pesanan" }, { status: 500 });
  }

  let checked = 0;
  let completed = 0;
  let errors = 0;

  for (const order of orders || []) {
    if (!order.awb_no) continue;
    checked++;
    try {
      const result = await trackShipment(order.awb_no);
      // Resi belum dikenal J&T / kredensial kosong → bukan paket diterima, lewati.
      if (!result.success || !isDelivered(result.data)) continue;

      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "selesai" })
        .eq("id", order.id);

      if (updateError) {
        console.error("[SYNC-TRACKING] Status update error:", order.order_number, updateError);
        errors++;
      } else {
        completed++;
        console.log("[SYNC-TRACKING] Paket diterima → selesai:", order.order_number);
      }
    } catch (e) {
      console.error("[SYNC-TRACKING] Unexpected error:", order.order_number, e);
      errors++;
    }
  }

  return NextResponse.json({ checked, completed, errors });
}
