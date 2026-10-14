import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPaymentMethodId, legacyPaymentType } from "@/lib/payment-methods";
import { notifyAdminNewOrder } from "@/lib/fonnte";
import { markLeadBoughtForOrder } from "@/lib/ops-lead-sync";
import { sumWeightGrams } from "@/lib/shipping-weight";

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

    // ── Payment method: id metode dari admin (bank / QRIS / e-wallet / COD) ──
    const rawPayment = typeof body.paymentMethod === "string" ? body.paymentMethod : "";
    let paymentValue = "";
    let paymentType = "";

    if (isPaymentMethodId(rawPayment)) {
      const { data: pm } = await supabase
        .from("payment_methods")
        .select("id, method_type, is_active")
        .eq("id", rawPayment)
        .maybeSingle();

      if (!pm || pm.is_active === false) {
        console.log("[ORDERS] ERROR: Metode pembayaran tidak tersedia:", rawPayment);
        return NextResponse.json({ error: "Metode pembayaran tidak tersedia" }, { status: 400 });
      }
      paymentValue = pm.id as string;
      paymentType = (pm.method_type as string) || "bank";
      console.log("[ORDERS] Payment method from DB:", paymentType, paymentValue);
    } else if (legacyPaymentType(rawPayment)) {
      // pesanan lama (client versi lama) masih kirim 'bank' / 'qris' / 'cod'
      paymentValue = rawPayment;
      paymentType = rawPayment;
    } else {
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
    const validatedItems: Array<{ productId: string; name: string; image?: string; color?: string; size?: string; series?: string; kain?: string; quantity: number; price: number; customer_price: number | null; minimum_price: number | null; create_your_price_enabled: boolean }> = [];

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

    // ── Server-side stock validation + atomic decrement ──
    // Stok dikurangi DULU secara atomik (RPC samaqu_decrement_stock, row lock FOR UPDATE
    // + guard stock >= qty). Kalau ada item gagal, semua decrement di-rollback & order ditolak.
    // Race condition 2 pembeli checkout stok terakhir: hanya 1 yang dapat decrement.
    const decremented: Array<{ productId: string; color?: string; size?: string; quantity: number }> = [];

    async function rollbackStock() {
      for (const d of decremented) {
        await supabase.rpc("samaqu_restore_stock", {
          p_product_id: d.productId,
          p_color: d.color || "",
          p_size: d.size || "",
          p_qty: d.quantity,
        });
      }
      decremented.length = 0;
    }

    for (const item of validatedItems) {
      if (!item.quantity || item.quantity < 1) {
        console.error("[ORDERS] Stock validation: quantity invalid:", item);
        await rollbackStock();
        return NextResponse.json({ error: `Jumlah untuk "${item.name}" tidak valid` }, { status: 400 });
      }

      // Produk tanpa varian (tidak ada warna/ukuran) → stok tidak dikelola, lewati
      if (!item.color || !item.size || item.color === "-") {
        console.log("[ORDERS] Stock validation: skip (tanpa varian):", item.name);
        continue;
      }

      const { data: stockOk, error: stockError } = await supabase.rpc("samaqu_decrement_stock", {
        p_product_id: item.productId,
        p_color: item.color,
        p_size: item.size,
        p_qty: item.quantity,
      });

      if (stockError) {
        console.error("[ORDERS] Stock RPC error:", stockError);
        await rollbackStock();
        return NextResponse.json({ error: "Gagal memvalidasi stok. Silakan coba lagi." }, { status: 500 });
      }

      if (!stockOk) {
        console.error("[ORDERS] Stock INSUFFICIENT:", { name: item.name, color: item.color, size: item.size, qty: item.quantity });
        await rollbackStock();
        return NextResponse.json({
          error: `Stok "${item.name}" (${item.color} / ${item.size}) tidak mencukupi. Silakan kurangi jumlah atau pilih varian lain.`,
        }, { status: 400 });
      }

      console.log("[ORDERS] Stock decremented:", { name: item.name, color: item.color, size: item.size, qty: item.quantity });
      decremented.push({ productId: item.productId, color: item.color, size: item.size, quantity: item.quantity });
    }

    console.log("[ORDERS] Final order:", { orderNumber, subtotal, shippingCost: verifiedShippingCost, discount, total });

    // ── Berat kirim (gram): Σ berat produk asli × qty dari DATABASE (bukan nilai dari klien). ──
    // Sumber kebenaran berat = `products.weight`; berat tidak lagi mengikuti `shipping.weight`
    // kiriman browser supaya tidak salah kalau katalog statis/di-klien keliru.
    const weightIds = Array.from(new Set(validatedItems.map((i) => i.productId).filter(Boolean)));
    const weightById: Record<string, number> = {};
    if (weightIds.length > 0) {
      const { data: wRows } = await supabase.from("products").select("id, weight").in("id", weightIds);
      for (const r of wRows || []) if (r.weight) weightById[String(r.id)] = Number(r.weight);
    }
    const { grams: serverWeight, missingQty: weightMissing } = sumWeightGrams(
      validatedItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      weightById
    );
    const weightGrams = weightMissing === 0 && serverWeight > 0
      ? serverWeight
      : (Number(shipping.weight) || serverWeight || 0);

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customer.name,
        customer_email: customer.email || null,
        customer_whatsapp: customer.whatsapp,
        shipping_address: shipping.address,
        // Kecamatan + kota disimpan sekaligus (format yang sama dengan /api/open-order): dipakai
        // saat admin membuat resi J&T ("Atur Pesanan"), karena kode area J&T butuh kecamatan.
        shipping_city: [shipping.district, shipping.city].filter(Boolean).join(", "),
        shipping_postal_code: shipping.postalCode || null,
        shipping_notes: shipping.notes || null,
        shipping_method: verifiedShippingMethod,
        shipping_cost: verifiedShippingCost,
        payment_method: paymentValue,
        subtotal,
        discount,
        total,
        status: "pending",
        // Stok sudah dipotong di atas → pembatalan wajib mengembalikannya (lihat src/lib/cancel-order.ts).
        stock_reserved: true,
        weight: weightGrams || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("[ORDERS] Order insert error:", orderError);
      await rollbackStock();
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
      series: item.series || null,
      kain: item.kain || null,
      quantity: item.quantity || 1,
      price: item.price,
      customer_price: item.customer_price,
      minimum_price: item.minimum_price,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      console.error("[ORDERS] Order items insert error:", itemsError);
      // Rollback: hapus order + kembalikan stok supaya tidak ada data menggantung
      await supabase.from("orders").delete().eq("id", order.id);
      await rollbackStock();
      return NextResponse.json({ error: "Gagal menyimpan detail pesanan" }, { status: 500 });
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

    // Resi J&T tidak lagi dibuat di sini: pembuatan resi dipicu admin lewat "Atur Pesanan"
    // (PATCH /api/admin/orders action=createJnt) setelah pembayaran diverifikasi.

    // Sinkron ke lead: kalau nomor ini cocok dengan lead yang MASIH AKTIF, tandai Closing/Beli
    // (order tidak membuat lead baru). Pakai service role (tabel `leads` tanpa policy RLS).
    // Kegagalan sync tidak boleh menggagalkan pesanan yang sudah tersimpan.
    try {
      await markLeadBoughtForOrder(getSupabaseAdmin(), { whatsapp: customer.whatsapp, orderNumber, total });
    } catch (e) {
      console.error("[ORDERS] Lead sync gagal:", e);
    }

    // Notifikasi WhatsApp ke admin via Fonnte (aktif kalau FONNTE_TOKEN diisi). Di-await
    // supaya tetap terkirim di runtime serverless, tapi kegagalannya ditelan di dalam modul
    // fonnte sehingga tidak pernah menggagalkan pesanan yang sudah tersimpan.
    await notifyAdminNewOrder({
      orderNumber,
      customerName: customer.name,
      customerWhatsapp: customer.whatsapp,
      total,
      paymentType,
      items: validatedItems.map((item) => ({
        name: item.name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
      shippingCity: [shipping.district, shipping.city].filter(Boolean).join(", "),
      notes: shipping.notes || null,
    });

    console.log("[ORDERS] === ORDER SUCCESS ===", orderNumber);
    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: order.id,
      total,
      awbNo: null,
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
