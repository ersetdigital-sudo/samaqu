import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { allocateWithdrawalToCommissions } from "@/lib/affiliate/commission";
import type { AffiliateWithdrawalRow } from "@/lib/affiliate/types";

/**
 * Admin → Affiliate → Pencairan Komisi.
 *
 * Alur pencairan:
 *   menunggu → diproses (disetujui admin) → berhasil (sudah ditransfer + bukti dicatat)
 *   menunggu/diproses → ditolak (dengan alasan)
 *
 * Penting: status `berhasil` HANYA bisa disetel admin setelah mencatat bukti
 * pembayaran. Menyetelnya juga mengalokasikan saldo komisi ke pencairan tsb.
 */

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const supabase = getSupabaseAdmin();

  const { data: rows } = await supabase
    .from("affiliate_withdrawals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  const withdrawals = (rows || []) as AffiliateWithdrawalRow[];

  const affiliateIds = Array.from(new Set(withdrawals.map((w) => w.affiliate_id)));
  let affiliateMap = new Map<string, { full_name: string; affiliate_code: string; email: string; phone: string | null }>();
  if (affiliateIds.length > 0) {
    const { data: affiliates } = await supabase
      .from("affiliates")
      .select("id, full_name, affiliate_code, email, phone")
      .in("id", affiliateIds);
    for (const a of (affiliates || []) as { id: string; full_name: string; affiliate_code: string; email: string; phone: string | null }[]) {
      affiliateMap.set(a.id, a);
    }
  }

  const { data: events } = withdrawals.length
    ? await supabase
        .from("affiliate_withdrawal_events")
        .select("withdrawal_id, from_status, to_status, note, actor, created_at")
        .in("withdrawal_id", withdrawals.map((w) => w.id))
        .order("created_at", { ascending: true })
    : { data: [] as unknown[] };

  const byWithdrawal = new Map<string, typeof events>();
  for (const e of (events || []) as {
    withdrawal_id: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    actor: string | null;
    created_at: string;
  }[]) {
    const list = byWithdrawal.get(e.withdrawal_id) || [];
    list.push(e);
    byWithdrawal.set(e.withdrawal_id, list);
  }

  const result = withdrawals.map((w) => {
    const affiliate = affiliateMap.get(w.affiliate_id);
    return {
      id: w.id,
      ref: w.ref,
      affiliateId: w.affiliate_id,
      affiliateName: affiliate?.full_name || "-",
      affiliateCode: affiliate?.affiliate_code || "-",
      affiliateEmail: affiliate?.email || "-",
      affiliatePhone: affiliate?.phone || null,
      amount: w.amount,
      fee: w.fee,
      netAmount: w.net_amount,
      method: w.method,
      bankName: w.bank_name,
      bankNumber: w.bank_number,
      bankHolder: w.bank_holder,
      status: w.status,
      reason: w.reason,
      proofUrl: w.proof_url,
      proofNote: w.proof_note,
      reviewedAt: w.reviewed_at,
      paidAt: w.paid_at,
      createdAt: w.created_at,
      history: byWithdrawal.get(w.id) || [],
    };
  });

  return NextResponse.json({
    withdrawals: result,
    totals: {
      count: result.length,
      pending: result.filter((w) => w.status === "menunggu").reduce((s, w) => s + w.amount, 0),
      processing: result.filter((w) => w.status === "diproses").reduce((s, w) => s + w.amount, 0),
      paid: result.filter((w) => w.status === "berhasil").reduce((s, w) => s + w.netAmount, 0),
      rejected: result.filter((w) => w.status === "ditolak").reduce((s, w) => s + w.amount, 0),
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const action = String(body.action || "").trim();
  const reason = String(body.reason || "").trim();
  const proofNote = String(body.proofNote || "").trim();
  const proofUrl = String(body.proofUrl || "").trim();

  if (!id) return NextResponse.json({ error: "ID pengajuan wajib diisi." }, { status: 400 });

  const allowed = ["process", "pay", "reject"];
  if (!allowed.includes(action)) {
    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: withdrawal } = await supabase
    .from("affiliate_withdrawals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!withdrawal) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  const row = withdrawal as AffiliateWithdrawalRow;

  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
  }
  if (action === "pay" && !proofNote && !proofUrl) {
    return NextResponse.json(
      { error: "Catat bukti pembayaran (catatan atau URL bukti) sebelum menandai pencairan berhasil." },
      { status: 400 },
    );
  }
  if (row.status === "berhasil") {
    return NextResponse.json({ error: "Pencairan ini sudah ditandai berhasil." }, { status: 400 });
  }
  if (row.status === "ditolak") {
    return NextResponse.json({ error: "Pencairan yang sudah ditolak tidak bisa diproses lagi." }, { status: 400 });
  }

  let nextStatus: AffiliateWithdrawalRow["status"];
  let note: string;

  if (action === "process") {
    nextStatus = "diproses";
    note = "Penarikan diproses tim keuangan.";
  } else if (action === "pay") {
    nextStatus = "berhasil";
    note = proofNote || "Dana penarikan berhasil dikirim ke rekening tujuan.";
  } else {
    nextStatus = "ditolak";
    note = reason;
  }

  const { data, error } = await supabase
    .from("affiliate_withdrawals")
    .update({
      status: nextStatus,
      reason: action === "reject" ? reason : row.reason,
      proof_note: proofNote || row.proof_note,
      proof_url: proofUrl || row.proof_url,
      reviewed_at: new Date().toISOString(),
      paid_at: nextStatus === "berhasil" ? new Date().toISOString() : row.paid_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[affiliate-admin] Gagal mengubah pengajuan pencairan:", error.message);
    return NextResponse.json({ error: "Gagal menyimpan perubahan." }, { status: 500 });
  }

  await supabase.from("affiliate_withdrawal_events").insert({
    withdrawal_id: id,
    from_status: row.status,
    to_status: nextStatus,
    note,
    actor: "admin",
  });

  await supabase.from("affiliate_activity_log").insert({
    affiliate_id: row.affiliate_id,
    actor_type: "admin",
    action: `pencairan_${action}`,
    from_status: row.status,
    to_status: nextStatus,
    amount: row.amount,
    note,
  });

  // Pencairan yang benar-benar dibayar → alokasikan saldo komisi ke pencairan ini.
  let allocated = 0;
  if (nextStatus === "berhasil") {
    allocated = await allocateWithdrawalToCommissions(supabase, id, "admin");
  }

  return NextResponse.json({ withdrawal: data, allocated });
}
