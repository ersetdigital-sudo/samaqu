import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";

// POST /api/shipping/cost
// Body: { origin: subdistrictId, destination: subdistrictId, weight: grams, courier?: string }
// Uses RajaOngkir V2 Direct Search method: POST /api/v1/calculate/domestic-cost
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, destination, weight, courier } = body;

    console.log("[SHIPPING-COST] === INCOMING REQUEST ===");
    console.log("[SHIPPING-COST] origin:", origin, typeof origin);
    console.log("[SHIPPING-COST] destination:", destination, typeof destination);
    console.log("[SHIPPING-COST] weight:", weight, typeof weight);
    console.log("[SHIPPING-COST] courier:", courier);

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
    console.log("[SHIPPING-COST] === RAJAONGKIR OUTGOING REQUEST ===");
    console.log("[SHIPPING-COST] URL:", rajaUrl);
    console.log("[SHIPPING-COST] Method: POST");
    console.log("[SHIPPING-COST] Content-Type: application/x-www-form-urlencoded");
    console.log("[SHIPPING-COST] Form body:", formBody.toString());
    console.log("[SHIPPING-COST] Parsed params:");
    for (const [key, val] of formBody.entries()) {
      console.log(`[SHIPPING-COST]   ${key} = ${val}`);
    }

    const res = await fetch(rajaUrl, {
      method: "POST",
      headers: {
        key: await getRajaOngkirApiKey(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
      signal: AbortSignal.timeout(15000),
    });

    console.log("[SHIPPING-COST] === RAJAONGKIR RESPONSE ===");
    console.log("[SHIPPING-COST] Status:", res.status);

    const json = await res.json();

    // Log EVERYTHING from RajaOngkir response
    console.log("[SHIPPING-COST] Response JSON:", JSON.stringify(json, null, 2).slice(0, 2000));

    // Log parsed results summary
    if (json.data && Array.isArray(json.data)) {
      console.log("[SHIPPING-COST] === PARSED RESULTS ===");
      console.log("[SHIPPING-COST] Total couriers:", json.data.length);
      for (const item of json.data) {
        const courierName = item.name || item.code || "unknown";
        // Flat format (V2 direct)
        if (typeof item.cost === "number") {
          console.log(`[SHIPPING-COST]   ${courierName} ${item.service}: Rp${item.cost.toLocaleString("id-ID")} (etd: ${item.etd || "n/a"})`);
        }
        // Nested format
        else if (item.costs && Array.isArray(item.costs)) {
          for (const svc of item.costs) {
            const costEntry = svc.cost?.[0];
            if (costEntry) {
              console.log(`[SHIPPING-COST]   ${courierName} ${svc.service}: Rp${costEntry.value?.toLocaleString("id-ID")} (etd: ${costEntry.etd || "n/a"})`);
            }
          }
        } else {
          console.log(`[SHIPPING-COST]   ${courierName}: UNEXPECTED FORMAT`, JSON.stringify(item).slice(0, 200));
        }
      }
    } else {
      console.log("[SHIPPING-COST] No data array in response:", JSON.stringify(json).slice(0, 500));
    }

    return NextResponse.json(json);
  } catch (e) {
    console.error("[SHIPPING-COST] ERROR:", e);
    return NextResponse.json({ error: "Gagal menghitung ongkir" }, { status: 500 });
  }
}
