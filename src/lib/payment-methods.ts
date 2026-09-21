import { supabase } from "./supabase";

/** Jenis metode pembayaran yang didukung. */
export type PaymentMethodType = "bank" | "qris" | "ewallet" | "cod" | "other";

export const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string; hint: string }[] = [
  { value: "bank", label: "Transfer Bank", hint: "Tampilkan nomor rekening" },
  { value: "qris", label: "QRIS", hint: "Tampilkan gambar QR" },
  { value: "ewallet", label: "E-Wallet", hint: "Tampilkan nomor tujuan (GoPay/OVO/Dana)" },
  { value: "cod", label: "Bayar di Tempat (COD)", hint: "Tanpa pembayaran online" },
  { value: "other", label: "Lainnya", hint: "Hanya catatan instruksi" },
];

/** Baris tabel `payment_methods` (kolom label/method_type/icon baru ada setelah migration). */
export interface PaymentMethodRow {
  id: string;
  label?: string | null;
  method_type?: string | null;
  icon?: string | null;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  account_info?: string | null;
  qr_image_url?: string | null;
  instructions?: string | null;
  is_active?: boolean | null;
  display_order?: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pesanan baru menyimpan id metode (uuid) di kolom payment_method. */
export function isPaymentMethodId(value?: string | null): boolean {
  return !!value && UUID_RE.test(value);
}

export function normalizeMethodType(value?: string | null): PaymentMethodType {
  if (value === "qris" || value === "ewallet" || value === "cod" || value === "other") return value;
  return "bank";
}

export function defaultMethodLabel(type: PaymentMethodType): string {
  switch (type) {
    case "qris":
      return "QRIS";
    case "ewallet":
      return "E-Wallet";
    case "cod":
      return "Bayar di Tempat (COD)";
    case "other":
      return "Metode Pembayaran";
    default:
      return "Transfer Bank";
  }
}

/** Nama metode yang tampil ke customer. Tahan terhadap data lama (tanpa kolom `label`). */
export function paymentMethodLabel(pm?: PaymentMethodRow | null): string {
  if (!pm) return "Transfer Bank";
  if (pm.label && pm.label.trim()) return pm.label.trim();
  if (pm.bank_name) return `Transfer Bank (${pm.bank_name})`;
  return defaultMethodLabel(normalizeMethodType(pm.method_type));
}

/** Label untuk pesanan lama yang payment_method-nya masih 'bank' / 'qris' / 'cod'. */
export function legacyPaymentLabel(value?: string | null): string | null {
  if (value === "bank") return "Transfer Bank";
  if (value === "qris") return "QRIS / E-Wallet";
  if (value === "cod") return "COD";
  return null;
}

export function legacyPaymentType(value?: string | null): PaymentMethodType | null {
  if (value === "bank" || value === "qris" || value === "cod") return value;
  return null;
}

export async function fetchActivePaymentMethods(): Promise<PaymentMethodRow[]> {
  try {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (error || !data) return [];
    return data as PaymentMethodRow[];
  } catch {
    return [];
  }
}

export async function fetchPaymentMethodById(id: string): Promise<PaymentMethodRow | null> {
  try {
    const { data } = await supabase.from("payment_methods").select("*").eq("id", id).maybeSingle();
    return (data as PaymentMethodRow) || null;
  } catch {
    return null;
  }
}
