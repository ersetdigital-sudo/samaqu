import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";
import { supabase } from "@/lib/supabase";

const BASE = "https://rajaongkir.komerce.id/api/v1/destination/province";
const CACHE_KEY = "provinces";
const CACHE_TTL_DAYS = 30;

export async function GET() {
  console.log("[PROVINCES] === REQUEST START ===");

  try {
    // Step 1: Check Supabase cache
    console.log("[PROVINCES] Step 1: Checking Supabase cache...");
    const { data: cached, error: cacheError } = await supabase
      .from("shipping_cache")
      .select("cache_data, cached_at")
      .eq("cache_key", CACHE_KEY)
      .single();

    if (cacheError) {
      console.log("[PROVINCES] Cache query ERROR:", cacheError.message, "(code:", cacheError.code, ")");
      console.log("[PROVINCES] → Table might not exist. Run the SQL migration first.");
    } else if (!cached) {
      console.log("[PROVINCES] Cache EMPTY — no row found for key:", CACHE_KEY);
    } else {
      const ageMs = Date.now() - new Date(cached.cached_at).getTime();
      const ageDays = Math.round(ageMs / 1000 / 60 / 60 / 24);
      console.log("[PROVINCES] Cache FOUND, age:", ageDays, "days, cached_at:", cached.cached_at);
      if (ageDays < CACHE_TTL_DAYS) {
        console.log("[PROVINCES] → Cache HIT — returning cached data");
        const res = NextResponse.json(cached.cache_data);
        res.headers.set("X-Cache", "HIT");
        return res;
      }
      console.log("[PROVINCES] → Cache STALE (>30 days) — refetching from RajaOngkir");
    }

    // Step 2: Fetch from RajaOngkir
    console.log("[PROVINCES] Step 2: Fetching from RajaOngkir...");
    const apiKey = await getRajaOngkirApiKey();
    console.log("[PROVINCES] API key present:", apiKey ? "YES (length:" + apiKey.length + ")" : "NO");
    const res = await fetch(BASE, { headers: { key: apiKey } });
    const json = await res.json();
    console.log("[PROVINCES] RajaOngkir response:", json.data?.length || 0, "provinces, status:", res.status);

    // Step 3: Upsert to Supabase cache
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      console.log("[PROVINCES] Step 3: Saving to Supabase cache...");
      const { error: upsertError } = await supabase.from("shipping_cache").upsert({
        cache_key: CACHE_KEY,
        cache_data: json,
        cached_at: new Date().toISOString(),
      });
      if (upsertError) {
        console.log("[PROVINCES] Upsert ERROR:", upsertError.message, "(code:", upsertError.code, ")");
      } else {
        console.log("[PROVINCES] → Cache SAVED successfully");
      }
    } else {
      console.log("[PROVINCES] → No data to cache (empty response)");
    }

    console.log("[PROVINCES] === REQUEST END ===");
    const res = NextResponse.json(json);
    res.headers.set("X-Cache", "MISS");
    return res;
  } catch (e) {
    console.error("[PROVINCES] FATAL ERROR:", e);
    return NextResponse.json({ error: "Gagal mengambil data provinsi", data: [] }, { status: 500 });
  }
}
