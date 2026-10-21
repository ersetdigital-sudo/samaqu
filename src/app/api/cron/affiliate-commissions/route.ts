import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncCommissionStatus } from "@/lib/affiliate/commission";
import { getAffiliateSettings } from "@/lib/affiliate/settings";

/**
 * Cron penyelarasan komisi affiliate.
 *
 * Menjalankan `syncCommissionStatus` untuk semua komisi yang belum final, supaya
 * komisi yang masa validasinya sudah habis benar-benar berpindah ke "disetujui"
 * tanpa harus menunggu affiliate membuka portalnya.
 *
 * Auth: sama seperti cron lain (`Authorization: Bearer $CRON_SECRET`).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);

  const { data: rows } = await supabase
    .from("affiliate_commissions")
    .select("order_id")
    .neq("status", "dibayarkan")
    .neq("status", "ditolak")
    .limit(500);

  const orderIds = (rows || []) as { order_id: string }[];
  let synced = 0;
  let errors = 0;

  for (const row of orderIds) {
    try {
      await syncCommissionStatus(supabase, row.order_id, { settings, actor: "cron" });
      synced += 1;
    } catch (e) {
      errors += 1;
      console.error("[CRON-AFFILIATE] Gagal menyelaraskan komisi", row.order_id, e);
    }
  }

  return NextResponse.json({ checked: orderIds.length, synced, errors });
}
