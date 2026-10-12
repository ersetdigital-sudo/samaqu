import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Gerbang akses untuk semua route /api/ops/*: hanya admin SAMAQU
 * (session Supabase + terdaftar di tabel `admins`) yang boleh lewat.
 *
 * Hasil verifikasi di-cache di memori function (TTL 5 menit) supaya tiap
 * request tidak perlu 2 round-trip tambahan ke Supabase (auth + tabel admins).
 * Cache di-key pakai token; token Supabase berlaku ~1 jam, jadi aman.
 */
const ADMIN_TTL_MS = 5 * 60 * 1000;
const adminCache = new Map<string, { ok: boolean; email: string; exp: number }>();

function tokenOf(req: NextRequest): string {
  return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
}

export async function isOpsAdmin(req: NextRequest): Promise<boolean> {
  const token = tokenOf(req);
  if (!token) return false;

  const hit = adminCache.get(token);
  if (hit && hit.exp > Date.now()) return hit.ok;

  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) {
      adminCache.set(token, { ok: false, email: "", exp: Date.now() + ADMIN_TTL_MS });
      return false;
    }
    const { data } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    const ok = !!data;
    adminCache.set(token, { ok, email: user.email || "", exp: Date.now() + ADMIN_TTL_MS });
    return ok;
  } catch (e) {
    console.error("[OPS] Verifikasi admin gagal:", e);
    return false;
  }
}

/** Email admin yang sedang login (untuk kolom `actor` di riwayat). */
export async function opsActorEmail(req: NextRequest): Promise<string> {
  const token = tokenOf(req);
  if (!token) return "admin";
  const hit = adminCache.get(token);
  if (hit?.ok && hit.email) return hit.email;
  await isOpsAdmin(req);
  return adminCache.get(token)?.email || "admin";
}

export const unauthorized = () => NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });

/** Status stok mengikuti aturan app Base44: 0 habis, <=5 menipis, sisanya aman. */
export function stockStatus(total: number): "habis" | "menipis" | "aman" {
  if (total <= 0) return "habis";
  if (total <= 5) return "menipis";
  return "aman";
}
