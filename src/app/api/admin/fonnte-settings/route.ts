import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  clearFonnteConfigCache,
  getFonnteConfigs,
  normalizeWhatsappTarget,
  resolveAdminTargets,
  sendFonnteMessage,
} from "@/lib/fonnte";

// Pengaturan notifikasi WhatsApp (Fonnte) untuk dashboard admin — DUA bagian terpisah:
// "customer" (semua pesan ke pembeli) dan "admin" (pesan internal).
//
// Tabel `fonnte_settings` sengaja tidak punya policy RLS (tidak bisa dibaca/ditulis anon
// client), jadi semua akses lewat route ini: hanya admin (session Supabase + terdaftar di
// tabel `admins`) yang boleh baca status / menyimpan. Token TIDAK PERNAH dikirim balik ke
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
  const value = String(token || "");
  if (value.length <= 10) return value ? `${value.slice(0, 3)}****` : "";
  return `${value.slice(0, 6)}${"*".repeat(Math.max(0, value.length - 10))}${value.slice(-4)}`;
}

interface ChannelInfo {
  hasToken: boolean;
  tokenPreview: string;
  usingLegacyToken: boolean;
  fromEnv: boolean;
}

function channelInfo(ownToken: string, legacyToken: string, envToken: boolean): ChannelInfo {
  const effective = ownToken || legacyToken;
  return {
    hasToken: !!(effective || envToken),
    tokenPreview: effective ? maskToken(effective) : "",
    usingLegacyToken: !ownToken && !!legacyToken,
    fromEnv: !effective && envToken,
  };
}

function emptyChannel(): ChannelInfo {
  return { hasToken: false, tokenPreview: "", usingLegacyToken: false, fromEnv: false };
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
      envToken,
      envAdminNumber,
      customer: { ...emptyChannel(), number: "" },
      admin: { ...emptyChannel(), number: "" },
    });
  }

  const row = (data || {}) as Record<string, unknown>;
  const legacyToken = (row.token as string) || "";
  const customerToken = (row.customer_token as string) || "";
  const adminToken = (row.admin_token as string) || "";

  return NextResponse.json({
    tableReady: true,
    enabled: row.enabled !== false,
    envToken,
    envAdminNumber,
    customer: {
      ...channelInfo(customerToken, legacyToken, envToken),
      number: (row.customer_number as string) || "",
    },
    admin: {
      ...channelInfo(adminToken, legacyToken, envToken),
      number: (row.admin_number as string) || "",
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const section: "customer" | "admin" | null =
    body.section === "customer" ? "customer" : body.section === "admin" ? "admin" : null;
  if (!section) {
    return NextResponse.json({ error: "Bagian konfigurasi tidak dikenal" }, { status: 400 });
  }

  // Aksi "test": kirim satu pesan percobaan memakai token JALUR tersebut (DB + fallback env).
  if (body.action === "test") {
    const configs = await getFonnteConfigs();
    const channel = section === "customer" ? configs.customer : configs.admin;
    if (!channel.token) {
      return NextResponse.json({ error: "Token Fonnte belum diisi" }, { status: 400 });
    }

    const override = typeof body.target === "string" ? normalizeWhatsappTarget(body.target) : "";
    // Untuk jalur customer, target uji jatuh ke nomor tujuan admin supaya bisa langsung dicek.
    const target = override || (await resolveAdminTargets(configs.admin.adminNumber));
    if (!target) {
      return NextResponse.json({ error: "Nomor tujuan belum diisi" }, { status: 400 });
    }

    const message =
      section === "customer"
        ? "Tes notifikasi SAMAQU (jalur Customer). Konfigurasi token customer aktif."
        : "Tes notifikasi SAMAQU (jalur Admin). Konfigurasi token admin aktif.";

    const ok = await sendFonnteMessage(channel.token, target, message);
    return NextResponse.json({
      ok,
      section,
      target,
      error: ok ? undefined : "Fonnte menolak permintaan. Cek token & nomor.",
    });
  }

  const payload: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };

  if (typeof body.enabled === "boolean") payload.enabled = body.enabled;

  // Field token kosong = jangan ubah nilai lama (token tersimpan tidak pernah dikirim ke
  // browser, jadi form memang tidak bisa menampilkannya kembali).
  if (typeof body.token === "string" && body.token.trim()) {
    if (section === "customer") payload.customer_token = body.token.trim();
    else payload.admin_token = body.token.trim();
  }

  // Nomor untuk jalur admin = nomor TUJUAN; untuk jalur customer = nomor pengirim (catatan).
  if (typeof body.number === "string") {
    if (section === "customer") payload.customer_number = body.number.trim() || null;
    else payload.admin_number = body.number.trim() || null;
  }

  const { error } = await getSupabaseAdmin().from("fonnte_settings").upsert(payload);
  if (error) {
    console.error("[ADMIN] Gagal menyimpan pengaturan Fonnte:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  clearFonnteConfigCache();
  return NextResponse.json({ ok: true, section });
}
