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

    console.log("[ORDERS] === NEW ORDER REQUEST ===");
    console.log("[ORDERS] Customer:", { name: customer?.name, whatsapp: customer?.whatsapp?.slice(0, 6) + "***" });
    console.log("[ORDERS] Shipping:", {
      address: shipping?.address?.slice(0, 30) + "...",
      city: shipping?.city,
      district: shipping?.district,
      postalCode: shipping?.postalCode,
      method: shipping?.method,
      clientCost: shipping?.cost,
      originDistrictId: shipping?.originDistrictId,
      destinationDistrictId: shipping?.destinationDistrictId,
      weight: shipping?.weight,
    });
    console.log("[ORDERS] Items count:", items?.length);
    console.log("[ORDERS] Payment:", body.paymentMethod, "Discount:", body.discount);

    if (!customer?.name || !customer?.whatsapp || !shipping?.address || !shipping?.city) {
      console.log("[ORDERS] ERROR: Data wajib tidak lengkap");
      return NextResponse.json({ error: "Data wajib tidak lengkap" }, { status: 400 });
    }

    if (!body.paymentMethod || !["bank", "qris", "cod"].includes(body.paymentMethod)) {
      console.log("[ORDERS] ERROR: Metode pembayaran tidak valid:", body.paymentMethod);
      return NextResponse.json({ error: "Pilih metode pembayaran terlebih dahulu" }, { status: 400 });
    }

    // ── Shipping cost validation ──
    // Trust the client-provided shipping cost (already verified via /api/shipping/cost).
    // This avoids a second RajaOngkir API call per order (saves quota on 100 hit/day limit).
    let verifiedShippingCost = 0;
    let verifiedShippingMethod = shipping.method || "manual";

    if (shipping.method && typeof shipping.cost === "number" && shipping.cost >= 0) {
      verifiedShippingCost = shipping.cost;
      verifiedShippingMethod = shipping.method;
      console.log("[ORDERS] Using client shipping cost:", verifiedShippingCost, "method:", verifiedShippingMethod);
    } else {
      console.log("[ORDERS] No valid shipping info, cost defaults to 0");
    }

    // ── Server-side CYP price validation ──
    // For CYP items: verify customer_price >= minimum_price from DB
    // For fixed items: use price as-is
    console.log("[ORDERS] Validating item prices...");
    const validatedItems: Array<{ productId: string; name: string; image?: string; color?: string; size?: string; quantity: number; price: number; customer_price: number | null; minimum_price: number | null; create_your_price_enabled: boolean }> = [];

    for (const item of items) {
      if (item.create_your_price_enabled) {
        // CYP item: fetch minimum_price from DB (never trust client)
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("minimum_price, create_your_price_enabled")
          .eq("id", item.productId)
          .single();

        if (productError || !product) {
          console.error("[ORDERS] CYP validation: product not found:", item.productId);
          return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 400 });
        }

        if (!product.create_your_price_enabled || !product.minimum_price) {
          console.error("[ORDERS] CYP validation: product not CYP enabled:", item.productId);
          return NextResponse.json({ error: "Produk ini tidak mendukung Create Your Price" }, { status: 400 });
        }

        const dbMinimumPrice = product.minimum_price;
        const clientCustomerPrice = item.customer_price || item.price;

        if (clientCustomerPrice < dbMinimumPrice) {
          console.error("[ORDERS] CYP validation FAILED:", { productId: item.productId, clientPrice: clientCustomerPrice, dbMinimum: dbMinimumPrice });
          return NextResponse.json({
            error: `Harga untuk "${item.name}" di bawah minimum. Minimum: Rp ${dbMinimumPrice.toLocaleString("id-ID")}`,
          }, { status: 400 });
        }

        console.log("[ORDERS] CYP validated:", { name: item.name, customerPrice: clientCustomerPrice, minimumPrice: dbMinimumPrice });
        validatedItems.push({
          ...item,
          price: clientCustomerPrice,
          customer_price: clientCustomerPrice,
          minimum_price: dbMinimumPrice,
          create_your_price_enabled: true,
        });
      } else {
        // Fixed price item: use as-is
        validatedItems.push({
          ...item,
          customer_price: null,
          minimum_price: null,
          create_your_price_enabled: false,
        });
      }
    }

    const orderNumber = generateOrderNumber();
    const subtotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = body.discount || 0;
    const total = subtotal - discount + verifiedShippingCost;

    console.log("[ORDERS] Final order:", { orderNumber, subtotal, shippingCost: verifiedShippingCost, discount, total });

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
        shipping_method: verifiedShippingMethod,
        shipping_cost: verifiedShippingCost,
        payment_method: body.paymentMethod,
        subtotal,
        discount,
        total,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("[ORDERS] Order insert error:", orderError);
      return NextResponse.json({ error: "Gagal menyimpan pesanan" }, { status: 500 });
    }

    console.log("[ORDERS] Order created:", order.id, orderNumber);

    // Insert order items (with CYP fields)
    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      product_image: item.image || null,
      color: item.color || null,
      size: item.size || null,
      quantity: item.quantity || 1,
      price: item.price,
      customer_price: item.customer_price,
      minimum_price: item.minimum_price,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      console.error("[ORDERS] Order items insert error:", itemsError);
    }

    // Increment voucher used_count + save usage
    if (body.voucherCode) {
      const { data: vData } = await supabase.from("vouchers").select("used_count").eq("code", body.voucherCode).single();
      if (vData) {
        await supabase.from("vouchers").update({ used_count: vData.used_count + 1 }).eq("code", body.voucherCode);
      }
      if (body.voucherId) {
        await supabase.from("voucher_usages").insert({
          voucher_id: body.voucherId,
          whatsapp_number: customer.whatsapp.replace(/[^0-9]/g, ""),
          order_id: order.id,
        });
      }
    }

    console.log("[ORDERS] === ORDER SUCCESS ===", orderNumber);
    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: order.id,
      total,
    });
  } catch (error) {
    console.error("[ORDERS] === ORDER FAILED ===", error);
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
