"use client";

import { supabaseAffiliate as supabase } from "@/lib/supabase-affiliate";

/**
 * Helper fetch untuk portal affiliate (browser).
 * Token sesi Supabase dipakai sebagai header Authorization; server memverifikasi
 * bahwa token itu milik baris `affiliates` â€” jadi data antar-affiliate tidak
 * mungkin saling bocor.
 */
export async function affiliateFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token || ""}`,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json?.error) message = json.error;
    } catch {
      /* pesan default */
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export interface AffiliateProfile {
  id: string;
  affiliate_code: string;
  full_name: string;
  display_name: string | null;
  email: string;
  phone: string | null;
  status: "menunggu" | "aktif" | "ditolak" | "nonaktif";
  reject_reason: string | null;
  created_at: string;
}

export interface AffiliateSettingsView {
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
}

export interface AffiliateBalanceView {
  pending: number;
  approved: number;
  available: number;
  paid: number;
  rejected: number;
  processing: number;
  withdrawn: number;
}

export interface MePayload {
  affiliate: AffiliateProfile;
  settings: AffiliateSettingsView;
  balance: AffiliateBalanceView;
  stats: {
    clicksTotal: number;
    clicks30: number;
    orders: number;
    sales: number;
    commissionsByStatus: Record<string, number>;
  };
}
