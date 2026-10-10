import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { findOpenOrderProduct, OPEN_ORDER_ADDON } from "@/lib/open-order-config";

/**
 * Pesanan dari form Open Order Samaqu (halaman /open-order).
 *
 * Ongkir dihitung di client lewat API J&T (`/api/shipping/jnt-cost`) dari kecamatan tujuan,
 * lalu ikut dikirim bersama pesanan. Pesanan disimpan ke `orders` + `order_items` dengan:
 * - nomor pesanan berawalan `CYO-` (membedakan dari pesanan checkout website),
 * - `shipping_method` = "J&T - <service>" dan `shipping_cost` = tarif J&T; kalau customer
 *   belum mengisi kecamatan atau hitungannya gagal, jatuh ke "manual" / 0 dan admin
 *   menghitung ongkir menyusul,
 * - `status` = "pending" supaya muncul di dashboard admin sebagai pesanan baru.
 *
 * Harga TIDAK dipercaya dari client: selalu diambil ulang dari OPEN_ORDER_PRODUCTS.
 */

interface OpenOrderItemInput {
  productId?: string;
  series?: string;
  color?: string;
  quantity?: number;
}

interface ValidatedItem {
  productId: string;
  productName: string;
  color: string | null;
  size: string | null;
  series: string | null;
  kain: string | null;
  quantity: number;
  price: number;
}

interface OrderItemRow {
  order_id: string;
  product_id: string;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  price: number;
  series: string | null;
  kain: string | null;
}

function generateOrderNumber(): string {
  const d = new Date();
  return `CYO-${d.toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawCustomer = body.customer ?? {};
    const rawItems: OpenOrderItemInput[] = Array.isArray(body.items) ? body.items : [];

    const name = String(rawCustomer.name ?? "").trim();
    const instagram = String(rawCustomer.instagram ?? "").trim().replace(/^@/, "");
    const whatsapp = String(rawCustomer.whatsapp ?? "").trim();
    const city = String(rawCustomer.city ?? "").trim();
    const district = String(rawCustomer.district ?? "").trim();
    const address = String(rawCustomer.address ?? "").trim();
    const note = String(rawCustomer.notes ?? "").trim();

    if (!name || !instagram || !whatsapp || !city || !district || !address) {
      return NextResponse.json({ error: "Data pemesan belum lengkap" }, { status: 400 });
    }

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Pesanan masih kosong" }, { status: 400 });
    }

    const validatedItems: ValidatedItem[] = [];

    for (const item of rawItems) {
      const product = findOpenOrderProduct(String(item.productId ?? ""));
      const series = product?.series.find((s) => s.name === item.series);
      const color = String(item.color ?? "");
      const quantity = Number(item.quantity);

      if (!product || !series) {
        return NextResponse.json({ error: "Produk atau series tidak valid" }, { status: 400 });
      }
      if (!product.colors.includes(color)) {
        return NextResponse.json({ error: `Warna untuk ${product.name} tidak valid` }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return NextResponse.json({ error: `Jumlah untuk ${product.name} tidak valid` }, { status: 400 });
      }

      validatedItems.push({
        productId: product.id,
        productName: `${product.name} — ${series.name}`,
        color,
        size: null,
        series: series.name,
        kain: product.kain,
        quantity,
        price: series.price,
      });
    }

    const extraCover = body.extraCover === true;
    const subtotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const addonTotal = extraCover ? OPEN_ORDER_ADDON.price : 0;

    // Ongkir J&T sudah dihitung di client dari kecamatan tujuan (API key tidak pernah sampai
    // ke browser) — sama seperti /api/orders, nilainya tidak diverifikasi ulang di sini.
    // Kalau kosong (kecamatan belum diisi / hitungan gagal), pesanan tetap masuk sebagai
    // "manual" dan admin menghitung ongkir menyusul.
    const rawShipping = body.shipping ?? {};
    const shippingCost = Math.max(0, Math.round(Number(rawShipping.cost) || 0));
    const shippingMethod = String(rawShipping.method ?? "").trim() || "manual";

    const total = subtotal + addonTotal + shippingCost;
    const orderNumber = generateOrderNumber();

    const supabaseAdmin = getSupabaseAdmin();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: name,
        customer_email: null,
        customer_whatsapp: whatsapp,
        shipping_address: address,
        shipping_city: [district, city].filter(Boolean).join(", "),
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        payment_method: "bank",
        subtotal,
        discount: 0,
        total,
        status: "pending",
        shipping_notes: [`IG @${instagram}`, note].filter(Boolean).join(" · "),
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("[OPEN-ORDER] Order insert error:", orderError);
      return NextResponse.json({ error: "Gagal menyimpan pesanan" }, { status: 500 });
    }

    const orderItems: OrderItemRow[] = validatedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      series: item.series,
      kain: item.kain,
    }));

    if (extraCover) {
      orderItems.push({
        order_id: order.id,
        product_id: OPEN_ORDER_ADDON.id,
        product_name: OPEN_ORDER_ADDON.name,
        color: null,
        size: null,
        quantity: 1,
        price: OPEN_ORDER_ADDON.price,
        series: null,
        kain: null,
      });
    }

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);

    if (itemsError) {
      console.error("[OPEN-ORDER] Order items insert error:", itemsError);
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Gagal menyimpan detail pesanan" }, { status: 500 });
    }

    console.log("[OPEN-ORDER] Created:", { orderNumber, items: orderItems.length, total });
    return NextResponse.json({ success: true, orderNumber, total });
  } catch (error) {
    console.error("[OPEN-ORDER] Failed:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
