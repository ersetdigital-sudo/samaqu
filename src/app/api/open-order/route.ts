import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { OPEN_ORDER_ADDON } from "@/lib/open-order-config";
import {
  buildOpenOrderProducts,
  findOpenOrderProduct,
  openOrderVariantFor,
  type OpenOrderCatalogRow,
  type OpenOrderStockRow,
} from "@/lib/open-order-offering";
import { markLeadBoughtForOrder } from "@/lib/ops-lead-sync";

/**
 * Pesanan dari alur Open Order Samaqu (halaman /open-order, 6 langkah).
 *
 * Sejak Open Order disamakan dengan pesanan biasa:
 * - **katalognya lintas kategori**: semua baris `products` yang `open_order_enabled` (kolom itu,
 *   default true) ikut, bukan cuma Thobe. Daftar "series yang dibuka" tidak dipakai lagi — admin
 *   memilih produk lewat sakelar di menu "Open Order" / form produk.
 * - **stok dipotong** seperti checkout website: stok dikurangi DULU secara atomik
 *   (`samaqu_decrement_stock`, satu per item). Kalau ada item yang gagal/stok kurang, semua
 *   decrement di-rollback dan pesanan ditolak. Stok ini stok yang sama dengan menu Produk, jadi
 *   otomatis sinkron. `orders.stock_reserved = true` menandai pesanan ini pernah memotong stok,
 *   supaya pembatalan (`src/lib/cancel-order.ts`) mengembalikannya dan pesanan CYO lama (yang
 *   belum pernah memotong) tidak ikut dikembalikan.
 * - `order_items.product_id` sekarang berisi **id baris `products` yang sebenarnya** (dulu kode
 *   kain), supaya stok & foto bisa dicocokkan.
 * - nomor pesanan tetap `CYO-`; resi J&T tetap dibuat admin setelah pembayaran diverifikasi.
 *
 * Ongkir dihitung di client lewat API J&T (`/api/shipping/jnt-cost`) dari kecamatan tujuan.
 * Harga produk/series tidak dipercaya dari client: baris katalog dibaca ulang di sini lewat
 * `buildOpenOrderProducts()` — sumber yang sama dengan wizard — lalu dipakai memvalidasi. Yang
 * datang dari client hanyalah harga pilihan customer (Create Your Price), di-clamp supaya tidak
 * pernah di bawah harga series terpilih.
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
  /** id baris `products` asli — dipakai untuk stok & order_items. */
  productId: string;
  productName: string;
  color: string;
  size: string;
  series: string | null;
  kain: string | null;
  quantity: number;
  price: number;
  minimumPrice: number;
  cypEnabled: boolean;
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

    // Katalog + varian dibaca ulang (sumber yang sama dengan wizard). Baris yang dimatikan admin
    // (`open_order_enabled = false`) otomatis tersaring di `buildOpenOrderProducts`.
    // Urutan `created_at` menaik sama seperti `getProducts()` supaya id produk grup-nya identik
    // dengan yang dikirim client.
    const { data: catalogRows, error: catalogError } = await supabaseAdmin
      .from("products")
      .select("*, jenis_kain(*)")
      .order("created_at", { ascending: true });

    if (catalogError) {
      console.error("[OPEN-ORDER] Catalog fetch error:", catalogError);
      return NextResponse.json({ error: "Gagal membaca katalog" }, { status: 500 });
    }

    const { data: stockRows } = await supabaseAdmin
      .from("product_variants")
      .select("product_id, color, size, stock");

    const products = buildOpenOrderProducts(
      (catalogRows ?? []) as OpenOrderCatalogRow[],
      (stockRows ?? []) as OpenOrderStockRow[]
    );
    if (products.length === 0) {
      return NextResponse.json({ error: "Katalog Open Order belum tersedia" }, { status: 400 });
    }

    const validatedItems: ValidatedItem[] = [];

    for (const item of rawItems) {
      const product = findOpenOrderProduct(products, String(item.productId ?? ""));
      if (!product) {
        return NextResponse.json({ error: "Produk tidak valid" }, { status: 400 });
      }

      const color = String(item.color ?? "");
      const size = String(item.size ?? "");
      const quantity = Number(item.quantity);

      if (product.colors.length > 0 && !product.colors.includes(color)) {
        return NextResponse.json({ error: `Warna untuk ${product.name} tidak valid` }, { status: 400 });
      }

      // Series opsional: wajib cocok kalau produknya punya series, wajib kosong kalau tidak.
      const requestedSeries = String(item.series ?? "").trim();
      if (product.series.length > 0) {
        if (!product.series.some((option) => option.name === requestedSeries)) {
          return NextResponse.json({ error: `Series untuk ${product.name} tidak valid` }, { status: 400 });
        }
      } else if (requestedSeries) {
        return NextResponse.json({ error: `Series untuk ${product.name} tidak valid` }, { status: 400 });
      }

      const variant = openOrderVariantFor(product, color, requestedSeries);
      if (!variant && product.colors.length > 0) {
        return NextResponse.json({ error: `Varian untuk ${product.name} tidak ditemukan` }, { status: 400 });
      }
      if (variant && variant.sizes.length > 0 && !variant.sizes.includes(size)) {
        return NextResponse.json({ error: `Ukuran untuk ${product.name} tidak tersedia` }, { status: 400 });
      }
      if (!size) {
        return NextResponse.json({ error: `Ukuran untuk ${product.name} tidak valid` }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return NextResponse.json({ error: `Jumlah untuk ${product.name} tidak valid` }, { status: 400 });
      }

      // Harga: bila Create Your Price aktif → pakai harga pilihan customer (minimal harga series
      // terpilih); bila tidak → harga katalog, harga dari client diabaikan.
      const seriesOption = product.series.find((option) => option.name === requestedSeries) ?? null;
      const minimumPrice = seriesOption?.price ?? product.minimumPrice;
      const requested = Math.round(Number(item.price));
      const price = product.cypEnabled
        ? Number.isFinite(requested) && requested > minimumPrice
          ? requested
          : minimumPrice
        : minimumPrice;

      validatedItems.push({
        productId: variant?.productId ?? product.id,
        productName: seriesOption ? `${product.name} — ${seriesOption.name}` : product.name,
        color,
        size,
        series: seriesOption ? seriesOption.name : null,
        kain: product.kain || null,
        quantity,
        price,
        minimumPrice,
        cypEnabled: product.cypEnabled,
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

    // ── Potong stok (atomik, rollback kalau ada yang gagal) ──
    // Sama seperti checkout website: stok dikurangi DULU, baru pesanan disimpan. Stok ini stok
    // yang sama dengan menu Produk, jadi otomatis sinkron.
    const decremented: Array<{ productId: string; color: string; size: string; quantity: number }> = [];

    async function rollbackStock() {
      for (const item of decremented) {
        await supabaseAdmin.rpc("samaqu_restore_stock", {
          p_product_id: item.productId,
          p_color: item.color,
          p_size: item.size,
          p_qty: item.quantity,
        });
      }
      decremented.length = 0;
    }

    for (const item of validatedItems) {
      // Produk tanpa varian (tanpa warna/ukuran) → stok tidak dikelola, lewati.
      if (!item.color || !item.size || item.color === "-") continue;

      const { data: stockOk, error: stockError } = await supabaseAdmin.rpc("samaqu_decrement_stock", {
        p_product_id: item.productId,
        p_color: item.color,
        p_size: item.size,
        p_qty: item.quantity,
      });

      if (stockError) {
        console.error("[OPEN-ORDER] Stock RPC error:", stockError);
        await rollbackStock();
        return NextResponse.json({ error: "Gagal memvalidasi stok. Silakan coba lagi." }, { status: 500 });
      }
      if (!stockOk) {
        console.error("[OPEN-ORDER] Stock INSUFFICIENT:", item);
        await rollbackStock();
        return NextResponse.json(
          {
            error: `Stok "${item.productName}" (${item.color} / ${item.size}) tidak mencukupi. Silakan kurangi jumlah atau pilih varian lain.`,
          },
          { status: 400 }
        );
      }

      decremented.push({ productId: item.productId, color: item.color, size: item.size, quantity: item.quantity });
      console.log("[OPEN-ORDER] Stock decremented:", {
        name: item.productName,
        color: item.color,
        size: item.size,
        qty: item.quantity,
      });
    }

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
        // Pesanan ini sudah memotong stok → pembatalan wajib mengembalikannya.
        stock_reserved: true,
        shipping_notes: [instagram ? `IG @${instagram}` : "", note].filter(Boolean).join(" · "),
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("[OPEN-ORDER] Order insert error:", orderError);
      await rollbackStock();
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
      customer_price: item.cypEnabled ? item.price : null,
      minimum_price: item.cypEnabled ? item.minimumPrice : null,
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
      await rollbackStock();
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
