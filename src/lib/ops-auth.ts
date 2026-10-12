import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Gerbang akses untuk semua route /api/ops/*: hanya admin SAMAQU
 * (session Supabase + terdaftar di tabel `admins`) yang boleh lewat.
 */
export async function isOpsAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return false;
    const { data } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    return !!data;
  } catch (e) {
    console.error("[OPS] Verifikasi admin gagal:", e);
    return false;
  }
}

export const unauthorized = () => NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });

/** Status stok mengikuti aturan app Base44: 0 habis, <=5 menipis, sisanya aman. */
export function stockStatus(total: number): "habis" | "menipis" | "aman" {
  if (total <= 0) return "habis";
  if (total <= 5) return "menipis";
  return "aman";
}
