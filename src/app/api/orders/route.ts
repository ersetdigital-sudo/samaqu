import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateShippingCost, findMatchingCost } from "@/lib/shipping-utils";

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

    // ── Server-side shipping cost verification ──
    // Never trust shipping.cost from client — verify via RajaOngkir
    let verifiedShippingCost = 0;
    let verifiedShippingMethod = shipping.method || "manual";

    if (shipping.originDistrictId && shipping.destinationDistrictId && shipping.weight && shipping.method) {
      console.log("[ORDERS] Verifying shipping cost server-side...");

      try {
        // Get enabled couriers from store settings
        const { data: settings } = await supabase
          .from("store_settings")
          .select("enabled_couriers")
          .eq("id", 1)
          .single();

        let couriers = "jne:sicepat:jnt:ninja:tiki:wahana:pos:lion:anteraja";
        if (settings?.enabled_couriers) {
          try {
            const parsed = typeof settings.enabled_couriers === "string"
              ? JSON.parse(settings.enabled_couriers)
              : settings.enabled_couriers;
            if (Array.isArray(parsed) && parsed.length > 0) {
              couriers = parsed.join(":");
            }
          } catch { /* use defaults */ }
        }

        console.log("[ORDERS] Using couriers:", couriers);
        console.log("[ORDERS] Calling calculateShippingCost:", {
          origin: shipping.originDistrictId,
          destination: shipping.destinationDistrictId,
          weight: shipping.weight,
        });

        // Call RajaOngkir to get actual shipping costs
        const serverOptions = await calculateShippingCost({
          origin: shipping.originDistrictId,
          destination: shipping.destinationDistrictId,
          weight: shipping.weight,
          courier: couriers,
        });

        console.log("[ORDERS] Server options count:", serverOptions.length);

        // Find the matching courier+service from client's selection
        const match = findMatchingCost(serverOptions, shipping.method);

        if (match) {
          verifiedShippingCost = match.cost;
          verifiedShippingMethod = `${match.courier} - ${match.service}`;
          console.log("[ORDERS] Verified shipping cost:", verifiedShippingCost, "method:", verifiedShippingMethod);
          if (match.cost !== shipping.cost) {
            console.warn("[ORDERS] ⚠️ Client cost differs from server! Client:", shipping.cost, "Server:", match.cost);
          }
        } else {
          // Fallback: use client value but log warning
          console.warn("[ORDERS] ⚠️ Could not match courier method:", shipping.method, "— using client value:", shipping.cost);
          verifiedShippingCost = shipping.cost || 0;
        }
      } catch (e) {
        console.error("[ORDERS] ⚠️ Shipping verification failed, using client value:", e);
        verifiedShippingCost = shipping.cost || 0;
      }
    } else {
      console.log("[ORDERS] No verification params, using client cost:", shipping.cost);
      verifiedShippingCost = shipping.cost || 0;
    }

    const orderNumber = generateOrderNumber();
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
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
        payment_method: body.paymentMethod || "bank",
        subtotal,
        discount,
        total,
        voucher_code: body.voucherCode || null,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("[ORDERS] Order insert error:", orderError);
      return NextResponse.json({ error: "Gagal menyimpan pesanan" }, { status: 500 });
    }

    console.log("[ORDERS] Order created:", order.id, orderNumber);

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
