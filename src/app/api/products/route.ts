import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "100");

    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category && category !== "Semua") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Gagal mengambil data produk" }, { status: 500 });
    }

    return NextResponse.json({ products: data });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
