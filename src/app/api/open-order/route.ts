import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { findOpenOrderProduct, OPEN_ORDER_ADDON, OPEN_ORDER_SIZES } from "@/lib/open-order-config";

/**
 * Pesanan dari alur Open Order Samaqu (halaman /open-order, 6 langkah).
 *
 * Ongkir dihitung di client lewat API J&T (`/api/shipping/jnt-cost`) dari kecamatan tujuan,
 * lalu ikut dikirim bersama pesanan. Pesanan disimpan ke `orders` + `order_items` dengan:
 * - nomor pesanan berawalan `CYO-` (membedakan dari pesanan checkout website),
 * - `shipping_method` = "J&T - <service>" dan `shipping_cost` = tarif J&T; kalau customer
 *   belum mengisi kecamatan atau hitungannya gagal, jatuh ke "manual" / 0 dan admin
 *   menghitung ongkir menyusul,
 * - `status` = "pending" supaya muncul di dashboard admin sebagai pesanan baru.
 *
 * Harga produk/series tidak dipercaya dari client: diambil ulang dari OPEN_ORDER_PRODUCTS.
 * Yang datang dari client hanyalah harga pilihan customer (Create Your Price) — itu di-clamp
 * supaya tidak pernah di bawah harga series terpilih, lalu disimpan di `price` +
 * `customer_price`, dengan `minimum_price` = harga series-nya (dibaca admin sebagai
 * "Min: … · Dipilih: …"). Ukuran divalidasi terhadap OPEN_ORDER_SIZES.
 */

interface OpenOrderItemInput {
  productId?: string;
  series?: string;
  color?: string;
  size?: string;
  quantity?: number;
  /** Harga pilihan customer (Create Your Price). */
  price?: number;
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
  minimumPrice: number;
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
  customer_price: number | null;
  minimum_price: number | null;
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
    const postalCode = String(rawCustomer.postalCode ?? "").trim();
    const note = String(rawCustomer.notes ?? "").trim();

    if (!name || !whatsapp || !city || !district || !address) {
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
      const size = String(item.size ?? "");
      const quantity = Number(item.quantity);

      if (!product || !series) {
        return NextResponse.json({ error: "Produk atau series tidak valid" }, { status: 400 });
      }
      if (!product.colors.includes(color)) {
        return NextResponse.json({ error: `Warna untuk ${product.name} tidak valid` }, { status: 400 });
      }
      if (!OPEN_ORDER_SIZES.includes(size)) {
        return NextResponse.json({ error: `Ukuran untuk ${product.name} tidak valid` }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return NextResponse.json({ error: `Jumlah untuk ${product.name} tidak valid` }, { status: 400 });
      }

      // Create Your Price: harga pilihan customer, minimal harga series terpilih.
      const requested = Math.round(Number(item.price));
      const price = Number.isFinite(requested) && requested > series.price ? requested : series.price;

      validatedItems.push({
        productId: product.id,
        productName: `${product.name} — ${series.name}`,
        color,
        size,
        series: series.name,
        kain: product.kain,
        quantity,
        price,
        minimumPrice: series.price,
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
        shipping_postal_code: postalCode || null,
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        payment_method: "bank",
        subtotal,
        discount: 0,
        total,
        status: "pending",
        shipping_notes: [instagram ? `IG @${instagram}` : "", note].filter(Boolean).join(" · "),
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
      customer_price: item.price,
      minimum_price: item.minimumPrice,
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
        customer_price: null,
        minimum_price: null,
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
