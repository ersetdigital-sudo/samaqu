import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";

/**
 * Upload foto Instagram ke Supabase Storage (bucket publik).
 *
 * Foto sudah di-resize + crop persegi 1:1 di sisi klien (lihat src/lib/image-square.ts);
 * di sini hanya divalidasi ulang (tipe & ukuran) sebelum disimpan pakai service role.
 * Nama bucket bisa dioverride lewat env INSTAGRAM_BUCKET (default "instagram-photos").
 */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = process.env.INSTAGRAM_BUCKET || "instagram-photos";

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format harus JPG, PNG, atau WebP" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Ukuran maksimal 10MB" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const path = `slot/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(file.type)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("[instagram-photos] upload error:", error.message);
    return NextResponse.json({ error: "Gagal mengunggah foto" }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
