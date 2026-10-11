import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clearJntConfigCache } from "@/lib/jnt/config";

// Kredensial J&T Express untuk dashboard admin.
//
// Tabel `jnt_settings` sengaja tidak punya policy RLS (tidak bisa dibaca/ditulis anon client),
// jadi semua akses lewat route ini: hanya admin (session Supabase + terdaftar di tabel `admins`)
// yang boleh baca status / menyimpan, dan nilainya hanya dikirim balik sebagai status terisi —
// nilainya sendiri tidak pernah dikirim ke browser.

const TEXT_FIELDS = ["order_username", "tariff_cus_name", "track_username", "company_id"] as const;
const SECRET_FIELDS = ["order_api_key", "order_key", "tariff_key", "track_password"] as const;
const ALL_FIELDS = [...TEXT_FIELDS, ...SECRET_FIELDS] as const;

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

  const { data, error } = await getSupabaseAdmin().from("jnt_settings").select("*").eq("id", 1).maybeSingle();

  // Tabelnya belum dibuat — admin harus menjalankan supabase/jnt-settings.sql dulu.
  if (error) {
    console.warn("[ADMIN] jnt_settings belum siap:", error.message);
    return NextResponse.json({ tableReady: false, env: "", configured: {} });
  }

  const row = (data || {}) as Record<string, string | null>;
  const configured: Record<string, boolean> = {};
  for (const field of ALL_FIELDS) configured[field] = !!row[field];

  return NextResponse.json({
    tableReady: true,
    env: row.env === "production" ? "production" : row.env === "testing" ? "testing" : "",
    configured,
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const payload: Record<string, string> = { id: "1", updated_at: new Date().toISOString() };

  if (body.env === "testing" || body.env === "production") payload.env = body.env;

  // Field kosong = jangan ubah nilai lama (nilai lama tidak pernah dikirim ke browser,
  // jadi form memang tidak bisa menampilkannya kembali).
  for (const field of ALL_FIELDS) {
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (value) payload[field] = value;
  }

  const { error } = await getSupabaseAdmin().from("jnt_settings").upsert(payload);
  if (error) {
    console.error("[ADMIN] Gagal menyimpan kredensial J&T:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  clearJntConfigCache();
  return NextResponse.json({ ok: true });
}
