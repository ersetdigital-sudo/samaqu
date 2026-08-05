import { NextResponse } from "next/server";
import { calculateShippingCost } from "@/lib/shipping-utils";

// In-memory cache: key = "origin-destination-weight-courier", value = { data, timestamp }
const costCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// POST /api/shipping/cost
// Body: { origin: subdistrictId, destination: subdistrictId, weight: grams, courier?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, destination, weight, courier } = body;

    if (!origin || !destination || !weight) {
      return NextResponse.json({ error: "origin, destination, weight wajib" }, { status: 400 });
    }

    const couriers = courier || "jne:sicepat:jnt:ninja:tiki:wahana:pos:lion:anteraja";

    // Check cache
    const cacheKey = `${origin}-${destination}-${weight}-${couriers}`;
    const cached = costCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log("[SHIPPING-COST] Cache hit:", cacheKey);
      return NextResponse.json(cached.data);
    }

    console.log("[SHIPPING-COST] Cache miss, fetching from RajaOngkir:", { origin, destination, weight, couriers });

    const results = await calculateShippingCost({ origin, destination, weight, courier: couriers });

    const responseData = { data: results };
    costCache.set(cacheKey, { data: responseData, ts: Date.now() });

    return NextResponse.json(responseData);
  } catch (e) {
    console.error("[SHIPPING-COST] ERROR:", e);
    return NextResponse.json({ error: "Gagal menghitung ongkir" }, { status: 500 });
  }
}
