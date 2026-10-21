import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { logCommissionEvent, syncCommissionStatus } from "@/lib/affiliate/commission";
import { getAffiliateSettings } from "@/lib/affiliate/settings";

/**
 * Admin → Affiliate → Transaksi & Komisi.
 *
 * Daftar pesanan yang berasal dari referral beserta komisinya: nilai transaksi,
 * dasar perhitungan, nominal komisi, status, dan riwayat perubahan komisi.
 */

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);

  const { data: rows } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const commissions = (rows || []) as {
    id: string;
    order_id: string;
    order_number: string | null;
    affiliate_id: string;
    link_id: string | null;
    base_amount: number;
    rate: number;
    amount: number;
    paid_amount: number;
    status: string;
    reason: string | null;
    available_at: string | null;
    breakdown: unknown;
    created_at: string;
    updated_at: string;
  }[];

  // Selaraskan status dengan pesanan supaya data admin tidak basi.
  for (const c of commissions) {
    if (c.status !== "dibayarkan") {
      await syncCommissionStatus(supabase, c.order_id, { settings, actor: "admin-sync" });
    }
  }

  const affiliateIds = Array.from(new Set(commissions.map((c) => c.affiliate_id)));
  let affiliateMap = new Map<string, { full_name: string; affiliate_code: string; email: string }>();
  if (affiliateIds.length > 0) {
    const { data: affiliates } = await supabase
      .from("affiliates")
      .select("id, full_name, affiliate_code, email")
      .in("id", affiliateIds);
    for (const a of (affiliates || []) as { id: string; full_name: string; affiliate_code: string; email: string }[]) {
      affiliateMap.set(a.id, { full_name: a.full_name, affiliate_code: a.affiliate_code, email: a.email });
    }
  }

  const orderIds = commissions.map((c) => c.order_id);
  let orderMap = new Map<string, { order_number: string | null; status: string; total: number; created_at: string }>();
  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at")
      .in("id", orderIds);
    for (const o of (orders || []) as { id: string; order_number: string | null; status: string; total: number; created_at: string }[]) {
      orderMap.set(o.id, o);
    }
  }

  const { data: events } = commissions.length
    ? await supabase
        .from("affiliate_commission_events")
        .select("commission_id, from_status, to_status, amount, note, actor, created_at")
        .in("commission_id", commissions.map((c) => c.id))
        .order("created_at", { ascending: false })
        .limit(1000)
    : { data: [] as unknown[] };

  const eventsByCommission = new Map<string, typeof events>();
  for (const e of (events || []) as {
    commission_id: string;
    from_status: string | null;
    to_status: string | null;
    amount: number | null;
    note: string | null;
    actor: string | null;
    created_at: string;
  }[]) {
    const list = eventsByCommission.get(e.commission_id) || [];
    list.push(e);
    eventsByCommission.set(e.commission_id, list);
  }

  const result = commissions.map((c) => {
    const affiliate = affiliateMap.get(c.affiliate_id);
    const order = orderMap.get(c.order_id);
    return {
      id: c.id,
      orderId: c.order_id,
      orderNumber: c.order_number || order?.order_number || null,
      orderStatus: order?.status || null,
      orderTotal: order?.total ?? null,
      orderCreatedAt: order?.created_at || c.created_at,
      affiliateId: c.affiliate_id,
      affiliateName: affiliate?.full_name || "-",
      affiliateCode: affiliate?.affiliate_code || "-",
      affiliateEmail: affiliate?.email || "-",
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
      history: eventsByCommission.get(c.id) || [],
    };
  });

  return NextResponse.json({
    commissions: result,
    totals: {
      count: result.length,
      base: result.reduce((s, c) => s + c.baseAmount, 0),
      amount: result.reduce((s, c) => s + c.amount, 0),
      pending: result.filter((c) => c.status === "menunggu").reduce((s, c) => s + c.amount, 0),
      approved: result.filter((c) => c.status === "disetujui").reduce((s, c) => s + c.amount, 0),
      paid: result.filter((c) => c.status === "dibayarkan").reduce((s, c) => s + c.amount, 0),
      rejected: result.filter((c) => c.status === "ditolak").reduce((s, c) => s + c.amount, 0),
    },
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

/**
 * Tindakan manual admin atas komisi: setujui / tolak / batalkan.
 * Riwayat tetap tercatat di ledger (tidak menghapus apa pun).
 */
export async function PATCH(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const action = String(body.action || "").trim();
  const reason = String(body.reason || "").trim();

  if (!id) return NextResponse.json({ error: "ID komisi wajib diisi." }, { status: 400 });
  if (!["approve", "reject", "reset"].includes(action)) {
    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  }
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: commission } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!commission) {
    return NextResponse.json({ error: "Komisi tidak ditemukan." }, { status: 404 });
  }

  const row = commission as {
    id: string;
    status: string;
    amount: number;
    paid_amount: number;
    order_id: string;
  };

  if (row.status === "dibayarkan" && action !== "reset") {
    return NextResponse.json(
      { error: "Komisi yang sudah dibayarkan tidak bisa diubah statusnya secara manual." },
      { status: 400 },
    );
  }

  const nextStatus = action === "approve" ? "disetujui" : action === "reject" ? "ditolak" : "menunggu";
  const nextReason =
    action === "approve"
      ? "Disetujui manual oleh admin."
      : action === "reject"
        ? reason
        : "Dikembalikan ke status menunggu oleh admin.";

  await supabase
    .from("affiliate_commissions")
    .update({
      status: nextStatus,
      reason: nextReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logCommissionEvent(supabase, {
    commissionId: id,
    fromStatus: row.status as never,
    toStatus: nextStatus as never,
    amount: row.amount,
    note: nextReason,
    actor: "admin",
  });

  await supabase.from("affiliate_activity_log").insert({
    affiliate_id: (commission as { affiliate_id: string }).affiliate_id,
    actor_type: "admin",
    action: `komisi_${action}`,
    from_status: row.status,
    to_status: nextStatus,
    amount: row.amount,
    note: nextReason,
  });

  return NextResponse.json({ ok: true });
}
