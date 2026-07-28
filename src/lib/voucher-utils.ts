import { supabase } from "./supabase";

export interface VoucherResult {
  valid: true;
  voucher: {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    max_discount: number;
    min_purchase: number;
    limit_per_wa: boolean;
  };
  discount: number;
}

export interface VoucherError {
  valid: false;
  error: string;
}

export async function validateVoucher(
  code: string,
  subtotal: number,
  whatsapp?: string
): Promise<VoucherResult | VoucherError> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, error: "Masukkan kode promo" };

  const { data: voucher } = await supabase
    .from("vouchers")
    .select("*")
    .eq("code", trimmed)
    .eq("is_active", true)
    .single();

  if (!voucher) return { valid: false, error: "Kode promo tidak valid" };
  if (voucher.end_date && new Date(voucher.end_date) < new Date())
    return { valid: false, error: "Kode promo sudah kadaluarsa" };
  if (voucher.usage_limit > 0 && voucher.used_count >= voucher.usage_limit)
    return { valid: false, error: "Kode promo sudah habis digunakan" };
  if (voucher.min_purchase > 0 && subtotal < voucher.min_purchase)
    return { valid: false, error: `Minimal belanja Rp ${voucher.min_purchase.toLocaleString("id-ID")} untuk kode ini` };

  if (voucher.limit_per_wa && whatsapp?.trim()) {
    const phone = whatsapp.replace(/[^0-9]/g, "");
    const { data: existingUsage } = await supabase
      .from("voucher_usages")
      .select("id")
      .eq("voucher_id", voucher.id)
      .eq("whatsapp_number", phone)
      .limit(1);
    if (existingUsage && existingUsage.length > 0)
      return { valid: false, error: "Kode voucher ini sudah pernah Anda gunakan" };
  }

  let disc = 0;
  if (voucher.discount_type === "percentage") {
    disc = Math.round(subtotal * voucher.discount_value / 100);
    if (voucher.max_discount > 0) disc = Math.min(disc, voucher.max_discount);
  } else {
    disc = Math.min(voucher.discount_value, subtotal);
  }

  return {
    valid: true,
    voucher: {
      id: voucher.id,
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      max_discount: voucher.max_discount,
      min_purchase: voucher.min_purchase,
      limit_per_wa: voucher.limit_per_wa,
    },
    discount: disc,
  };
}
