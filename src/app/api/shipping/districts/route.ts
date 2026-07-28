import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";

// In-memory cache: cities/districts rarely change (static Indonesian administrative data)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const cityCache = new Map<string, { data: unknown; ts: number }>();
const districtCache = new Map<string, { data: unknown; ts: number }>();

// GET /api/shipping/districts?provinceId=6
// Returns kota/kabupaten under a province
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provinceId = searchParams.get("provinceId");
  const cityId = searchParams.get("cityId");

  try {
    // If cityId provided, return kecamatan (districts) under that city
    if (cityId) {
      // Check cache first
      const cached = districtCache.get(cityId);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        console.log("[DISTRICTS] Cache hit for cityId:", cityId);
        return NextResponse.json(cached.data);
      }

      const apiKey = await getRajaOngkirApiKey();
      const res = await fetch(
        `https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`,
        { headers: { key: apiKey } }
      );
      const json = await res.json();

      // Cache successful response
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        districtCache.set(cityId, { data: json, ts: Date.now() });
        console.log("[DISTRICTS] Cache updated for cityId:", cityId, json.data.length, "districts");
      }

      return NextResponse.json(json);
    }

    // Otherwise return kota/kabupaten under a province
    if (!provinceId) {
      return NextResponse.json({ error: "provinceId atau cityId wajib" }, { status: 400 });
    }

    // Check cache first
    const cached = cityCache.get(provinceId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log("[CITIES] Cache hit for provinceId:", provinceId);
      return NextResponse.json(cached.data);
    }

    const apiKey = await getRajaOngkirApiKey();
    const res = await fetch(
      `https://rajaongkir.komerce.id/api/v1/destination/city/${provinceId}`,
      { headers: { key: apiKey } }
    );
    const json = await res.json();

    // Cache successful response
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      cityCache.set(provinceId, { data: json, ts: Date.now() });
      console.log("[CITIES] Cache updated for provinceId:", provinceId, json.data.length, "cities");
    }

    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
