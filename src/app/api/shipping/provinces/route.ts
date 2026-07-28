import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";

const BASE = "https://rajaongkir.komerce.id/api/v1/destination/province";

// In-memory cache: provinces rarely change (static Indonesian administrative data)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
let cache: { data: unknown; ts: number } | null = null;

export async function GET() {
  try {
    // Return cached data if still fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      console.log("[PROVINCES] Cache hit, age:", Math.round((Date.now() - cache.ts) / 1000 / 60 / 60 / 24), "days");
      return NextResponse.json(cache.data);
    }

    const apiKey = await getRajaOngkirApiKey();
    const res = await fetch(BASE, {
      headers: { key: apiKey },
    });
    const json = await res.json();

    // Only cache successful responses
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      cache = { data: json, ts: Date.now() };
      console.log("[PROVINCES] Cache updated,", json.data.length, "provinces");
    }

    return NextResponse.json(json);
  } catch (e) {
    console.error("RajaOngkir provinces error:", e);
    return NextResponse.json({ error: "Gagal mengambil data provinsi", data: [] }, { status: 500 });
  }
}
