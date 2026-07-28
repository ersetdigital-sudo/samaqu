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

  try {
    // If cityId provided, return kecamatan (districts) under that city
    if (cityId) {
      const cacheKey = `districts_${cityId}`;

      // Check Supabase cache
      const { data: cached } = await supabase
        .from("shipping_cache")
        .select("cache_data, cached_at")
        .eq("cache_key", cacheKey)
        .single();

      if (cached) {
        const ageDays = Math.round((Date.now() - new Date(cached.cached_at).getTime()) / 1000 / 60 / 60 / 24);
        if (ageDays < CACHE_TTL_DAYS) {
          console.log("[DISTRICTS] Cache hit for cityId:", cityId, "age:", ageDays, "days");
          return NextResponse.json(cached.cache_data);
        }
      }

      // Fetch fresh from RajaOngkir
      const apiKey = await getRajaOngkirApiKey();
      const res = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`, { headers: { key: apiKey } });
      const json = await res.json();

      // Upsert to Supabase cache
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        await supabase.from("shipping_cache").upsert({
          cache_key: cacheKey,
          cache_data: json,
          cached_at: new Date().toISOString(),
        });
        console.log("[DISTRICTS] Cache updated for cityId:", cityId, json.data.length, "districts");
      }

      return NextResponse.json(json);
    }

    // Otherwise return kota/kabupaten under a province
    if (!provinceId) {
      return NextResponse.json({ error: "provinceId atau cityId wajib" }, { status: 400 });
    }

    const cacheKey = `cities_${provinceId}`;

    // Check Supabase cache
    const { data: cached } = await supabase
      .from("shipping_cache")
      .select("cache_data, cached_at")
      .eq("cache_key", cacheKey)
      .single();

    if (cached) {
      const ageDays = Math.round((Date.now() - new Date(cached.cached_at).getTime()) / 1000 / 60 / 60 / 24);
      if (ageDays < CACHE_TTL_DAYS) {
        console.log("[CITIES] Cache hit for provinceId:", provinceId, "age:", ageDays, "days");
        return NextResponse.json(cached.cache_data);
      }
    }

    // Fetch fresh from RajaOngkir
    const apiKey = await getRajaOngkirApiKey();
    const res = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/city/${provinceId}`, { headers: { key: apiKey } });
    const json = await res.json();

    // Upsert to Supabase cache
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      await supabase.from("shipping_cache").upsert({
        cache_key: cacheKey,
        cache_data: json,
        cached_at: new Date().toISOString(),
      });
      console.log("[CITIES] Cache updated for provinceId:", provinceId, json.data.length, "cities");
    }

    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
