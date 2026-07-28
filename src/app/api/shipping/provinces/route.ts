import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";
import { supabase } from "@/lib/supabase";

const BASE = "https://rajaongkir.komerce.id/api/v1/destination/province";
const CACHE_KEY = "provinces";
const CACHE_TTL_DAYS = 30;

export async function GET() {
  try {
    // Check Supabase cache first
    const { data: cached } = await supabase
      .from("shipping_cache")
      .select("cache_data, cached_at")
      .eq("cache_key", CACHE_KEY)
      .single();

    if (cached) {
      const ageMs = Date.now() - new Date(cached.cached_at).getTime();
      const ageDays = Math.round(ageMs / 1000 / 60 / 60 / 24);
      if (ageDays < CACHE_TTL_DAYS) {
        console.log("[PROVINCES] Cache hit, age:", ageDays, "days");
        return NextResponse.json(cached.cache_data);
      }
      console.log("[PROVINCES] Cache stale, age:", ageDays, "days — refetching");
    }

    // Fetch fresh data from RajaOngkir
    const apiKey = await getRajaOngkirApiKey();
    const res = await fetch(BASE, { headers: { key: apiKey } });
    const json = await res.json();

    // Upsert to Supabase cache
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      await supabase.from("shipping_cache").upsert({
        cache_key: CACHE_KEY,
        cache_data: json,
        cached_at: new Date().toISOString(),
      });
      console.log("[PROVINCES] Cache updated,", json.data.length, "provinces");
    }

    return NextResponse.json(json);
  } catch (e) {
    console.error("RajaOngkir provinces error:", e);
    return NextResponse.json({ error: "Gagal mengambil data provinsi", data: [] }, { status: 500 });
  }
}
