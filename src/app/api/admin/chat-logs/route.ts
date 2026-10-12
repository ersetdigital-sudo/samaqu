import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Log percakapan live chat untuk dashboard admin.
//
// Tabel `chat_logs` tanpa policy RLS (hanya service role), jadi akses lewat route ini:
// hanya admin (session Supabase + terdaftar di `admins`) yang boleh membaca.

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

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10) || 100, 1), 300);

  const { data, error } = await getSupabaseAdmin()
    .from("chat_logs")
    .select("id, session_id, locale, question, answer, tools_used, escalated, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[ADMIN] Gagal membaca chat_logs:", error.message);
    return NextResponse.json({ error: "Gagal membaca log chat" }, { status: 500 });
  }

  return NextResponse.json({ logs: data || [] });
}
