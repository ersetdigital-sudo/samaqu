import type { SupabaseClient } from "@supabase/supabase-js";
import type { AffiliateCommissionRow, AffiliateLinkRow, AffiliateWithdrawalRow } from "./types";

/**
 * Query bersama untuk portal & admin Affiliate.
 * Semua query memakai service role; filter per-affiliate SELALU_done di server
 * supaya affiliate tidak pernah bisa melihat data affiliate lain.
 */

export interface AffiliateOrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  created_at: string;
  referral_code: string | null;
  referral_attributed_at: string | null;
  shipping_city: string | null;
  customer_name: string | null;
  items: {
    product_id: string | null;
    product_name: string | null;
    product_image: string | null;
    color: string | null;
    size: string | null;
    series: string | null;
    quantity: number;
    price: number;
  }[];
  commission?: AffiliateCommissionRow | null;
}

/** Samarkan nama pelanggan: "Suryana Rahma" → "Su***a". */
export function maskCustomerName(name: string | null | undefined): string {
  const value = String(name || "").trim();
  if (!value) return "Pembeli";
  if (value.length <= 3) return value.slice(0, 1) + "***";
  return value.slice(0, 2) + "***" + value.slice(-1);
}

/** Samarkan kota: "Kota Depok" → "Kota D***k". */
export function maskCity(city: string | null | undefined): string {
  const value = String(city || "").trim();
  if (!value) return "";
  if (value.length <= 4) return value;
  return value.slice(0, 3) + "***" + value.slice(-1);
}

/** Ambil pesanan yang teratribusi ke satu affiliate + item + komisinya. */
export async function loadAffiliateOrders(
  supabase: SupabaseClient,
  affiliateId: string,
  limit = 500,
): Promise<AffiliateOrderRow[]> {
  const { data: orderRows, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total, subtotal, shipping_cost, created_at, referral_code, referral_attributed_at, shipping_city, customer_name",
    )
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[affiliate] Gagal ambil pesanan:", error.message);
    return [];
  }

  const orders = (orderRows || []) as Omit<AffiliateOrderRow, "items" | "commission">[];
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  const { data: itemRows } = await supabase
    .from("order_items")
    .select("order_id, product_id, product_name, product_image, color, size, series, quantity, price")
    .in("order_id", orderIds);

  const { data: commissionRows } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .in("order_id", orderIds);

  const itemsByOrder = new Map<string, AffiliateOrderRow["items"]>();
  for (const item of (itemRows || []) as (AffiliateOrderRow["items"][number] & { order_id: string })[]) {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push({
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      color: item.color,
      size: item.size,
      series: item.series,
      quantity: item.quantity,
      price: item.price,
    });
    itemsByOrder.set(item.order_id, list);
  }

  const commissionByOrder = new Map<string, AffiliateCommissionRow>();
  for (const c of (commissionRows || []) as (AffiliateCommissionRow & { order_id: string })[]) {
    commissionByOrder.set(c.order_id, c);
  }

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) || [],
    commission: commissionByOrder.get(order.id) || null,
  }));
}

/** Ambil baris komisi milik satu affiliate. */
export async function loadAffiliateCommissions(
  supabase: SupabaseClient,
  affiliateId: string,
  limit = 1000,
): Promise<AffiliateCommissionRow[]> {
  const { data } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as AffiliateCommissionRow[];
}

/** Ambil link milik affiliate + join produk. */
export async function loadAffiliateLinks(
  supabase: SupabaseClient,
  affiliateId: string,
): Promise<(AffiliateLinkRow & { product_name: string | null; product_image: string | null; product_price: number | null })[]> {
  const { data } = await supabase
    .from("affiliate_links")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  const links = (data || []) as AffiliateLinkRow[];
  if (links.length === 0) return [];

  const productIds = Array.from(new Set(links.map((l) => l.product_id).filter(Boolean))) as string[];
  let productMap = new Map<string, { name: string; image: string | null; price: number | null }>();
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, image")
      .in("id", productIds);
    for (const p of (products || []) as { id: string; name: string; price: number; image: string | null }[]) {
      productMap.set(p.id, { name: p.name, image: p.image, price: p.price });
    }
  }

  return links.map((link) => {
    const product = link.product_id ? productMap.get(link.product_id) : undefined;
    return {
      ...link,
      product_name: product?.name ?? null,
      product_image: product?.image ?? null,
      product_price: product?.price ?? null,
    };
  });
}

/** Ambil pencairan milik affiliate + riwayatnya. */
export async function loadAffiliateWithdrawals(
  supabase: SupabaseClient,
  affiliateId: string,
): Promise<(AffiliateWithdrawalRow & { history: { from_status: string | null; to_status: string | null; note: string | null; actor: string | null; created_at: string }[] })[]> {
  const { data } = await supabase
    .from("affiliate_withdrawals")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  const withdrawals = (data || []) as AffiliateWithdrawalRow[];
  if (withdrawals.length === 0) return [];

  const { data: events } = await supabase
    .from("affiliate_withdrawal_events")
    .select("withdrawal_id, from_status, to_status, note, actor, created_at")
    .in("withdrawal_id", withdrawals.map((w) => w.id))
    .order("created_at", { ascending: true });

  const byWithdrawal = new Map<string, { from_status: string | null; to_status: string | null; note: string | null; actor: string | null; created_at: string }[]>();
  for (const event of (events || []) as {
    withdrawal_id: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    actor: string | null;
    created_at: string;
  }[]) {
    const list = byWithdrawal.get(event.withdrawal_id) || [];
    list.push(event);
    byWithdrawal.set(event.withdrawal_id, list);
  }

  return withdrawals.map((w) => ({ ...w, history: byWithdrawal.get(w.id) || [] }));
}

/** Hitung total klik affiliate dalam rentang waktu (default: 30 hari terakhir). */
export async function countAffiliateClicks(
  supabase: SupabaseClient,
  affiliateId: string,
  since?: string,
): Promise<number> {
  let query = supabase
    .from("affiliate_clicks")
    .select("id", { count: "exact", head: true })
    .eq("affiliate_id", affiliateId);

  if (since) query = query.gte("created_at", since);
  const { count } = await query;
  return count || 0;
}
