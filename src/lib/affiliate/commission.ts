import type { SupabaseClient } from "@supabase/supabase-js";
import { getAffiliateSettings, rateForProduct } from "./settings";
import type { AffiliateSettingsRow } from "./types";
import type {
  AffiliateBalance,
  AffiliateCommissionRow,
  CommissionBreakdown,
  CommissionStatus,
} from "./types";

/**
 * Mesin komisi Affiliate.
 *
 * Aturan utama:
 *  - Perhitungan SELALU di backend (tidak pernah dari angka browser).
 *  - Satu pesanan = satu baris komisi (kolom `order_id` UNIQUE) → tidak ada komisi ganda.
 *  - Setiap perubahan status tercatat di `affiliate_commission_events` (ledger audit).
 *  - Saldo tidak pernah diubah langsung: saldo = turunan dari ledger komisi + pencairan.
 *  - Status pesanan existing TIDAK diubah oleh modul ini.
 */

export interface CommissionItem {
  productId: string;
  price: number;
  quantity: number;
}

export interface CommissionComputation {
  baseAmount: number;
  rate: number;
  amount: number;
  breakdown: CommissionBreakdown[];
}

/** Hitung komisi dari item pesanan + konfigurasi yang berlaku. */
export function computeCommission(
  items: CommissionItem[],
  settings: AffiliateSettingsRow,
): CommissionComputation {
  const safeItems = items.filter((item) => Number(item.quantity) > 0);
  const baseAmount = safeItems.reduce(
    (sum, item) => sum + Math.max(0, Math.round(item.price)) * Math.max(0, Math.round(item.quantity)),
    0,
  );

  if (settings.commission_mode === "fixed") {
    const amount = Math.max(0, Math.round(settings.fixed_commission ?? 0));
    return {
      baseAmount,
      rate: 0,
      amount,
      breakdown: safeItems.map((item) => ({
        productId: item.productId,
        price: Math.round(item.price),
        quantity: Math.round(item.quantity),
        rate: 0,
        amount: 0,
      })),
    };
  }

  const breakdown: CommissionBreakdown[] = safeItems.map((item) => {
    const rate = rateForProduct(settings, item.productId);
    const lineTotal = Math.round(item.price) * Math.round(item.quantity);
    return {
      productId: item.productId,
      price: Math.round(item.price),
      quantity: Math.round(item.quantity),
      rate,
      amount: Math.round((lineTotal * rate) / 100),
    };
  });

  const amount = breakdown.reduce((sum, line) => sum + line.amount, 0);
  const rate = settings.commission_percent;

  return { baseAmount, rate, amount, breakdown };
}

/**
 * Catat komisi untuk sebuah pesanan. IDEMPOTEN:
 * `order_id` UNIQUE + upsert ignoreDuplicates → pemanggilan ulang (webhook/proses
 * order dipanggil dua kali) tidak menghasilkan komisi ganda.
 */
