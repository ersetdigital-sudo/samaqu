import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { affiliateSession, affiliateUnauthorized } from "@/lib/affiliate/auth";
import { computeBalance, syncCommissionsForAffiliate } from "@/lib/affiliate/commission";
import { getAffiliateSettings } from "@/lib/affiliate/settings";
import { loadAffiliateCommissions } from "@/lib/affiliate/queries";

/**
 * Riwayat komisi affiliate + saldo.
 * Setiap baris komisi disertai ledger perubahannya (`affiliate_commission_events`).
 */
export async function GET(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);
  await syncCommissionsForAffiliate(supabase, session.affiliate.id, { settings });

  const commissions = await loadAffiliateCommissions(supabase, session.affiliate.id);
  const balance = await computeBalance(supabase, session.affiliate.id);

  let events: {
    id: number;
    commission_id: string;
    from_status: string | null;
    to_status: string | null;
    amount: number | null;
    note: string | null;
    actor: string | null;
    created_at: string;
  }[] = [];

  if (commissions.length > 0) {
    const { data } = await supabase
      .from("affiliate_commission_events")
      .select("id, commission_id, from_status, to_status, amount, note, actor, created_at")
      .in("commission_id", commissions.map((c) => c.id))
      .order("created_at", { ascending: false })
      .limit(500);
    events = (data || []) as typeof events;
  }

  return NextResponse.json({
    commissions: commissions.map((c) => ({
      id: c.id,
      orderId: c.order_id,
      orderNumber: c.order_number,
      linkId: c.link_id,
      baseAmount: c.base_amount,
      rate: Number(c.rate || 0),
      amount: c.amount,
      paidAmount: c.paid_amount,
      status: c.status,
      reason: c.reason,
      availableAt: c.available_at,
      breakdown: c.breakdown || [],
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    events,
    balance,
    settings: {
      commission_mode: settings.commission_mode,
      commission_percent: settings.commission_percent,
      fixed_commission: settings.fixed_commission,
      validation_days: settings.validation_days,
      require_paid: settings.require_paid,
      require_completed: settings.require_completed,
    },
  });
}
