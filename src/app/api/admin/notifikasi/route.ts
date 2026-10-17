import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { katalogNotifikasi } from "@/lib/fonnte";

/**
 * Daftar SEMUA notifikasi WhatsApp yang dikirim sistem + pratinjau isinya (baca-saja) untuk
 * panel Pengaturan dashboard admin.
 *
 * Tanpa ini, pesan otomatis hanya "kelihatan" di dalam kode: admin tidak punya cara tahu pesan
 * apa saja yang jalan, ke siapa, dan kapan. Termasuk pesan yang dipicu transaksi manual
 * (input admin/ops) — invoice "Belum Lunas" — dan yang belum aktif (ditandai `aktif: false`).
 *
 * Hanya membaca: tidak menulis database dan tidak mengirim pesan apa pun.
 */

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;

  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return false;

    const { data } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    return !!data;
  } catch (error) {
    console.error("[ADMIN] notifikasi auth:", error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: katalogNotifikasi() });
}
