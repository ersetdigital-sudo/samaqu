import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildCustomerDirectory } from "@/lib/customer-directory";

// Data pelanggan untuk panel "Pelanggan" di dashboard admin.
//
// Tabel `customers` dibatasi policy RLS "read own", jadi anon client milik admin
// tidak bisa membaca baris pelanggan lain. Semua pembacaan lewat route ini
// (service role) setelah sesi Supabase + keanggotaan tabel `admins` diverifikasi.
//
// Agregasinya ada di `src/lib/customer-directory.ts` (dipakai bareng `/api/ops/customers`).

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

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await buildCustomerDirectory(getSupabaseAdmin());
  return NextResponse.json({ customers });
}
