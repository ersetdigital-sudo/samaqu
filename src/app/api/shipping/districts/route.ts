import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";
import { supabase } from "@/lib/supabase";

const CACHE_TTL_DAYS = 30;

// GET /api/shipping/districts?provinceId=6
// Returns kota/kabupaten under a province
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provinceId = searchParams.get("provinceId");
  const cityId = searchParams.get("cityId");

  console.log("[DISTRICTS] === REQUEST START === params:", { provinceId, cityId });

  try {
    // If cityId provided, return kecamatan (districts) under that city
    if (cityId) {
      const cacheKey = `districts_${cityId}`;
      console.log("[DISTRICTS] Checking cache for:", cacheKey);

      const { data: cached, error: cacheError } = await supabase
        .from("shipping_cache")
        .select("cache_data, cached_at")
        .eq("cache_key", cacheKey)
        .single();

      if (cacheError) {
        console.log("[DISTRICTS] Cache query ERROR:", cacheError.message, "(code:", cacheError.code, ")");
      } else if (cached) {
        const ageDays = Math.round((Date.now() - new Date(cached.cached_at).getTime()) / 1000 / 60 / 60 / 24);
        console.log("[DISTRICTS] Cache FOUND, age:", ageDays, "days");
        if (ageDays < CACHE_TTL_DAYS) {
          console.log("[DISTRICTS] → Cache HIT — returning cached data");
          return NextResponse.json(cached.cache_data);
        }
        console.log("[DISTRICTS] → Cache STALE — refetching");
      } else {
        console.log("[DISTRICTS] Cache EMPTY for:", cacheKey);
      }

      // Fetch fresh from RajaOngkir
      console.log("[DISTRICTS] Fetching from RajaOngkir for cityId:", cityId);
      const apiKey = await getRajaOngkirApiKey();
      const res = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`, { headers: { key: apiKey } });
      const json = await res.json();
      console.log("[DISTRICTS] RajaOngkir response:", json.data?.length || 0, "districts");

      // Upsert to Supabase cache
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        const { error: upsertError } = await supabase.from("shipping_cache").upsert({
          cache_key: cacheKey,
          cache_data: json,
          cached_at: new Date().toISOString(),
        });
        if (upsertError) {
          console.log("[DISTRICTS] Upsert ERROR:", upsertError.message);
        } else {
          console.log("[DISTRICTS] → Cache SAVED");
        }
      }

      console.log("[DISTRICTS] === REQUEST END ===");
      return NextResponse.json(json);
    }

    // Otherwise return kota/kabupaten under a province
    if (!provinceId) {
      return NextResponse.json({ error: "provinceId atau cityId wajib" }, { status: 400 });
    }

    const cacheKey = `cities_${provinceId}`;
    console.log("[CITIES] Checking cache for:", cacheKey);

    const { data: cached, error: cacheError } = await supabase
      .from("shipping_cache")
      .select("cache_data, cached_at")
      .eq("cache_key", cacheKey)
      .single();

    if (cacheError) {
      console.log("[CITIES] Cache query ERROR:", cacheError.message, "(code:", cacheError.code, ")");
    } else if (cached) {
      const ageDays = Math.round((Date.now() - new Date(cached.cached_at).getTime()) / 1000 / 60 / 60 / 24);
      console.log("[CITIES] Cache FOUND, age:", ageDays, "days");
      if (ageDays < CACHE_TTL_DAYS) {
        console.log("[CITIES] → Cache HIT — returning cached data");
        return NextResponse.json(cached.cache_data);
      }
      console.log("[CITIES] → Cache STALE — refetching");
    } else {
      console.log("[CITIES] Cache EMPTY for:", cacheKey);
    }

    // Fetch fresh from RajaOngkir
    console.log("[CITIES] Fetching from RajaOngkir for provinceId:", provinceId);
    const apiKey = await getRajaOngkirApiKey();
    const res = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/city/${provinceId}`, { headers: { key: apiKey } });
    const json = await res.json();
    console.log("[CITIES] RajaOngkir response:", json.data?.length || 0, "cities");

    // Upsert to Supabase cache
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const { error: upsertError } = await supabase.from("shipping_cache").upsert({
        cache_key: cacheKey,
        cache_data: json,
        cached_at: new Date().toISOString(),
      });
      if (upsertError) {
        console.log("[CITIES] Upsert ERROR:", upsertError.message);
      } else {
        console.log("[CITIES] → Cache SAVED");
      }
    }

    console.log("[CITIES] === REQUEST END ===");
    return NextResponse.json(json);
  } catch (e) {
    console.error("[DISTRICTS] FATAL ERROR:", e);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
