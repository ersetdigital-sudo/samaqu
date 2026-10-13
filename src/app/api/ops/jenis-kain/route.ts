import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";

/**
 * Daftar jenis kain untuk dropdown di /ops (form produk).
 * Sumber sama dengan website & panel admin: tabel `jenis_kain`.
 */
export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("jenis_kain")
    .select("id, name, material")
    .order("display_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] });
}
