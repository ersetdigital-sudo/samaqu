import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { OPEN_ORDER_ADDON, OPEN_ORDER_SIZES } from "@/lib/open-order-config";
import {
  buildOpenOrderProducts,
  findOpenOrderProduct,
  restrictOpenOrderProducts,
  type OpenOrderCatalogRow,
} from "@/lib/open-order-offering";
import { openOrderSeriesList } from "@/lib/open-order-window";
import { markLeadBoughtForOrder } from "@/lib/ops-lead-sync";

/**
 * Pesanan dari alur Open Order Samaqu (halaman /open-order, 6 langkah).
 *
 * Ongkir dihitung di client lewat API J&T (`/api/shipping/jnt-cost`) dari kecamatan tujuan,
 * lalu ikut dikirim bersama pesanan. Pesanan disimpan ke `orders` + `order_items` dengan:
 * - nomor pesanan berawalan `CYO-` (membedakan dari pesanan checkout website),
 * - `shipping_method` = "J&T - <service>" dan `shipping_cost` = tarif J&T; kalau customer
 *   belum mengisi kecamatan atau hitungannya gagal, jatuh ke "manual" / 0 dan admin
 *   menghitung ongkir menyusul,
 * - `status` = "pending" supaya muncul di dashboard admin sebagai pesanan baru,
 * - `awb_no` TIDAK dibuat di sini: resi J&T terbit saat admin menekan tombol "Atur Pesanan" di
 *   drawer detail pesanan (`PATCH /api/admin/orders` dengan `action: "createJnt"`) setelah
 *   pembayaran diverifikasi — sama seperti checkout website di /api/orders,
 * - `customer_id` dari sesi yang terverifikasi (header `Authorization`), jadi checkout Open Order
 *   hanya bisa diselesaikan customer yang sudah masuk/daftar dan pesanannya muncul di menu
 *   "Pesanan" milik akun itu. Tanpa sesi valid route membalas 401.
 *
 * Harga produk/series tidak dipercaya dari client: baris katalog (`products`) dibaca ulang di
 * sini lewat `buildOpenOrderProducts()` — sumber yang sama dengan wizard — lalu dipakai
 * memvalidasi.
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
    const supabaseAdmin = getSupabaseAdmin();

    // Checkout Open Order hanya untuk customer yang sudah masuk/daftar (gerbang `StepAuth` di
    // wizard). Token sesi diverifikasi di sini supaya request langsung tanpa login ikut ditolak,
    // dan `customer_id` diambil dari token — bukan dari body — sehingga pesanan selalu menempel
    // ke akun pemilik sesi dan muncul di menu "Pesanan".
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    const { data: authData, error: authError } = token
      ? await supabaseAdmin.auth.getUser(token)
      : { data: { user: null }, error: null };
    const customerId = authData?.user?.id ?? null;
    if (authError || !customerId) {
      return NextResponse.json({ error: "Silakan masuk atau daftar dulu untuk menyelesaikan pesanan." }, { status: 401 });
    }

    // Sesi harus milik akun pelanggan (baris di tabel `customers`) — sama seperti yang dicek
    // `loginCustomer` di klien, dan `orders.customer_id` memang ber-FK ke tabel itu.
    const { data: customerRow } = await supabaseAdmin.from("customers").select("id").eq("id", customerId).maybeSingle();
    if (!customerRow) {
      return NextResponse.json({ error: "Akun ini bukan akun pelanggan. Silakan masuk dengan akun pelanggan." }, { status: 403 });
    }

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

    // Penawaran Open Order diturunkan dari katalog (sama seperti wizard), jadi harga/warna/
    // series yang berlaku selalu yang ada di tabel `products` — bukan yang dikirim client.
    const { data: catalogRows, error: catalogError } = await supabaseAdmin
      .from("products")
      .select("*, jenis_kain(*)")
      .eq("category", "Thobe");

    if (catalogError) {
      console.error("[OPEN-ORDER] Catalog fetch error:", catalogError);
      return NextResponse.json({ error: "Gagal membaca katalog" }, { status: 500 });
    }

    // Series yang dibuka diatur admin (menu "Open Order" → store_settings.open_order_series);
    // daftar kosong = semua series. Dibatasi di sini juga supaya series yang ditutup tidak bisa
    // dipesan lewat request langsung. Kalau kolomnya belum ada, select ini gagal dan dianggap
    // "semua series" (perilaku lama).
    const { data: settingsRow } = await supabaseAdmin
      .from("store_settings")
      .select("open_order_series")
      .eq("id", 1)
      .maybeSingle();

    const products = restrictOpenOrderProducts(
      buildOpenOrderProducts((catalogRows ?? []) as OpenOrderCatalogRow[]),
      openOrderSeriesList(settingsRow?.open_order_series)
    );
    if (products.length === 0) {
      return NextResponse.json({ error: "Katalog Open Order belum tersedia" }, { status: 400 });
    }

    const validatedItems: ValidatedItem[] = [];

    for (const item of rawItems) {
      const product = findOpenOrderProduct(products, String(item.productId ?? ""));
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

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: name,
        customer_email: authData?.user?.email ?? null,
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

    // Resi J&T tidak dibuat di sini — admin menekan "Atur Pesanan" setelah pembayaran
    // diverifikasi (PATCH /api/admin/orders action=createJnt).

    // Sinkron ke lead: kalau nomor ini cocok dengan lead yang masih aktif, tandai Closing/Beli
    // (order tidak membuat lead baru). Kegagalan sync tidak menggagalkan pesanan.
    try {
      await markLeadBoughtForOrder(supabaseAdmin, { whatsapp, orderNumber, total });
    } catch (e) {
      console.error("[OPEN-ORDER] Lead sync gagal:", e);
    }

    console.log("[OPEN-ORDER] Created:", { orderNumber, items: orderItems.length, total });
    return NextResponse.json({ success: true, orderNumber, total, awbNo: null });
  } catch (error) {
    console.error("[OPEN-ORDER] Failed:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
