import { NextResponse } from "next/server";

// POST /api/shipping/cost
// Body: { origin: subdistrictId, destination: subdistrictId, weight: grams, courier?: string }
// Uses RajaOngkir V2 Direct Search method: POST /api/v1/calculate/domestic-cost
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, destination, weight, courier } = body;

    console.log("[SHIPPING-COST] Request body:", { origin, destination, weight, courier });

    if (!origin || !destination || !weight) {
      console.log("[SHIPPING-COST] ERROR: param wajib kosong", { origin, destination, weight });
      return NextResponse.json({ error: "origin, destination, weight wajib" }, { status: 400 });
    }

    const couriers =
      courier || "jne:sicepat:jnt:ninja:tiki:wahana:pos:lion:anteraja";

    const formBody = new URLSearchParams();
    formBody.append("origin", String(origin));
    formBody.append("destination", String(destination));
    formBody.append("weight", String(weight));
    formBody.append("courier", couriers);

    const rajaUrl = "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost";
    console.log("[SHIPPING-COST] Calling RajaOngkir:", rajaUrl);
    console.log("[SHIPPING-COST] Form body:", formBody.toString());

    const res = await fetch(rajaUrl, {
      method: "POST",
      headers: {
        key: process.env.RAJAONGKIR_API_KEY!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
      signal: AbortSignal.timeout(15000),
    });

    console.log("[SHIPPING-COST] RajaOngkir response status:", res.status);

    const json = await res.json();

    // Log parsed results summary
    if (json.data && Array.isArray(json.data)) {
      console.log("[SHIPPING-COST] Couriers returned:", json.data.length);
      for (const item of json.data) {
        const services = item.costs?.map((s: { service: string; cost: Array<{ value: number }> }) =>
          `${s.service}: Rp${s.cost?.[0]?.value?.toLocaleString("id-ID") || 0}`
        ) || [];
        console.log(`[SHIPPING-COST]   ${item.name || item.code}: [${services.join(", ")}]`);
      }
    } else {
      console.log("[SHIPPING-COST] No data in response:", JSON.stringify(json).slice(0, 300));
    }

    return NextResponse.json(json);
  } catch (e) {
    console.error("[SHIPPING-COST] ERROR:", e);
    return NextResponse.json({ error: "Gagal menghitung ongkir" }, { status: 500 });
  }
}
