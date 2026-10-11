import { getSupabaseAdmin } from "../supabase-admin";
import { isPaymentMethodId, legacyPaymentType } from "../payment-methods";
import { createOrder } from "./order";
import { getDestinationCode, getOriginCode, getReceiverArea } from "./area-mapping";
import type { OrderResponse } from "./types";

/**
 * Buat pesanan J&T (Order Create API) dari baris `orders` + `order_items` yang SUDAH tersimpan.
 *
 * Dulu setiap checkout (`/api/orders` & `/api/open-order`) langsung memanggil J&T begitu pesanan
 * masuk, jadi resi terbit sebelum admin memverifikasi pembayaran. Sekarang pembuatan resi dipicu
 * manual oleh admin lewat tombol **"Atur Pesanan"** di drawer detail pesanan
 * (`PATCH /api/admin/orders` dengan `action: "createJnt"`) — alur ala Shopee Seller Centre.
 *
 * Payload J&T-nya dulu disalin di dua route checkout; sekarang logikanya cuma ada di sini.
 */

/** Pengirim yang dipakai semua pesanan SAMAQU (dulu ditulis ulang di tiap route checkout). */
export const SAMAQU_ORIGIN = {
  city: "DEPOK",
  name: "SAMAQU",
  phone: "+6281234567890",
  address: "Jl. Depok, Depok, Jawa Barat",
};

/** Berat fallback per item (gram) kalau baris katalog tidak punya `weight` — sama dengan wizard Open Order. */
const DEFAULT_ITEM_WEIGHT = 1200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface JntOrderSourceItem {
  product_id?: string | null;
  product_name: string;
  quantity: number;
}

export interface JntOrderSource {
  order_number: string;
  customer_name: string;
  customer_whatsapp: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code?: string | null;
  total: number;
  weight?: number | null;
  payment_method?: string | null;
  order_items: JntOrderSourceItem[];
}

export interface JntOrderResult {
  success: boolean;
  awbNo: string | null;
  raw?: OrderResponse | null;
  error?: string;
}

/**
 * `orders.shipping_city` menyimpan "Kecamatan, Kota" untuk pesanan Open Order (`/api/open-order`)
 * dan bentuk yang sama untuk checkout website. Data lama bisa berisi nama kota saja.
 */
function splitCityDistrict(value: string): { city: string; district: string } {
  const parts = (value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) return { district: parts[0], city: parts.slice(1).join(", ") };
  return { district: "", city: parts[0] || "" };
}

/** COD ditentukan dari metode pembayaran: `payment_methods.method_type`, atau nilai lama `'cod'`. */
async function resolveCod(paymentMethod: string | null | undefined, total: number): Promise<number> {
  if (!paymentMethod) return 0;

  const legacy = legacyPaymentType(paymentMethod);
  if (legacy) return legacy === "cod" ? total : 0;

  if (!isPaymentMethodId(paymentMethod)) return 0;

  const { data } = await getSupabaseAdmin()
    .from("payment_methods")
    .select("method_type")
    .eq("id", paymentMethod)
    .maybeSingle();

  return data?.method_type === "cod" ? total : 0;
}

/** Berat kirim (gram): berat tersimpan di pesanan, kalau tidak ada dijumlah dari berat katalog. */
async function resolveWeightGrams(order: JntOrderSource, items: JntOrderSourceItem[]): Promise<number> {
  if (order.weight && order.weight > 0) return order.weight;

  const productIds = items
    .map((item) => item.product_id)
    .filter((id): id is string => !!id && UUID_RE.test(id));

  const weights = new Map<string, number>();
  if (productIds.length > 0) {
    const { data } = await getSupabaseAdmin().from("products").select("id, weight").in("id", productIds);
    for (const row of data ?? []) {
      if (row.weight) weights.set(row.id as string, row.weight as number);
    }
  }

  return items.reduce(
    (sum, item) => sum + (weights.get(item.product_id ?? "") ?? DEFAULT_ITEM_WEIGHT) * (item.quantity || 1),
    0
  );
}

export async function createJntOrderForOrder(order: JntOrderSource): Promise<JntOrderResult> {
  const items = order.order_items || [];
  const { city, district } = splitCityDistrict(order.shipping_city);

  const receiverName = (order.customer_name || "").trim();
  const whatsapp = (order.customer_whatsapp || "").trim();
  const address = (order.shipping_address || "").trim();

  if (!receiverName || !whatsapp || !address || !city) {
    return {
      success: false,
      awbNo: null,
      error: "Data pengiriman pesanan belum lengkap (nama, WhatsApp, alamat, atau kota kosong).",
    };
  }

  const total = Math.max(0, Math.round(Number(order.total) || 0));
  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const weightGrams = await resolveWeightGrams(order, items);

  const result = await createOrder({
    orderId: order.order_number,
    shipperName: SAMAQU_ORIGIN.name,
    shipperPhone: SAMAQU_ORIGIN.phone,
    shipperAddress: SAMAQU_ORIGIN.address,
    originCode: getOriginCode(SAMAQU_ORIGIN.city) || "DPK",
    receiverName: receiverName.slice(0, 30),
    receiverPhone: whatsapp.startsWith("+") ? whatsapp : `+62${whatsapp.replace(/^0/, "")}`,
    receiverAddress: address.slice(0, 200),
    receiverZip: order.shipping_postal_code || "00000",
    destinationCode: getDestinationCode(city) || "",
    receiverArea: getReceiverArea(city, district) || "",
    qty: totalQty || 1,
    weight: Math.max(weightGrams / 1000, 0.1),
    goodsDesc: (items[0]?.product_name || "Pesanan SAMAQU").slice(0, 40),
    itemName: items.map((item) => item.product_name).join(", ").slice(0, 50),
    goodsValue: total,
    cod: await resolveCod(order.payment_method, total),
  });

  if (!result.success || !result.awbNo) {
    const detail = result.raw?.detail?.[0];
    return {
      success: false,
      awbNo: null,
      raw: result.raw,
      error: detail?.reason || result.raw?.desc || "J&T menolak pembuatan nomor resi.",
    };
  }

  return { success: true, awbNo: result.awbNo, raw: result.raw };
}
