/**
 * Tipe bersama modul Affiliate SAMAQU.
 *
 * Semua baris tabel affiliate dibaca lewat service role (server-side) lalu
 * difilter per-affiliate sebelum dikirim ke browser — lihat `src/lib/affiliate/auth.ts`.
 */

export type AffiliateStatus = "menunggu" | "aktif" | "ditolak" | "nonaktif";

export type CommissionStatus = "menunggu" | "disetujui" | "dibayarkan" | "ditolak";

export type WithdrawalStatus = "menunggu" | "diproses" | "berhasil" | "ditolak";

export interface AffiliateRow {
  id: string;
  user_id: string | null;
  affiliate_code: string;
  full_name: string;
  display_name: string | null;
  email: string;
  phone: string | null;
  status: AffiliateStatus;
  reject_reason: string | null;
  terms_accepted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateSettingsRow {
  id: number;
  enabled: boolean;
  commission_mode: "percent" | "fixed";
  commission_percent: number;
  fixed_commission: number | null;
  product_commission: Record<string, number>;
  attribution_model: "first_click" | "last_click";
  referral_validity_days: number;
  require_paid: boolean;
  require_completed: boolean;
  validation_days: number;
  min_withdrawal: number;
  withdrawal_fee_bank: number;
  withdrawal_fee_ewallet: number;
  reversal_on_cancel: boolean;
  reversal_on_return: boolean;
  updated_at: string;
}

export interface AffiliateLinkRow {
  id: string;
  affiliate_id: string;
  code: string;
  product_id: string | null;
  campaign: string;
  source: string | null;
  note: string | null;
  is_active: boolean;
  click_count: number;
  created_at: string;
}

export interface AffiliateCommissionRow {
  id: string;
  order_id: string;
  order_number: string | null;
  affiliate_id: string;
  link_id: string | null;
  base_amount: number;
  rate: number;
  amount: number;
  paid_amount: number;
  status: CommissionStatus;
  reason: string | null;
  available_at: string | null;
  breakdown?: CommissionBreakdown[] | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionBreakdown {
  productId: string;
  price: number;
  quantity: number;
  rate: number;
  amount: number;
}

export interface AffiliateCommissionEventRow {
  id: number;
  commission_id: string;
  from_status: string | null;
  to_status: string | null;
  amount: number | null;
  note: string | null;
  actor: string | null;
  created_at: string;
}

export interface AffiliateAccountRow {
  id: string;
  affiliate_id: string;
  method: string;
  bank: string;
  account_number: string;
  account_holder: string;
  is_primary: boolean;
  created_at: string;
}

export interface AffiliateWithdrawalRow {
  id: string;
  ref: string;
  affiliate_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  method: string;
  account_id: string | null;
  bank_name: string | null;
  bank_number: string | null;
  bank_holder: string | null;
  status: WithdrawalStatus;
  reason: string | null;
  proof_url: string | null;
  proof_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateWithdrawalEventRow {
  id: number;
  withdrawal_id: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor: string | null;
  created_at: string;
}

export interface AffiliateProductRow {
  id: string;
  affiliate_id: string;
  product_id: string;
  is_promoted: boolean;
  created_at: string;
}

export interface AffiliateActivityRow {
  id: number;
  affiliate_id: string | null;
  actor_type: string;
  actor_id: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  amount: number | null;
  note: string | null;
  created_at: string;
}

/** Ringkasan saldo affiliate (dihitung dari ledger, bukan dari field saldo). */
export interface AffiliateBalance {
  /** Komisi yang masih menunggu validasi/pemenuhan syarat. */
  pending: number;
  /** Komisi yang sudah disetujui dan belum dicairkan. */
  approved: number;
  /** Saldo yang boleh ditarik sekarang (approved dikurangi pencairan yang masih berjalan). */
  available: number;
  /** Total komisi yang sudah dibayarkan. */
  paid: number;
  /** Total komisi ditolak (batal/retur). */
  rejected: number;
  /** Nominal pencairan yang masih menunggu/diproses (sudah "direservasi"). */
  processing: number;
  /** Total dana yang sudah berhasil dicairkan. */
  withdrawn: number;
}
