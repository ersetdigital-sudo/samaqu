import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { localPhone } from "@/lib/whatsapp";
import { kotaFromShipping, prettifyCity, provinceOfCity } from "@/lib/kota";

const normPhone = (value: unknown) =>
  String(value ?? "").replace(/\D/g, "").replace(/^0+/, "").replace(/^62/, "");
const normName = (value: unknown) => String(value ?? "").trim().toLowerCase();

/**
 * Alamat tersimpan pelanggan — dibaca & ditambah admin dari menu Transaksi.
 *
 * Pakai tabel `saved_addresses` yang SAMA dengan yang dipakai checkout website & menu Akun
 * (tidak ada tabel alamat baru). Tabel itu punya RLS khusus pemiliknya, jadi dari sisi ops
 * aksesnya lewat service role dan tetap dijaga `isOpsAdmin` seperti route ops lain.
 *
 * Selain daftar alamat, ikut dikirim `last`: alamat dari PESANAN TERAKHIR pelanggan itu.
 * Dipakai form transaksi supaya begitu pelanggan dipilih alamatnya langsung terisi — pelanggan
 * lama sering belum punya alamat di buku alamat, padahal alamatnya ada di riwayat pesanannya.
 */
export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const sp = new URL(req.url).searchParams;
  const customerId = String(sp.get("customer_id") || "").trim();
  const whatsapp = String(sp.get("whatsapp") || "").trim();
  const name = String(sp.get("name") || "").trim();

  const admin = getSupabaseAdmin();

  let items: any[] = [];
  if (customerId) {
    const { data, error } = await admin
      .from("saved_addresses")
      .select("id, label, recipient_name, phone, address, province, city, kecamatan, postal_code, is_default, created_at")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    items = data || [];
  }

  // Alamat pesanan terakhir — termasuk pesanan yang DIBATALKAN, karena pelanggan yang hanya
  // punya pesanan batal tetap harus bisa dipakai lagi nomor HP & alamatnya. Dicocokkan lewat
  // customer_id, lalu nomor HP yang sudah dinormalisasi, lalu nama.
  let last = null;
  const phone = normPhone(whatsapp);
  const personName = normName(name);
  if (customerId || phone || personName) {
    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select(
        "order_number, created_at, customer_id, customer_name, customer_whatsapp, shipping_address, shipping_city, shipping_province, shipping_kecamatan, shipping_postal_code",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

    const match = (orders || []).find((order) => {
      const address = String(order.shipping_address || "").trim();
      if (!address || address === "-") return false;
      if (customerId && order.customer_id === customerId) return true;
      if (phone && normPhone(order.customer_whatsapp) === phone) return true;
      return Boolean(personName) && normName(order.customer_name) === personName;
    });

    if (match) {
      // Kecamatan hanya diambil dari `shipping_city` kalau memang berformat "<kecamatan>, <kota>".
      // Kalau tidak ada, kecamatan dibiarkan KOSONG — lebih baik kosong daripada salah isi,
      // karena kecamatan dipakai untuk kode area J&T saat bikin resi.
      const cityParts = String(match.shipping_city || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const kecamatan = String(match.shipping_kecamatan || "").trim() || (cityParts.length > 1 ? cityParts[0] : "");
      // Kota ditulis tanpa prefix administratif supaya cocok dengan pilihan di form
      // ("Kota Bekasi" → "Bekasi", "Kab. Bogor" → "Bogor").
      const city = prettifyCity(kotaFromShipping(match.shipping_city, kecamatan));
      // Kecamatan HANYA diambil dari data yang memang tersimpan (kolom khusus, atau bagian depan
      // `shipping_city` yang berformat "<kecamatan>, <kota>"). Tidak ada tebakan dari teks alamat —
      // kalau datanya tidak ada, kecamatan dibiarkan kosong supaya admin mengisi sendiri.
      last = {
        order_number: match.order_number,
        created_at: match.created_at,
        address: String(match.shipping_address || "").trim(),
        kecamatan,
        city,
        province: String(match.shipping_province || "").trim() || provinceOfCity(city),
        postal_code: String(match.shipping_postal_code || "").trim(),
        // Nama penerima paket pada pesanan itu (kolom `orders.customer_name`) — dipakai form
        // Transaksi supaya nama penerimanya ikut terisi, bukan nama akun pelanggan.
        recipient_name: String(match.customer_name || "").trim(),
      };
    }
  }

  return NextResponse.json({ items, last });
}

/** Tambah alamat baru untuk pelanggan (dipakai tombol "Tambah alamat baru"). */
export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  try {
    const body = await req.json();
    const customerId = String(body?.customer_id || "").trim();
    const address = String(body?.address || "").trim();
    const province = String(body?.province || "").trim();
    const city = String(body?.city || "").trim();
    const kecamatan = String(body?.kecamatan || "").trim();
    const postalCode = String(body?.postal_code || "").trim();
    const recipientName = String(body?.recipient_name || "").trim();
    const phone = localPhone(String(body?.phone || ""));

    if (!customerId) return NextResponse.json({ error: "Pelanggan tidak dikenal" }, { status: 400 });
    if (!address || !province || !city || !kecamatan || !postalCode) {
      return NextResponse.json({ error: "Alamat belum lengkap" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: existing, error: readError } = await admin
      .from("saved_addresses")
      .select("id")
      .eq("customer_id", customerId)
      .limit(1);
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

    // Alamat pertama otomatis jadi alamat utama; kalau sudah ada, alamat utama tidak digeser.
    const isFirst = (existing || []).length === 0;

    const { data, error } = await admin
      .from("saved_addresses")
      .insert({
        customer_id: customerId,
        label: String(body?.label || "").trim() || "Alamat",
        recipient_name: recipientName || "Pelanggan",
        phone,
        address,
        province,
        city,
        kecamatan,
        postal_code: postalCode,
        is_default: isFirst,
      })
      .select("id, label, recipient_name, phone, address, province, city, kecamatan, postal_code, is_default, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("[OPS] alamat POST:", error);
    return NextResponse.json({ error: "Gagal menyimpan alamat" }, { status: 500 });
  }
}
