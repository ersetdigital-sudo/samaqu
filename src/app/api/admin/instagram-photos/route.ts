import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";

/**
 * Kelola Foto Instagram (section Home) — GET daftar slot, PUT simpan semua slot.
 *
 * Digerbangi isOpsAdmin (sesi admin terdaftar di tabel `admins`), jadi satu-satunya
 * jalur tulis adalah API ini (service role) — publik hanya bisa membaca.
 */

type IncomingSlot = {
  posisi?: number;
  image_url?: string | null;
  link?: string | null;
  alt?: string | null;
};

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("instagram_photos")
    .select("posisi, image_url, link, alt, updated_at")
    .order("posisi");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  let body: { slots?: IncomingSlot[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const slots = Array.isArray(body?.slots) ? body.slots : [];
  const rows = slots
    .filter((s) => Number.isInteger(s.posisi) && (s.posisi as number) >= 1)
    .map((s) => ({
      posisi: s.posisi as number,
      image_url: s.image_url || null,
      link: s.link || null,
      alt: s.alt || null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Tidak ada slot valid untuk disimpan" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("instagram_photos")
    .upsert(rows, { onConflict: "posisi" });

  if (error) {
    console.error("[instagram-photos] save error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: rows.length });
}
