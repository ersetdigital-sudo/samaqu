import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function generateOrderNumber(): string {
  const d = new Date();
  return `SMQ-${d.toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, shipping, items } = body;

    if (!customer?.name || !customer?.whatsapp || !shipping?.address || !shipping?.city) {
      return NextResponse.json({ error: "Data wajib tidak lengkap" }, { status: 400 });
    }

    const orderNumber = generateOrderNumber();
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
    const shippingCost = shipping.method === "express" ? 45000 : 25000;
    const discount = body.discount || 0;
    const total = subtotal - discount + shippingCost;

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customer.name,
        customer_email: customer.email || null,
        customer_whatsapp: customer.whatsapp,
        shipping_address: shipping.address,
        shipping_city: shipping.city,
        shipping_postal_code: shipping.postalCode || null,
        shipping_notes: shipping.notes || null,
        shipping_method: shipping.method || "reguler",
        shipping_cost: shippingCost,
        payment_method: body.paymentMethod || "bank",
        subtotal,
        discount,
        total,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return NextResponse.json({ error: "Gagal menyimpan pesanan" }, { status: 500 });
    }

    // Insert order items
    const orderItems = items.map((item: { productId: string; name: string; image?: string; color?: string; size?: string; quantity: number; price: number }) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      product_image: item.image || null,
      color: item.color || null,
      size: item.size || null,
      quantity: item.quantity || 1,
      price: item.price,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      console.error("Order items insert error:", itemsError);
      // Order already created, just log the error
    }

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: order.id,
      total,
    });
  } catch (error) {
    console.error("Order API error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Gagal mengambil data pesanan" }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
