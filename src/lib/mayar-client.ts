import { supabase } from "./supabase";

/**
 * Minta link pembayaran Mayar untuk sebuah pesanan (dipakai halaman customer: checkout & Open Order).
 *
 * Server yang menentukan boleh/tidaknya (hanya pesanan `pending` dengan metode pembayaran
 * bertipe `mayar`, milik customer yang sedang masuk) dan membuat invoice-nya secara idempoten.
 * Mengembalikan URL halaman bayar, atau null kalau gagal (pemanggil lanjut ke halaman sukses biasa).
 */
export async function startOnlinePayment(orderNumber: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/payments/mayar/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({ orderNumber }),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string };
    if (!res.ok || !json?.url) return null;
    return String(json.url);
  } catch (e) {
    console.error("[MAYAR] Gagal minta link pembayaran:", e);
    return null;
  }
}
