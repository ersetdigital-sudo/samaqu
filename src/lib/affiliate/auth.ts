import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AffiliateRow } from "./types";

/**
 * Autentikasi portal Affiliate.
 *
 * Memakai Supabase Auth yang sama dengan toko & admin — TIDAK ada sistem akun
 * terpisah, jadi tidak ada kredensial baru yang harus dikelola. Yang membedakan
 * peran affiliate adalah baris di tabel `affiliates` (id = user_id auth).
 *
 * Admin TIDAK otomatis punya akses portal affiliate: hanya baris `affiliates`
 * milik user tersebut yang berlaku.
 */

export interface AffiliateSession {
  userId: string;
  email: string;
  affiliate: AffiliateRow;
}

function readToken(req: NextRequest): string {
  const raw = req.headers.get("authorization") || "";
  return raw.replace(/^Bearer\s+/i, "").trim();
}

/**
 * Ambil sesi affiliate dari header Authorization.
 * Mengembalikan null kalau token invalid atau user tidak punya baris `affiliates`.
 */
export async function affiliateSession(req: NextRequest): Promise<AffiliateSession | null> {
  const token = readToken(req);
  if (!token) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return null;

    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error || !affiliate) return null;

    return {
      userId: userData.user.id,
      email: userData.user.email || String(affiliate.email || ""),
      affiliate: affiliate as AffiliateRow,
    };
  } catch (e) {
    console.error("[affiliate] Gagal verifikasi sesi:", e);
    return null;
  }
}

/** Helper untuk route: balasan 401 kalau sesi affiliate tidak valid. */
export function affiliateUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Helper untuk route: balasan 403 kalau affiliate belum berstatus aktif. */
export function affiliateForbidden(message = "Program affiliate belum aktif untuk akun ini."): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Samarkan nomor rekening (4 digit terakhir saja) untuk dikirim ke browser. */
export function maskAccountNumber(value: string | null | undefined): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return "*".repeat(digits.length);
  return "****" + digits.slice(-4);
}