export async function recordCommissionForOrder(
  supabase: SupabaseClient,
  params: {
    orderId: string;
    orderNumber?: string | null;
    affiliateId: string;
    linkId?: string | null;
    items: CommissionItem[];
    settings?: AffiliateSettingsRow;
    actor?: string;
  },
): Promise<AffiliateCommissionRow | null> {
  const settings = params.settings ?? (await getAffiliateSettings(supabase));
  const computed = computeCommission(params.items, settings);

  const { data, error } = await supabase
    .from("affiliate_commissions")
    .upsert(
      {
        order_id: params.orderId,
        order_number: params.orderNumber ?? null,
        affiliate_id: params.affiliateId,
        link_id: params.linkId ?? null,
        base_amount: computed.baseAmount,
        rate: computed.rate,
        amount: computed.amount,
        paid_amount: 0,
        status: "menunggu" as CommissionStatus,
        breakdown: computed.breakdown,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "order_id", ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("[affiliate] Gagal mencatat komisi:", error.message);
    return null;
  }

  if (data) {
    await supabase.from("affiliate_commission_events").insert({
      commission_id: data.id,
      from_status: null,
      to_status: "menunggu",
      amount: computed.amount,
      note: "Komisi dicatat dari pesanan yang teratribusi referral.",
      actor: params.actor ?? "system",
    });
  }

  return (data as AffiliateCommissionRow | null) ?? null;
}

/** Catat perubahan status komisi di ledger audit. */
export async function logCommissionEvent(
  supabase: SupabaseClient,
  params: {
    commissionId: string;
    fromStatus?: CommissionStatus | null;
    toStatus?: CommissionStatus | null;
    amount?: number | null;
    note?: string | null;
    actor?: string | null;
  },
): Promise<void> {
  await supabase.from("affiliate_commission_events").insert({
    commission_id: params.commissionId,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    amount: params.amount ?? null,
    note: params.note ?? null,
    actor: params.actor ?? "system",
  });
}

/**
 * Samakan status komisi dengan status pesanan + kebijakan yang berlaku.
 *
 * Dipanggil setelah pesanan berubah status (batal / dikirim / selesai) dan saat
 * admin membuka daftar komisi. Tidak mengubah status pesanan.
 */
export async function syncCommissionStatus(
  supabase: SupabaseClient,
  orderId: string,
  options?: { settings?: AffiliateSettingsRow; actor?: string },
): Promise<void> {
  const settings = options?.settings ?? (await getAffiliateSettings(supabase));
  const actor = options?.actor ?? "system";

  const { data: commission } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!commission) return;

  const row = commission as AffiliateCommissionRow;
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, paid_at, updated_at, created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return;

  let next: CommissionStatus = row.status;
  let reason: string | null = row.reason;
  let availableAt: string | null = row.available_at;
  let note = false;

  if (order.status === "dibatalkan") {
    if (settings.reversal_on_cancel) {
      if (row.status === "dibayarkan") {
        // Sudah dibayar: status TIDAK diubah (uang sudah keluar), tapi penyesuaiannya
        // dicatat supaya auditor tetap tahu why.
        next = "dibayarkan";
        reason = "Pesanan dibatalkan setelah komisi dibayarkan (penyesuaian tercatat).";
        note = true;
      } else {
        next = "ditolak";
        reason = "Pesanan dibatalkan, komisi dibatalkan (penyesuaikan).";
      }
    }
  } else if (row.status === "dibayarkan" || row.status === "disetujui") {
    // Sudah disetujui admin (atau dibayarkan) — penyelarasan otomatis TIDAK boleh
    // menurunkannya kembali ke "menunggu".
    return;
  } else if (order.status === "selesai") {
    const isPaid = !!order.paid_at;
    if (settings.require_paid && !isPaid) {
      next = "menunggu";
      reason = "Menunggu pembayaran terverifikasi.";
      availableAt = null;
    } else {
      const completedAt = new Date(order.updated_at || order.created_at).getTime();
      const readyAt = completedAt + settings.validation_days * 24 * 60 * 60 * 1000;
      availableAt = new Date(readyAt).toISOString();
      if (Date.now() >= readyAt) {
        next = "disetujui";
        reason = "Masa validasi selesai, komisi masuk saldo tersedia.";
      } else {
        next = "menunggu";
        reason = `Dalam masa validasi ${settings.validation_days} hari.`;
      }
    }
  } else if (order.status === "dikirim") {
    next = "menunggu";
    reason = "Menunggu pesanan selesai.";
    availableAt = null;
  } else if (order.status === "diproses" || order.status === "pending") {
    next = "menunggu";
    reason = settings.require_paid && !order.paid_at
      ? "Menunggu pembayaran terverifikasi."
      : "Menunggu pesanan selesai.";
    availableAt = null;
  }

  if (next === row.status && (reason ?? null) === (row.reason ?? null) && !note) return;

  await supabase
    .from("affiliate_commissions")
    .update({ status: next, reason, available_at: availableAt, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  await logCommissionEvent(supabase, {
    commissionId: row.id,
    fromStatus: row.status,
    toStatus: next,
    amount: row.amount,
    note: reason,
    actor,
  });
}

/**
 * Samakan SEMUA komisi milik satu affiliate dengan status pesanannya.
 * Dipakai sebelum menampilkan daftar komisi / saldo supaya angka di portal selalu mutakhir.
 */
export async function syncCommissionsForAffiliate(
  supabase: SupabaseClient,
  affiliateId: string,
  options?: { settings?: AffiliateSettingsRow; actor?: string },
): Promise<void> {
  const settings = options?.settings ?? (await getAffiliateSettings(supabase));

  const { data: rows } = await supabase
    .from("affiliate_commissions")
    .select("order_id")
    .eq("affiliate_id", affiliateId)
    .neq("status", "dibayarkan");

  const orderIds = (rows || []).map((r) => (r as { order_id: string }).order_id);
  for (const orderId of orderIds) {
    await syncCommissionStatus(supabase, orderId, { settings, actor: options?.actor ?? "system" });
  }
}

/** Hitung saldo affiliate dari ledger komisi + pencairan (tidak ada field saldo yang bisa dispo). */
export async function computeBalance(
  supabase: SupabaseClient,
  affiliateId: string,
): Promise<AffiliateBalance> {
  const { data: commissionRows } = await supabase
    .from("affiliate_commissions")
    .select("status, amount, paid_amount")
    .eq("affiliate_id", affiliateId);

  const commissions = (commissionRows || []) as {
    status: CommissionStatus;
    amount: number;
    paid_amount: number;
  }[];

  let pending = 0;
  let approvedRemaining = 0;
  let paid = 0;
  let rejected = 0;

  for (const c of commissions) {
    const amount = Number(c.amount || 0);
    const paidAmount = Number(c.paid_amount || 0);
    if (c.status === "menunggu") pending += amount;
    else if (c.status === "disetujui") {
      approvedRemaining += Math.max(0, amount - paidAmount);
      paid += paidAmount;
    } else if (c.status === "dibayarkan") {
      paid += paidAmount;
    } else if (c.status === "ditolak") {
      rejected += amount;
    }
  }

  const { data: withdrawalRows } = await supabase
    .from("affiliate_withdrawals")
    .select("status, amount, net_amount")
    .eq("affiliate_id", affiliateId);

  const withdrawals = (withdrawalRows || []) as {
    status: string;
    amount: number;
    net_amount: number;
  }[];

  let processing = 0;
  let withdrawn = 0;
  for (const w of withdrawals) {
    if (w.status === "menunggu" || w.status === "diproses") processing += Number(w.amount || 0);
    else if (w.status === "berhasil") withdrawn += Number(w.net_amount || 0);
  }

  return {
    pending,
    approved: approvedRemaining,
    available: Math.max(0, approvedRemaining - processing),
    paid,
    rejected,
    processing,
    withdrawn,
  };
}

/**
 * Alokasikan nominal pencairan ke komisi yang sudah disetujui (terlama dulu).
 * Dipanggil saat admin menandai pencairan sebagai "berhasil".
 *
 * Saldo yang dipakai = `amount` (nominal pengajuan). Dana yang benar-benar
 * ditransfer = `net_amount` (amount dikurangi biaya admin).
 */
export async function allocateWithdrawalToCommissions(
  supabase: SupabaseClient,
  withdrawalId: string,
  actor = "admin",
): Promise<number> {
  const { data: withdrawal } = await supabase
    .from("affiliate_withdrawals")
    .select("*")
    .eq("id", withdrawalId)
    .maybeSingle();

  if (!withdrawal) return 0;

  const w = withdrawal as {
    id: string;
    affiliate_id: string;
    amount: number;
  };

  let left = Number(w.amount || 0);
  if (left <= 0) return 0;

  const { data: rows } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("affiliate_id", w.affiliate_id)
    .eq("status", "disetujui")
    .order("available_at", { ascending: true, nullsFirst: false });

  const commissions = (rows || []) as AffiliateCommissionRow[];

  for (const c of commissions) {
    if (left <= 0) break;
    const remaining = Math.max(0, Number(c.amount || 0) - Number(c.paid_amount || 0));
    if (remaining <= 0) continue;

    const take = Math.min(remaining, left);
    const newPaid = Number(c.paid_amount || 0) + take;
    const newStatus: CommissionStatus = newPaid >= Number(c.amount || 0) ? "dibayarkan" : "disetujui";

    await supabase
      .from("affiliate_commissions")
      .update({
        paid_amount: newPaid,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id);

    await logCommissionEvent(supabase, {
      commissionId: c.id,
      fromStatus: c.status,
      toStatus: newStatus,
      amount: take,
      note: `Dialokasikan ke pencairan ${w.id}.`,
      actor,
    });

    left -= take;
  }

  return Number(w.amount || 0) - left;
}
