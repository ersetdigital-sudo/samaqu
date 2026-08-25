import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET - list all carousel images
export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("bio_carousel_images")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST - create new image
export async function POST(req: Request) {
  const body = await req.json();
  const { image_url, alt, sort_order } = body;

  if (!image_url) return NextResponse.json({ error: "image_url is required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("bio_carousel_images")
    .insert({ image_url, alt: alt || "", sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE - delete image by id
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("bio_carousel_images").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH - update image (sort_order, alt, enabled)
export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("bio_carousel_images").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
