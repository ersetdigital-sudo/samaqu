import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { cancelOrderCompletely, type CancelableOrder } from "@/lib/cancel-order";
import { MANUAL_SOURCE_KEYS, itemSummary, sourceKey, sourceLabel, statusLabel } from "@/lib/transaksi";
import { localPhone } from "@/lib/whatsapp";
import { kotaFromShipping } from "@/lib/kota";

/**
 * Menu "Transaksi" dashboard internal.
 *
 * Datanya SAMA dengan pesanan website — tidak ada tabel pesanan kedua: baris di sini
 * berasal dari `orders` + `order_items` (pesanan website & Open Order otomatis muncul),
 * ditambah transaksi manual yang dicatat admin (WhatsApp/Instagram/Shopee/TikTok/Offline).
 *
 * Yang membedakan transaksi manual hanyalah kolom `orders.source` (Website = default dari
 * checkout) dan statusnya langsung `diproses` (= Lunas) karena dibayar di tempat.
 *
 * Stok memakai jalur yang sama dengan checkout: RPC `samaqu_decrement_stock` saat dicatat
 * (sudah menghormati stok bersama ala series) dan `samaqu_restore_stock` saat dibatalkan
 * (lewat `cancelOrderCompletely`, penandanya `orders.stock_reserved`).
 */

const pad = (n: number) => String(n).padStart(2, "0");
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const bad = (message: string) => NextResponse.json({ error: message }, { status: 400 });

/** Tanggal & jam WIB dari sebuah timestamptz — dipakai kolom Tanggal/Jam di layar. */
function wibParts(iso: string) {
  const w = new Date(new Date(iso).getTime() + WIB_OFFSET_MS);
  return {
    date_wib: `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(w.getUTCDate())}`,
    time_wib: `${pad(w.getUTCHours())}.${pad(w.getUTCMinutes())}`,
  };
}

/** Awal hari (WIB) dalam bentuk timestamptz, dari "YYYY-MM-DD". */
const wibDayStart = (dateStr: string) => `${dateStr}T00:00:00+07:00`;

