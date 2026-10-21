import type { SupabaseClient } from "@supabase/supabase-js";
import type { AffiliateSettingsRow } from "./types";

/**
 * Konfigurasi program Affiliate — satu baris (id = 1) di tabel `affiliate_settings`.
 *
 * PENTING: nilai bisnis TIDAK di-hardcode. Default-nya netral (persentase 0, minimum
 * pencairan 0, biaya admin 0) supaya program tidak "aktif" dengan angka yang belum
 * disepakati. Admin mengisinya lewat menu "Affiliate → Pengaturan Komisi".
 */

export const DEFAULT_AFFILIATE_SETTINGS: AffiliateSettingsRow = {
  id: 1,
  enabled: true,
  commission_mode: "percent",
  commission_percent: 0,
  fixed_commission: null,
  product_commission: {},
  attribution_model: "last_click",
  referral_validity_days: 30,
  require_paid: true,
  require_completed: true,
  validation_days: 14,
  min_withdrawal: 0,
  withdrawal_fee_bank: 0,
  withdrawal_fee_ewallet: 0,
  reversal_on_cancel: true,
  reversal_on_return: true,
  updated_at: new Date(0).toISOString(),
};

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSettings(row: Record<string, unknown> | null): AffiliateSettingsRow {
  if (!row) return { ...DEFAULT_AFFILIATE_SETTINGS };

  const productCommission: Record<string, number> = {};
  const raw = (row.product_commission || {}) as Record<string, unknown>;
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) productCommission[key] = n;
    }
  }

  return {
    id: 1,
    enabled: row.enabled !== false,
    commission_mode: row.commission_mode === "fixed" ? "fixed" : "percent",
    commission_percent: toNumber(row.commission_percent, 0),
    fixed_commission: row.fixed_commission === null || row.fixed_commission === undefined
      ? null
      : Math.max(0, Math.round(toNumber(row.fixed_commission, 0))),
    product_commission: productCommission,
    attribution_model: row.attribution_model === "first_click" ? "first_click" : "last_click",
    referral_validity_days: Math.max(0, Math.round(toNumber(row.referral_validity_days, 30))),
    require_paid: row.require_paid !== false,
    require_completed: row.require_completed !== false,
    validation_days: Math.max(0, Math.round(toNumber(row.validation_days, 14))),
    min_withdrawal: Math.max(0, Math.round(toNumber(row.min_withdrawal, 0))),
    withdrawal_fee_bank: Math.max(0, Math.round(toNumber(row.withdrawal_fee_bank, 0))),
    withdrawal_fee_ewallet: Math.max(0, Math.round(toNumber(row.withdrawal_fee_ewallet, 0))),
    reversal_on_cancel: row.reversal_on_cancel !== false,
    reversal_on_return: row.reversal_on_return !== false,
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

/** Baca konfigurasi program (selalu return object valid, walau baris belum ada). */
export async function getAffiliateSettings(supabase: SupabaseClient): Promise<AffiliateSettingsRow> {
  const { data, error } = await supabase
    .from("affiliate_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[affiliate] Gagal baca affiliate_settings:", error.message);
    return { ...DEFAULT_AFFILIATE_SETTINGS };
  }
  return normalizeSettings(data as Record<string, unknown> | null);
}

/** Persentase komisi untuk sebuah produk (aturan per produk mengalahkan aturan global). */
export function rateForProduct(settings: AffiliateSettingsRow, productId: string | null | undefined): number {
  if (!productId) return settings.commission_percent;
  const override = settings.product_commission?.[productId];
  if (typeof override === "number" && Number.isFinite(override)) return override;
  return settings.commission_percent;
}

/** Biaya admin pencairan berdasarkan metode. */
export function feeForMethod(settings: AffiliateSettingsRow, method: string): number {
  return method === "E-wallet" ? settings.withdrawal_fee_ewallet : settings.withdrawal_fee_bank;
}

/** Sumber traffic yang boleh dipakai affiliate (dipakai form "Buat Tautan"). */
export const AFFILIATE_LINK_SOURCES = [
  "TikTok",
  "Instagram",
  "WhatsApp",
  "Facebook",
  "YouTube",
  "Lainnya",
] as const;
