import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { affiliateSession, affiliateUnauthorized } from "@/lib/affiliate/auth";
import { syncCommissionsForAffiliate } from "@/lib/affiliate/commission";
import { getAffiliateSettings } from "@/lib/affiliate/settings";
import { loadAffiliateOrders, maskCity, maskCustomerName } from "@/lib/affiliate/queries";

/**
 * Pesanan yang teratribusi ke affiliate.
 * Data pelanggan disamarkan (nama & kota) sesuai ketentuan portal.
 */
export async function GET(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);
  await syncCommissionsForAffiliate(supabase, session.affiliate.id, { settings });

  const orders = await loadAffiliateOrders(supabase, session.affiliate.id);

  const result = orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    total: Number(order.total || 0),
    subtotal: Number(order.subtotal || 0),
    shippingCost: Number(order.shipping_cost || 0),
    createdAt: order.created_at,
    referralCode: order.referral_code,
    attributedAt: order.referral_attributed_at,
    customer: maskCustomerName(order.customer_name),
    city: maskCity(order.shipping_city),
    items: order.items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      productImage: item.product_image,
      color: item.color,
      size: item.size,
      series: item.series,
      quantity: item.quantity,
      price: item.price,
    })),
    commission: order.commission
      ? {
          id: order.commission.id,
          amount: order.commission.amount,
          baseAmount: order.commission.base_amount,
          rate: Number(order.commission.rate || 0),
          status: order.commission.status,
          reason: order.commission.reason,
          availableAt: order.commission.available_at,
          breakdown: order.commission.breakdown || [],
        }
      : null,
  }));

  return NextResponse.json({ orders: result });
}