function shiftDay(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function newOrderNumber(createdAt: Date) {
  return `OPS-${createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

type ItemInput = { product_id?: unknown; color?: unknown; size?: unknown; quantity?: unknown };

type Shipping = {
  address: string;
  province: string;
  city: string;
  kecamatan: string;
  postal_code: string;
};

/** Isian alamat wajib lengkap — sama seperti checkout website. */
function readShipping(body: any): { shipping?: Shipping; error?: string } {
  const address = String(body?.shipping?.address || "").trim();
  const province = String(body?.shipping?.province || "").trim();
  const city = String(body?.shipping?.city || "").trim();
  const kecamatan = String(body?.shipping?.kecamatan || "").trim();
  const postalCode = String(body?.shipping?.postal_code || "").trim();
  if (!address) return { error: "Alamat lengkap wajib diisi" };
  if (!province) return { error: "Provinsi wajib dipilih" };
  if (!city) return { error: "Kota/Kabupaten wajib dipilih" };
  if (!kecamatan) return { error: "Kecamatan wajib diisi" };
  if (!postalCode) return { error: "Kode pos wajib diisi" };
  return { shipping: { address, province, city, kecamatan, postal_code: postalCode } };
}

/**
 * `orders.shipping_city` tetap disimpan "<kecamatan>, <kota>" — format yang sama dengan
 * checkout website, karena kolom itu dipakai saat admin membuat resi J&T.
 * Provinsi & kecamatan juga disimpan terpisah di kolomnya masing-masing.
 */
const shippingCityValue = (shipping: Shipping) =>
  [shipping.kecamatan, shipping.city].filter(Boolean).join(", ");

/** Tambah alamat baru ke daftar alamat pelanggan (tabel yang sama dengan checkout). */
async function saveCustomerAddress(
  admin: Admin,
  customerId: string | null,
  name: string,
  whatsapp: string,
  shipping: Shipping,
) {
  if (!customerId) return;
  const { data: existing } = await admin
    .from("saved_addresses")
    .select("id")
    .eq("customer_id", customerId)
    .limit(1);
  const isFirst = (existing || []).length === 0;

  const { error } = await admin.from("saved_addresses").insert({
    customer_id: customerId,
    label: "Alamat",
    recipient_name: name || "Pelanggan",
    phone: localPhone(whatsapp),
    address: shipping.address,
    province: shipping.province,
    city: shipping.city,
    kecamatan: shipping.kecamatan,
    postal_code: shipping.postal_code,
    is_default: isFirst,
  });
  // Alamat gagal disimpan tidak boleh menggagalkan transaksinya — alamatnya sudah
  // tercatat di pesanan, ini cuma menambahkannya ke buku alamat pelanggan.
  if (error) console.error("[OPS] simpan alamat pelanggan:", error.message);
}

type Snapshot = {
  product_id: string;
  product_name: string;
  series: string | null;
  kain: string | null;
  color: string;
  size: string;
  quantity: number;
  price: number;
};

type Admin = ReturnType<typeof getSupabaseAdmin>;

/**
 * Harga & nama produk SELALU dibaca ulang dari database (tidak dipercaya dari layar),
 * sama seperti checkout website. Ukuran juga divalidasi harus benar-benar ada supaya
 * pemotongan stok tidak diam-diam terlewat.
 */
async function buildSnapshot(admin: Admin, input: ItemInput[]): Promise<{ items?: Snapshot[]; error?: string }> {
  const cleaned = input
    .map((row) => ({
      product_id: String(row?.product_id || "").trim(),
      color: String(row?.color || "default").trim() || "default",
      size: String(row?.size || "").trim().toUpperCase(),
      quantity: Math.round(Number(row?.quantity) || 0),
    }))
    .filter((row) => row.product_id);

  if (cleaned.length === 0) return { error: "Minimal satu produk harus diisi" };
  for (const row of cleaned) {
    if (!row.size) return { error: "Ukuran produk harus dipilih" };
    if (row.quantity < 1 || row.quantity > 99) return { error: "Jumlah produk harus antara 1 dan 99" };
  }

  const productIds = [...new Set(cleaned.map((row) => row.product_id))];
  const [{ data: products }, { data: variants }] = await Promise.all([
    admin.from("products").select("id, name, series, price, jenis_kain(name)").in("id", productIds),
    admin.from("product_variants").select("product_id, color, size").in("product_id", productIds),
  ]);

  const productById = new Map<string, any>((products || []).map((p: any) => [p.id, p]));
  const variantSet = new Set((variants || []).map((v: any) => `${v.product_id}||${v.color}||${String(v.size).toUpperCase()}`));

  const items: Snapshot[] = [];
  for (const row of cleaned) {
    const product = productById.get(row.product_id);
    if (!product) return { error: `Produk tidak ditemukan (${row.product_id})` };
    if (!variantSet.has(`${row.product_id}||${row.color}||${row.size}`)) {
      return { error: `Ukuran ${row.size} tidak tersedia untuk ${product.name}` };
    }
    items.push({
      product_id: row.product_id,
      product_name: product.name,
      series: product.series ?? null,
      kain: product.jenis_kain?.name ?? null,
      color: row.color,
      size: row.size,
      quantity: row.quantity,
      price: Number(product.price) || 0,
    });
  }
  return { items };
}

/** Potong stok satu per satu (atomik per baris); kembalikan baris yang sudah terpotong untuk rollback. */
async function deductStock(admin: Admin, items: Snapshot[]) {
  const done: Snapshot[] = [];
  for (const item of items) {
    const { data, error } = await admin.rpc("samaqu_decrement_stock", {
      p_product_id: item.product_id,
      p_color: item.color,
      p_size: item.size,
      p_qty: item.quantity,
    });
    if (error) return { ok: false as const, done, message: "Gagal memeriksa stok produk" };
    if (data === false) {
      return {
        ok: false as const,
        done,
        message: `Stok ${item.product_name} (${item.color} / ${item.size}) tidak mencukupi`,
      };
    }
    done.push(item);
  }
  return { ok: true as const, done };
}

async function restoreStock(admin: Admin, items: Snapshot[]) {
  for (const item of items) {
    await admin.rpc("samaqu_restore_stock", {
      p_product_id: item.product_id,
      p_color: item.color,
      p_size: item.size,
      p_qty: item.quantity,
    });
  }
}

/** Daftar transaksi per PESANAN (bukan per item) untuk bulan terpilih. */
export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const sp = new URL(req.url).searchParams;
  const start = String(sp.get("start") || "").trim();
  const end = String(sp.get("end") || "").trim();
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "1000", 10) || 1000, 1), 2000);

  const admin = getSupabaseAdmin();
  let query = admin
    .from("orders")
    .select(
      "id, order_number, created_at, customer_id, customer_name, customer_whatsapp, status, source, subtotal, discount, shipping_cost, total, shipping_notes, awb_no, shipping_address, shipping_city, shipping_province, shipping_kecamatan, shipping_postal_code",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  // Batas bulan dihitung dalam WIB supaya transaksi dini hari tidak salah bulan.
  if (start) query = query.gte("created_at", wibDayStart(start));
  if (end) query = query.lt("created_at", wibDayStart(shiftDay(end, 1)));

  const { data: orders, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = orders || [];
  if (list.length === 0) return NextResponse.json({ items: [] });

  const { data: lineItems } = await admin
    .from("order_items")
    .select("order_id, product_id, product_name, series, kain, color, size, quantity, price")
    .in("order_id", list.map((o) => o.id));

  const byOrder = new Map<string, any[]>();
  for (const item of lineItems || []) {
    if (!byOrder.has(item.order_id)) byOrder.set(item.order_id, []);
    byOrder.get(item.order_id)!.push(item);
  }

  const items = list.map((order) => {
    const rows = byOrder.get(order.id) || [];
    const status = String(order.status || "");
    const key = sourceKey(order.source);
    return {
      id: order.id,
      order_number: order.order_number,
      created_at: order.created_at,
      ...wibParts(order.created_at),
      customer_id: order.customer_id ?? null,
      customer_name: order.customer_name || "-",
      customer_whatsapp: order.customer_whatsapp || "",
      source: key,
      source_label: sourceLabel(key),
      status,
      status_label: statusLabel(status),
      subtotal: Number(order.subtotal) || 0,
      discount: Number(order.discount) || 0,
      shipping_cost: Number(order.shipping_cost) || 0,
      total: Number(order.total) || 0,
      notes: order.shipping_notes || "",
      shipping_address: order.shipping_address || "",
      shipping_city: order.shipping_city || "",
      shipping_province: order.shipping_province || "",
      shipping_kecamatan: order.shipping_kecamatan || "",
      shipping_postal_code: order.shipping_postal_code || "",
      // Kota dipisah dari `shipping_city` ("<kecamatan>, <kota>") supaya layar tidak perlu
      // tahu aturan penggabungannya.
      kota: kotaFromShipping(order.shipping_city, order.shipping_kecamatan),
      qty_total: rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
      item_summary: itemSummary(rows),
      items: rows,
      // Pesanan website hanya dipantau dari sini (sumbernya read-only); yang boleh
      // diubah/dibatalkan dari menu ini cuma transaksi yang dicatat manual.
      can_edit: key !== "website" && status !== "dibatalkan",
      can_cancel: status === "pending" || status === "diproses",
    };
  });

  return NextResponse.json({ items });
}

/** Catat transaksi manual: langsung Lunas (`diproses`), stok langsung terpotong. */
export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  try {
    const body = await req.json();

    const customerName = String(body?.customer_name || "").trim();
    const customerWhatsapp = String(body?.customer_whatsapp || "").trim();
    const customerId = String(body?.customer_id || "").trim() || null;
    const source = String(body?.source || "").trim().toLowerCase();
    const notes = String(body?.notes || "").trim();
    const shippingCost = Math.max(0, Math.round(Number(body?.shipping_cost) || 0));
    const discount = Math.max(0, Math.round(Number(body?.discount) || 0));
    const createdAt = new Date(String(body?.created_at || ""));
    const inputItems: ItemInput[] = Array.isArray(body?.items) ? body.items : [];

    if (!customerName) return bad("Nama pelanggan wajib diisi");
    if (!customerWhatsapp) return bad("Nomor HP pelanggan wajib diisi");
    if (!MANUAL_SOURCE_KEYS.includes(source)) return bad("Sumber transaksi tidak valid");
    if (Number.isNaN(createdAt.getTime())) return bad("Tanggal/jam transaksi tidak valid");

    const shippingResult = readShipping(body);
    if (shippingResult.error || !shippingResult.shipping) return bad(shippingResult.error || "Alamat belum lengkap");
    const shipping = shippingResult.shipping;

    const admin = getSupabaseAdmin();
    const snapshot = await buildSnapshot(admin, inputItems);
    if (snapshot.error || !snapshot.items) return bad(snapshot.error || "Produk tidak valid");

    const items = snapshot.items;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const finalDiscount = Math.min(discount, subtotal);
    const total = subtotal - finalDiscount + shippingCost;

    // Stok dipotong sebelum pesanan disimpan — kalau ada yang kurang, tidak ada yang tersimpan.
    const deducted = await deductStock(admin, items);
    if (!deducted.ok) {
      await restoreStock(admin, deducted.done);
      return bad(deducted.message);
    }

    const orderRow = {
      customer_id: customerId,
      customer_name: customerName,
      customer_whatsapp: customerWhatsapp,
      // Alamat yang diisi admin disimpan di pesanan — inilah yang dibaca menu Pelanggan
      // ("Riwayat Belanja & Alamat") dan Database Kota.
      shipping_address: shipping.address,
      shipping_city: shippingCityValue(shipping),
      shipping_kecamatan: shipping.kecamatan,
      shipping_province: shipping.province,
      shipping_postal_code: shipping.postal_code,
      shipping_notes: notes || null,
      shipping_cost: shippingCost,
      payment_method: "cash",
      payment_status: "paid",
      paid_at: createdAt.toISOString(),
      subtotal,
      discount: finalDiscount,
      total,
      status: "diproses",
      // Stok sudah dipotong di atas → pembatalan wajib mengembalikannya.
      stock_reserved: true,
      source,
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    };

    let order: { id: string; order_number: string } | null = null;
    let insertError: { message: string } | null = null;
    for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
      const candidate = { ...orderRow, order_number: newOrderNumber(createdAt) };
      const { data, error } = await admin.from("orders").insert(candidate).select("id, order_number").single();
      if (!error) {
        order = data;
        break;
      }
      insertError = error;
      // Nomor pesanan bentrok → coba nomor lain; error lain langsung dilaporkan.
      if (!/duplicate|unique/i.test(error.message)) break;
    }

    if (!order) {
      await restoreStock(admin, items);
      console.error("[OPS] transaksi insert:", insertError?.message);
      return bad("Gagal menyimpan transaksi. Coba lagi.");
    }

    const { error: itemsError } = await admin.from("order_items").insert(
      items.map((item) => ({
        order_id: order!.id,
        product_id: item.product_id,
        product_name: item.product_name,
        series: item.series,
        kain: item.kain,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
    );

    if (itemsError) {
      await admin.from("orders").delete().eq("id", order.id);
      await restoreStock(admin, items);
      console.error("[OPS] transaksi items:", itemsError.message);
      return bad("Gagal menyimpan produk transaksi. Coba lagi.");
    }

    // Alamat baru (kalau admin menambahkannya) ikut masuk buku alamat pelanggan.
    if (body?.save_address) await saveCustomerAddress(admin, customerId, customerName, customerWhatsapp, shipping);

    return NextResponse.json({ order_number: order.order_number, total });
  } catch (e) {
    console.error("[OPS] transaksi POST:", e);
    return NextResponse.json({ error: "Gagal menyimpan transaksi" }, { status: 500 });
  }
}

/**
 * Ubah transaksi manual (`action: "update"`) atau batalkan (`action: "cancel"`).
 *
 * Pembatalan memakai jalur bersama `cancelOrderCompletely` — sama dengan tombol batal di
 * panel admin: resi J&T di-void lebih dulu (kalau ada) baru stok dikembalikan, jadi tidak
 * ada dua aturan stok yang berbeda antar layar.
 */
export async function PATCH(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  try {
    const body = await req.json();
    const orderNumber = String(body?.order_number || "").trim();
    const action = String(body?.action || "").trim();
    if (!orderNumber) return bad("Nomor pesanan wajib diisi");

    const admin = getSupabaseAdmin();
    const { data: order, error } = await admin
      .from("orders")
      .select("id, order_number, status, source, awb_no, jnt_order_id, stock_reserved, customer_name, customer_whatsapp, customer_id")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!order) return bad("Pesanan tidak ditemukan");

    const manual = sourceKey(order.source) !== "website";

    if (action === "cancel") {
      // "Dibatalkan sebelum dikirim" — pesanan yang sudah jalan tidak bisa dibatalkan di sini.
      if (order.status !== "pending" && order.status !== "diproses") {
        return bad("Pesanan yang sudah dikirim atau sudah dibatalkan tidak bisa dibatalkan di sini");
      }
      const result = await cancelOrderCompletely(
        {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          awb_no: order.awb_no,
          jnt_order_id: order.jnt_order_id,
          stock_reserved: order.stock_reserved,
          customer_name: order.customer_name,
          customer_whatsapp: order.customer_whatsapp,
        } as CancelableOrder,
        "Dibatalkan dari menu Transaksi",
      );
      if (!result.success) return bad(result.message);
      return NextResponse.json({ order_number: order.order_number, cancelled: true });
    }

    if (action !== "update") return bad("Aksi tidak dikenal");
    if (!manual) return bad("Pesanan website tidak bisa diubah dari menu Transaksi");
    if (order.status === "dibatalkan") return bad("Transaksi yang sudah dibatalkan tidak bisa diubah");

    const customerName = String(body?.customer_name || "").trim();
    const customerWhatsapp = String(body?.customer_whatsapp || "").trim();
    const source = String(body?.source || "").trim().toLowerCase();
    const notes = String(body?.notes || "").trim();
    const shippingCost = Math.max(0, Math.round(Number(body?.shipping_cost) || 0));
    const discount = Math.max(0, Math.round(Number(body?.discount) || 0));
    const createdAt = new Date(String(body?.created_at || ""));
    const inputItems: ItemInput[] = Array.isArray(body?.items) ? body.items : [];

    if (!customerName) return bad("Nama pelanggan wajib diisi");
    if (!customerWhatsapp) return bad("Nomor HP pelanggan wajib diisi");
    if (!MANUAL_SOURCE_KEYS.includes(source)) return bad("Sumber transaksi tidak valid");
    if (Number.isNaN(createdAt.getTime())) return bad("Tanggal/jam transaksi tidak valid");

    const shippingResult = readShipping(body);
    if (shippingResult.error || !shippingResult.shipping) return bad(shippingResult.error || "Alamat belum lengkap");
    const shipping = shippingResult.shipping;

    const snapshot = await buildSnapshot(admin, inputItems);
    if (snapshot.error || !snapshot.items) return bad(snapshot.error || "Produk tidak valid");
    const items = snapshot.items;

    const { data: oldRows } = await admin
      .from("order_items")
      .select("product_id, color, size, quantity")
      .eq("order_id", order.id);

    // Selisih per (produk, warna, ukuran): yang bertambah dipotong, yang berkurang dikembalikan.
    // Baris yang tidak berubah tidak menyentuh stok sama sekali.
    const keyOf = (productId: string, color: string, size: string) =>
      `${productId}||${color}||${String(size).toUpperCase()}`;
    const delta = new Map<string, { product_id: string; color: string; size: string; qty: number }>();
    for (const row of oldRows || []) {
      const key = keyOf(row.product_id, row.color || "default", row.size);
      const entry = delta.get(key) || { product_id: row.product_id, color: row.color || "default", size: String(row.size).toUpperCase(), qty: 0 };
      entry.qty -= Number(row.quantity) || 0;
      delta.set(key, entry);
    }
    for (const item of items) {
      const key = keyOf(item.product_id, item.color, item.size);
      const entry = delta.get(key) || { product_id: item.product_id, color: item.color, size: item.size, qty: 0 };
      entry.qty += item.quantity;
      delta.set(key, entry);
    }

    const toDeduct = [...delta.values()].filter((d) => d.qty > 0);
    const toRestore = [...delta.values()].filter((d) => d.qty < 0);

    const deducted = await deductStock(
      admin,
      toDeduct.map((d) => ({
        product_id: d.product_id,
        product_name: d.product_id,
        series: null,
        kain: null,
        color: d.color,
        size: d.size,
        quantity: d.qty,
        price: 0,
      })),
    );
    if (!deducted.ok) {
      await restoreStock(admin, deducted.done);
      return bad(deducted.message.replace(/^Stok /, "Stok tambahan "));
    }
    await restoreStock(
      admin,
      toRestore.map((d) => ({
        product_id: d.product_id,
        product_name: d.product_id,
        series: null,
        kain: null,
        color: d.color,
        size: d.size,
        quantity: Math.abs(d.qty),
        price: 0,
      })),
    );

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const finalDiscount = Math.min(discount, subtotal);
    const total = subtotal - finalDiscount + shippingCost;

    const { error: updateError } = await admin
      .from("orders")
      .update({
        customer_name: customerName,
        customer_whatsapp: customerWhatsapp,
        customer_id: String(body?.customer_id || "").trim() || order.customer_id || null,
        source,
        shipping_address: shipping.address,
        shipping_city: shippingCityValue(shipping),
        shipping_kecamatan: shipping.kecamatan,
        shipping_province: shipping.province,
        shipping_postal_code: shipping.postal_code,
        shipping_notes: notes || null,
        shipping_cost: shippingCost,
        discount: finalDiscount,
        subtotal,
        total,
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString(),
      })
      .eq("id", order.id);
    if (updateError) {
      console.error("[OPS] transaksi PATCH order:", updateError.message);
      return NextResponse.json({ error: "Gagal memperbarui transaksi" }, { status: 500 });
    }

    // Ganti daftar item: hapus lama, tulis ulang snapshot baru.
    const { error: deleteError } = await admin.from("order_items").delete().eq("order_id", order.id);
    if (deleteError) {
      console.error("[OPS] transaksi PATCH delete items:", deleteError.message);
      return NextResponse.json({ error: "Gagal memperbarui produk transaksi" }, { status: 500 });
    }

    const { error: insertError } = await admin.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        series: item.series,
        kain: item.kain,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
    );
    if (insertError) {
      console.error("[OPS] transaksi PATCH insert items:", insertError.message);
      return NextResponse.json({ error: "Gagal menyimpan produk transaksi" }, { status: 500 });
    }

    // Alamat baru (kalau admin menambahkannya) ikut masuk buku alamat pelanggan.
    if (body?.save_address) {
      await saveCustomerAddress(
        admin,
        String(body?.customer_id || "").trim() || order.customer_id || null,
        customerName,
        customerWhatsapp,
        shipping,
      );
    }

    return NextResponse.json({ order_number: order.order_number, total });
  } catch (e) {
    console.error("[OPS] transaksi PATCH:", e);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}
