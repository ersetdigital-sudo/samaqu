import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { affiliateSession, affiliateUnauthorized, maskAccountNumber } from "@/lib/affiliate/auth";
import type { AffiliateAccountRow } from "@/lib/affiliate/types";

/**
 * Rekening / e-wallet tujuan pencairan.
 *
 * Nomor rekening disimpan penuh di server (dipakai admin saat transfer), tapi yang
 * dikirim ke browser affiliate HANYA versi tersamar — nomor lengkap tidak pernah
 * keluar dari server.
 */

const BANKS = ["BCA", "BRI", "Mandiri", "BNI", "BSI", "CIMB Niaga", "Permata", "Danamon"];
const EWALLETS = ["DANA", "OVO", "GoPay", "ShopeePay", "LinkAja"];

export async function GET(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("affiliate_accounts")
    .select("*")
    .eq("affiliate_id", session.affiliate.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  const accounts = (data || []) as AffiliateAccountRow[];

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      method: a.method,
      bank: a.bank,
      number: maskAccountNumber(a.account_number),
      holder: a.account_holder,
      isPrimary: a.is_primary,
      createdAt: a.created_at,
    })),
    banks: BANKS,
    ewallets: EWALLETS,
  });
}

export async function POST(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const body = await req.json().catch(() => ({}));
  const method = String(body.method || "Transfer Bank").trim();
  const bank = String(body.bank || "").trim();
  const number = String(body.number || "").replace(/\D/g, "");
  const holder = String(body.holder || "").trim();

  if (method !== "Transfer Bank" && method !== "E-wallet") {
    return NextResponse.json({ error: "Pilih jenis rekening." }, { status: 400 });
  }
  if (!bank) {
    return NextResponse.json({ error: method === "E-wallet" ? "Pilih e-wallet." : "Pilih bank." }, { status: 400 });
  }
  if (number.length < 8) {
    return NextResponse.json({ error: "Nomor rekening minimal 8 digit angka." }, { status: 400 });
  }
  if (holder.length < 3) {
    return NextResponse.json({ error: "Nama pemilik wajib diisi." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("affiliate_accounts")
    .select("id", { count: "exact", head: true })
    .eq("affiliate_id", session.affiliate.id);

  const { data, error } = await supabase
    .from("affiliate_accounts")
    .insert({
      affiliate_id: session.affiliate.id,
      method,
      bank,
      account_number: number,
      account_holder: holder,
      is_primary: (count || 0) === 0,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("[affiliate] Gagal menyimpan rekening:", error.message);
    return NextResponse.json({ error: "Gagal menyimpan rekening." }, { status: 500 });
  }

  const account = data as AffiliateAccountRow;
  return NextResponse.json({
    account: {
      id: account.id,
      method: account.method,
      bank: account.bank,
      number: maskAccountNumber(account.account_number),
      holder: account.account_holder,
      isPrimary: account.is_primary,
      createdAt: account.created_at,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "ID rekening wajib diisi." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("affiliate_accounts")
    .select("*")
    .eq("id", id)
    .eq("affiliate_id", session.affiliate.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Rekening tidak ditemukan." }, { status: 404 });
  }

  const account = existing as AffiliateAccountRow;

  if (body.isPrimary === true) {
    await supabase.from("affiliate_accounts").update({ is_primary: false }).eq("affiliate_id", session.affiliate.id);
    await supabase.from("affiliate_accounts").update({ is_primary: true }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.bank === "string" && body.bank.trim()) patch.bank = body.bank.trim();
  if (typeof body.holder === "string" && body.holder.trim().length >= 3) patch.account_holder = body.holder.trim();
  const digits = String(body.number || "").replace(/\D/g, "");
  if (digits.length >= 8) patch.account_number = digits;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  await supabase.from("affiliate_accounts").update(patch).eq("id", id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const id = String(req.nextUrl.searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "ID rekening wajib diisi." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("affiliate_accounts")
    .select("id, is_primary")
    .eq("id", id)
    .eq("affiliate_id", session.affiliate.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Rekening tidak ditemukan." }, { status: 404 });
  }

  // Rekening yang sudah dipakai pengajuan pencairan tidak boleh dihapus (riwayat).
  const { count } = await supabase
    .from("affiliate_withdrawals")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Rekening ini sudah dipakai pada pengajuan pencairan dan tidak bisa dihapus." },
      { status: 400 },
    );
  }

  await supabase.from("affiliate_accounts").delete().eq("id", id);

  if ((existing as { is_primary: boolean }).is_primary) {
    const { data: rest } = await supabase
      .from("affiliate_accounts")
      .select("id")
      .eq("affiliate_id", session.affiliate.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const first = (rest || [])[0] as { id: string } | undefined;
    if (first) {
      await supabase.from("affiliate_accounts").update({ is_primary: true }).eq("id", first.id);
    }
  }

  return NextResponse.json({ ok: true });
}
