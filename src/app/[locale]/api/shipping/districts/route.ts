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

      const { data: cached, error: cacheError } = await supabase
        .from("shipping_cache")
        .select("cache_data, cached_at")
        .eq("cache_key", cacheKey)
        .single();

      if (!cacheError && cached) {
        const ageDays = Math.round((Date.now() - new Date(cached.cached_at).getTime()) / 1000 / 60 / 60 / 24);
        if (ageDays < CACHE_TTL_DAYS) {
          const res = NextResponse.json(cached.cache_data);
          res.headers.set("X-Cache", "HIT");
          return res;
        }
      }

      const apiKey = await getRajaOngkirApiKey();
      const rRes = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`, { headers: { key: apiKey } });
      const json = await rRes.json();

      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        await supabase.from("shipping_cache").upsert({
          cache_key: cacheKey,
          cache_data: json,
          cached_at: new Date().toISOString(),
        });
      }

      const res = NextResponse.json(json);
      res.headers.set("X-Cache", "MISS");
      return res;
    }

    if (!provinceId) {
      return NextResponse.json({ error: "provinceId atau cityId wajib" }, { status: 400 });
    }

    const cacheKey = `cities_${provinceId}`;

    const { data: cached, error: cacheError } = await supabase
      .from("shipping_cache")
      .select("cache_data, cached_at")
      .eq("cache_key", cacheKey)
      .single();

    if (!cacheError && cached) {
      const ageDays = Math.round((Date.now() - new Date(cached.cached_at).getTime()) / 1000 / 60 / 60 / 24);
      if (ageDays < CACHE_TTL_DAYS) {
        const res = NextResponse.json(cached.cache_data);
        res.headers.set("X-Cache", "HIT");
        return res;
      }
    }

    const apiKey = await getRajaOngkirApiKey();
    const rRes = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/city/${provinceId}`, { headers: { key: apiKey } });
    const json = await rRes.json();

    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      await supabase.from("shipping_cache").upsert({
        cache_key: cacheKey,
        cache_data: json,
        cached_at: new Date().toISOString(),
      });
    }

    const res = NextResponse.json(json);
    res.headers.set("X-Cache", "MISS");
    return res;
  } catch (e) {
    console.error("[DISTRICTS] FATAL ERROR:", e);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
