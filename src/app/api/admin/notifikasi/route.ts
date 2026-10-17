import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { katalogNotifikasi } from "@/lib/fonnte";
import { ambilOverride, hapusOverride, simpanOverride } from "@/lib/notifikasi-template";

/**
 * Notifikasi WhatsApp untuk panel Pengaturan dashboard admin.
 *
 *   GET    /api/admin/notifikasi            → katalog + teks yang sedang dipakai (override)
 *   PUT    /api/admin/notifikasi  {key, body}
 *          - body terisi  → simpan sebagai teks pengganti untuk notifikasi itu
 *          - body kosong  → hapus override (kembali ke teks bawaan)
 *   DELETE /api/admin/notifikasi?key=…      → sama dengan PUT body kosong
 *
 * Template disimpan di tabel `notifikasi_template` (RLS aktif tanpa policy → hanya server yang
 * bisa baca/tulis). Kalau belum ada override, pengirim memakai teks bawaan di kode, jadi pesan
 * yang terkirim tidak berubah sampai admin benar-benar mengubahnya.
 *
 * Dijaga admin: bearer token Supabase + terdaftar di tabel `admins` (pola sama dengan route
 * pengaturan Fonnte).
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

  const items = katalogNotifikasi();
  const override = await ambilOverride();
  return NextResponse.json({
    items: items.map((item) => ({ ...item, override: override[item.key] || "" })),
    jumlahDiubah: Object.keys(override).length,
  });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key = String(body?.key || "").trim();
  const isi = String(body?.body ?? "").trim();

  if (!key || !katalogNotifikasi().some((item) => item.key === key)) {
    return NextResponse.json({ error: "Notifikasi tidak dikenal" }, { status: 400 });
  }

  try {
    if (!isi) {
      await hapusOverride(key);
      return NextResponse.json({ ok: true, kembaliKeBawaan: true });
    }
    await simpanOverride(key, isi);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ADMIN] simpan template notifikasi:", error);
    return NextResponse.json(
      { error: `Gagal menyimpan template: ${error instanceof Error ? error.message : "tidak diketahui"}` },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = String(req.nextUrl.searchParams.get("key") || "").trim();
  if (!key) return NextResponse.json({ error: "key wajib diisi" }, { status: 400 });

  try {
    await hapusOverride(key);
    return NextResponse.json({ ok: true, kembaliKeBawaan: true });
  } catch (error) {
    console.error("[ADMIN] hapus template notifikasi:", error);
    return NextResponse.json({ error: "Gagal mengembalikan ke bawaan" }, { status: 500 });
  }
}
