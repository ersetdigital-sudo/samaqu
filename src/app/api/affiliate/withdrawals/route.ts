import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { affiliateSession, affiliateUnauthorized } from "@/lib/affiliate/auth";
import { computeBalance, syncCommissionsForAffiliate } from "@/lib/affiliate/commission";
import { feeForMethod, getAffiliateSettings } from "@/lib/affiliate/settings";
import { loadAffiliateWithdrawals } from "@/lib/affiliate/queries";
import type { AffiliateWithdrawalRow } from "@/lib/affiliate/types";

/**
 * Pengajuan pencairan komisi.
 *
 * Aturan:
 *  - Backend yang memvalidasi saldo (tidak ada angka dari browser yang dipercaya).
 *  - Saldo "tersedia" = komisi yang disetujui dikurangi pencairan yang sedang berjalan,
 *    sehingga dua pengajuan tidak bisa memakai saldo yang sama.
 *  - Pengajuan YANG DISETUJUI admin belum berarti uang sudah ditransfer:
 *    statusnya `diproses` dulu, baru `berhasil` setelah admin mencatat bukti pembayaran.
 */

function makeWithdrawalRef(): string {
  const now = new Date();
  const stamp =
    String(now.getFullYear()).slice(2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WD-${stamp}-${suffix}`;
}

export async function GET(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);
  await syncCommissionsForAffiliate(supabase, session.affiliate.id, { settings });

  const balance = await computeBalance(supabase, session.affiliate.id);
  const withdrawals = await loadAffiliateWithdrawals(supabase, session.affiliate.id);

  return NextResponse.json({
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      ref: w.ref,
      amount: w.amount,
      fee: w.fee,
      netAmount: w.net_amount,
      method: w.method,
      bankName: w.bank_name,
      bankNumber: w.bank_number,
      bankHolder: w.bank_holder,
      status: w.status,
      reason: w.reason,
      proofNote: w.proof_note,
      createdAt: w.created_at,
      paidAt: w.paid_at,
      history: w.history,
    })),
    balance,
    settings: {
      min_withdrawal: settings.min_withdrawal,
      withdrawal_fee_bank: settings.withdrawal_fee_bank,
      withdrawal_fee_ewallet: settings.withdrawal_fee_ewallet,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  if (session.affiliate.status !== "aktif") {
    return NextResponse.json({ error: "Akun affiliate belum aktif." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Math.round(Number(body.amount || 0));
  const method = String(body.method || "").trim();
  const accountId = String(body.accountId || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Jumlah penarikan wajib diisi." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);
  await syncCommissionsForAffiliate(supabase, session.affiliate.id, { settings });

  if (settings.min_withdrawal > 0 && amount < settings.min_withdrawal) {
    return NextResponse.json(
      { error: `Jumlah kurang dari batas minimum pencairan (${settings.min_withdrawal}).` },
      { status: 400 },
    );
  }

  const { data: account } = await supabase
    .from("affiliate_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("affiliate_id", session.affiliate.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "Rekening tujuan tidak ditemukan." }, { status: 404 });
  }

  const balance = await computeBalance(supabase, session.affiliate.id);
  if (amount > balance.available) {
    return NextResponse.json(
      { error: `Jumlah melebihi saldo tersedia (${balance.available}).` },
      { status: 400 },
    );
  }

  const fee = feeForMethod(settings, method || (account as { method: string }).method);
  const netAmount = Math.max(0, amount - fee);

  const ref = makeWithdrawalRef();

  const { data, error } = await supabase
    .from("affiliate_withdrawals")
    .insert({
      ref,
      affiliate_id: session.affiliate.id,
      amount,
      fee,
      net_amount: netAmount,
      method: method || (account as { method: string }).method,
      account_id: accountId,
      bank_name: (account as { bank: string }).bank,
      bank_number: (account as { account_number: string }).account_number,
      bank_holder: (account as { account_holder: string }).account_holder,
      status: "menunggu",
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("[affiliate] Gagal membuat pengajuan pencairan:", error.message);
    return NextResponse.json({ error: "Gagal membuat pengajuan pencairan." }, { status: 500 });
  }

  await supabase.from("affiliate_withdrawal_events").insert({
    withdrawal_id: (data as AffiliateWithdrawalRow).id,
    from_status: null,
    to_status: "menunggu",
    note: "Pengajuan penarikan dibuat.",
    actor: session.userId,
  });

  await supabase.from("affiliate_activity_log").insert({
    affiliate_id: session.affiliate.id,
    actor_type: "affiliate",
    actor_id: session.userId,
    action: "ajuan_pencairan",
    amount,
    to_status: "menunggu",
    note: `Pengajuan pencairan ${ref}.`,
  });

  return NextResponse.json({ withdrawal: data });
}

export async function PATCH(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const action = String(body.action || "").trim();

  if (!id) return NextResponse.json({ error: "ID pengajuan wajib diisi." }, { status: 400 });
  if (action !== "cancel") {
    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("affiliate_withdrawals")
    .select("*")
    .eq("id", id)
    .eq("affiliate_id", session.affiliate.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }
  if ((existing as AffiliateWithdrawalRow).status !== "menunggu") {
    return NextResponse.json(
      { error: "Penarikan yang sudah diproses tidak dapat dibatalkan." },
      { status: 400 },
    );
  }

  await supabase
    .from("affiliate_withdrawals")
    .update({ status: "ditolak", reason: "Dibatalkan oleh mitra.", updated_at: new Date().toISOString() })
    .eq("id", id);

  await supabase.from("affiliate_withdrawal_events").insert({
    withdrawal_id: id,
    from_status: "menunggu",
    to_status: "ditolak",
    note: "Penarikan dibatalkan oleh mitra · saldo dikembalikan.",
    actor: session.userId,
  });

  return NextResponse.json({ ok: true });
}
