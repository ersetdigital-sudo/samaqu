import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { localPhone } from "@/lib/whatsapp";

/**
 * Alamat tersimpan pelanggan — dibaca & ditambah admin dari menu Transaksi.
 *
 * Pakai tabel `saved_addresses` yang SAMA dengan yang dipakai checkout website & menu Akun
 * (tidak ada tabel alamat baru). Tabel itu punya RLS khusus pemiliknya, jadi dari sisi ops
 * aksesnya lewat service role dan tetap dijaga `isOpsAdmin` seperti route ops lain.
 */
export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const customerId = String(new URL(req.url).searchParams.get("customer_id") || "").trim();
  if (!customerId) return NextResponse.json({ items: [] });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("saved_addresses")
    .select("id, label, recipient_name, phone, address, province, city, kecamatan, postal_code, is_default, created_at")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
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
