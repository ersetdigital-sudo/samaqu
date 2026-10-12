import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  clearFonnteConfigCache,
  getFonnteConfig,
  normalizeWhatsappTarget,
  resolveAdminTargets,
  sendFonnteMessage,
} from "@/lib/fonnte";

// Pengaturan notifikasi WhatsApp (Fonnte) untuk dashboard admin.
//
// Tabel `fonnte_settings` sengaja tidak punya policy RLS (tidak bisa dibaca/ditulis anon
// client), jadi semua akses lewat route ini: hanya admin (session Supabase + terdaftar di
// tabel `admins`) yang boleh baca status / menyimpan. Token tidak pernah dikirim balik ke
// browser — hanya status terisi dan sebagian disamarkan.

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

function maskToken(token: string): string {
  return `${token.slice(0, 6)}${"*".repeat(Math.max(0, token.length - 10))}${token.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("fonnte_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const envToken = !!process.env.FONNTE_TOKEN;
  const envAdminNumber = process.env.ADMIN_WHATSAPP_NUMBER || "";

  // Tabelnya belum dibuat — admin harus menjalankan supabase/fonnte-settings.sql dulu.
  if (error) {
    console.warn("[ADMIN] fonnte_settings belum siap:", error.message);
    return NextResponse.json({
      tableReady: false,
      enabled: true,
      hasToken: false,
      tokenPreview: "",
      adminNumber: "",
      envToken,
      envAdminNumber,
    });
  }

  const row = (data || {}) as Record<string, unknown>;
  const token = (row.token as string) || "";

  return NextResponse.json({
    tableReady: true,
    enabled: row.enabled !== false,
    hasToken: !!token,
    tokenPreview: token ? maskToken(token) : "",
    adminNumber: (row.admin_number as string) || "",
    envToken,
    envAdminNumber,
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Aksi "test": kirim satu pesan percobaan memakai konfigurasi aktif (DB + fallback env).
  if (body.action === "test") {
    const config = await getFonnteConfig();
    if (!config.token) {
      return NextResponse.json({ ok: false, error: "Token Fonnte belum diisi" }, { status: 400 });
    }

    const override = typeof body.target === "string" ? normalizeWhatsappTarget(body.target) : "";
    const target = override || (await resolveAdminTargets(config.adminNumber));
    if (!target) {
      return NextResponse.json({ ok: false, error: "Nomor admin belum diisi" }, { status: 400 });
    }

    const ok = await sendFonnteMessage(
      config.token,
      target,
      "\u2705 Tes notifikasi SAMAQU \u2014 konfigurasi Fonnte aktif."
    );
    return NextResponse.json({ ok, target, error: ok ? undefined : "Fonnte menolak permintaan. Cek token & nomor." });
  }

  const payload: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };

  if (typeof body.enabled === "boolean") payload.enabled = body.enabled;

  // Field kosong = jangan ubah nilai lama (token lama tidak pernah dikirim ke browser,
  // jadi form memang tidak bisa menampilkannya kembali).
  if (typeof body.token === "string" && body.token.trim()) payload.token = body.token.trim();
  if (typeof body.adminNumber === "string") payload.admin_number = body.adminNumber.trim() || null;

  const { error } = await getSupabaseAdmin().from("fonnte_settings").upsert(payload);
  if (error) {
    console.error("[ADMIN] Gagal menyimpan pengaturan Fonnte:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  clearFonnteConfigCache();
  return NextResponse.json({ ok: true });
}
