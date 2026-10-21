import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { affiliateSession, affiliateUnauthorized } from "@/lib/affiliate/auth";
import { getAffiliateSettings } from "@/lib/affiliate/settings";
import { computeBalance, syncCommissionsForAffiliate } from "@/lib/affiliate/commission";
import { countAffiliateClicks, loadAffiliateOrders } from "@/lib/affiliate/queries";

/**
 * Profil & ringkasan affiliate yang sedang login.
 * Semua angka dihitung dari ledger (komisi + pesanan + klik), bukan dari field statis.
 */

export async function GET(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);

  // Sinkronkan status komisi dengan status pesanan terbaru supaya saldo selalu mutakhir.
  await syncCommissionsForAffiliate(supabase, session.affiliate.id, { settings });

  const balance = await computeBalance(supabase, session.affiliate.id);
  const orders = await loadAffiliateOrders(supabase, session.affiliate.id);
  const clicksTotal = await countAffiliateClicks(supabase, session.affiliate.id);
  const clicks30 = await countAffiliateClicks(
    supabase,
    session.affiliate.id,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  );

  const sales = orders
    .filter((o) => !["dibatalkan", "pending"].includes(o.status))
    .reduce((sum, o) => sum + Number(o.subtotal || 0), 0);

  const commissionsByStatus = orders.reduce<Record<string, number>>((acc, order) => {
    const status = order.commission?.status;
    if (!status) return acc;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    affiliate: session.affiliate,
    settings: {
      enabled: settings.enabled,
      commission_mode: settings.commission_mode,
      commission_percent: settings.commission_percent,
      fixed_commission: settings.fixed_commission,
      product_commission: settings.product_commission,
      attribution_model: settings.attribution_model,
      referral_validity_days: settings.referral_validity_days,
      require_paid: settings.require_paid,
      require_completed: settings.require_completed,
      validation_days: settings.validation_days,
      min_withdrawal: settings.min_withdrawal,
      withdrawal_fee_bank: settings.withdrawal_fee_bank,
      withdrawal_fee_ewallet: settings.withdrawal_fee_ewallet,
    },
    balance,
    stats: {
      clicksTotal,
      clicks30,
      orders: orders.length,
      sales,
      commissionsByStatus,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? session.affiliate.full_name).trim();
  const displayName = String(body.displayName ?? session.affiliate.display_name ?? "").trim();
  const phone = String(body.phone ?? session.affiliate.phone ?? "").trim();

  if (fullName.length < 3) {
    return NextResponse.json({ error: "Nama lengkap minimal 3 karakter." }, { status: 400 });
  }
  if (displayName && displayName.length < 3) {
    return NextResponse.json({ error: "Nama tampilan minimal 3 karakter." }, { status: 400 });
  }
  if (phone && !/^0\d{8,13}$/.test(phone.replace(/\D/g, ""))) {
    return NextResponse.json({ error: "Nomor telepon harus diawali 0 dan berisi 9–14 digit." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("affiliates")
    .update({
      full_name: fullName,
      display_name: displayName || fullName,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.affiliate.id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[affiliate] Gagal menyimpan profil:", error.message);
    return NextResponse.json({ error: "Gagal menyimpan profil." }, { status: 500 });
  }

  return NextResponse.json({ affiliate: data });
}
