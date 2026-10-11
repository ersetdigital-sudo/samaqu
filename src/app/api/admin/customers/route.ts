import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Data pelanggan untuk panel "Pelanggan" di dashboard admin.
//
// Tabel `customers` dibatasi policy RLS "read own", jadi anon client milik admin
// tidak bisa membaca baris pelanggan lain. Semua pembacaan lewat route ini
// (service role) setelah sesi Supabase + keanggotaan tabel `admins` diverifikasi.
//
// Satu pelanggan = satu baris `customers` bila akunnya terdaftar; pembeli yang
// tidak punya akun (order lama tanpa `customer_id`) tetap ikut ditampilkan sebagai
// entri "guest" yang dikelompokkan per nama, supaya tidak ada yang hilang.

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;

  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return false;

    const { data } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    return !!data;
  } catch (e) {
    console.error("[ADMIN] Verifikasi admin gagal:", e);
    return false;
  }
}

type ItemRow = { product_name: string | null; series: string | null; kain: string | null; color: string | null; quantity: number | null };
type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_whatsapp: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  total: number | null;
  status: string | null;
  created_at: string;
  order_items?: ItemRow[] | null;
};
type CustomerRow = { id: string; name: string | null; whatsapp: string | null; birth_date?: string | null };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** Ringkasan singkat isi pesanan untuk baris riwayat belanja. */
function describeItems(items?: ItemRow[] | null): string[] {
  if (!items) return [];
  return items.map((it) => {
    const name = it.product_name || it.series || it.kain || "Item";
    const color = it.color && it.color.toLowerCase() !== "default" ? ` ${it.color}` : "";
    const qty = it.quantity && it.quantity > 1 ? ` ×${it.quantity}` : "";
    return `${name}${color}${qty}`.trim();
  });
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // `birth_date` ditambahkan lewat migration terpisah — kalau belum dijalankan,
  // ulangi select tanpa kolom itu supaya daftarnya tidak kosong.
  let customers: CustomerRow[] = [];
  const withBirth = await admin.from("customers").select("id, name, whatsapp, birth_date");
  if (withBirth.error) {
    console.warn("[ADMIN] customers.birth_date belum tersedia, membaca tanpa kolom itu:", withBirth.error.message);
    const fallback = await admin.from("customers").select("id, name, whatsapp");
    customers = (fallback.data || []) as CustomerRow[];
  } else {
    customers = (withBirth.data || []) as CustomerRow[];
  }

  const { data: orders, error: ordersError } = await admin
    .from("orders")
    .select("id, order_number, customer_id, customer_name, customer_whatsapp, shipping_address, shipping_city, shipping_postal_code, total, status, created_at, order_items(product_name, series, kain, color, quantity)");
  if (ordersError) console.warn("[ADMIN] Gagal membaca orders:", ordersError.message);

  type Agg = {
    key: string;
    id: string | null;
    name: string;
    whatsapp: string;
    birthDate: string | null;
    registered: boolean;
    orders: { order_number: string; created_at: string; total: number; status: string; items: string[]; address: string | null }[];
    ordersCount: number;
    totalSpend: number;
    lastOrderAt: string | null;
  };

  const byKey = new Map<string, Agg>();
  const idByName = new Map<string, string>();

  for (const c of customers) {
    byKey.set(c.id, {
      key: c.id,
      id: c.id,
      name: c.name || "Tanpa nama",
      whatsapp: c.whatsapp || "",
      birthDate: c.birth_date || null,
      registered: true,
      orders: [],
      ordersCount: 0,
      totalSpend: 0,
      lastOrderAt: null,
    });
    const n = norm(c.name);
    if (n && !idByName.has(n)) idByName.set(n, c.id);
  }

  for (const o of (orders || []) as OrderRow[]) {
    // Utamakan `customer_id`; order lama (customer_id null) dicocokkan lewat nama.
    let key: string | null = null;
    if (o.customer_id && byKey.has(o.customer_id)) key = o.customer_id;
    else if (norm(o.customer_name) && idByName.has(norm(o.customer_name))) key = idByName.get(norm(o.customer_name)) || null;

    if (!key) {
      key = `guest:${norm(o.customer_name) || norm(o.customer_whatsapp) || o.id}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          id: null,
          name: o.customer_name || "Tanpa nama",
          whatsapp: o.customer_whatsapp || "",
          birthDate: null,
          registered: false,
          orders: [],
          ordersCount: 0,
          totalSpend: 0,
          lastOrderAt: null,
        });
      }
    }

    const agg = byKey.get(key)!;
    agg.orders.push({
      order_number: o.order_number,
      created_at: o.created_at,
      total: o.total || 0,
      status: o.status || "",
      items: describeItems(o.order_items),
      address: [o.shipping_address, o.shipping_city, o.shipping_postal_code].filter(Boolean).join(", ") || null,
    });
    agg.ordersCount += 1;
    // "Total belanja" = nilai yang benar-benar dibelanjakan, jadi pesanan batal tidak dihitung.
    if (o.status !== "dibatalkan") agg.totalSpend += o.total || 0;
    if (!agg.whatsapp && o.customer_whatsapp) agg.whatsapp = o.customer_whatsapp;
    if (!agg.lastOrderAt || o.created_at > agg.lastOrderAt) agg.lastOrderAt = o.created_at;
  }

  const result = Array.from(byKey.values());
  for (const c of result) c.orders.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ customers: result });
}
