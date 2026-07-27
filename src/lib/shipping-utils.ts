// Server-side shipping cost calculator — shared by API routes
// Verifies shipping cost by calling RajaOngkir directly, never trusts client value
import { getRajaOngkirApiKey } from "./rajaongkir-key";

export interface ShippingCostResult {
  cost: number;
  courier: string;
  service: string;
  etd: string;
}

export async function calculateShippingCost(params: {
  origin: number;
  destination: number;
  weight: number;
  courier: string; // colon-separated, e.g. "jne:sicepat:jnt"
}): Promise<ShippingCostResult[]> {
  console.log("[SHIPPING-UTILS] calculateShippingCost called:", params);

  const formBody = new URLSearchParams();
  formBody.append("origin", String(params.origin));
  formBody.append("destination", String(params.destination));
  formBody.append("weight", String(params.weight));
  formBody.append("courier", params.courier);

  const rajaUrl = "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost";
  console.log("[SHIPPING-UTILS] Calling RajaOngkir:", rajaUrl);
  console.log("[SHIPPING-UTILS] Form body:", formBody.toString());

  const res = await fetch(rajaUrl, {
    method: "POST",
    headers: {
      key: await getRajaOngkirApiKey(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
    signal: AbortSignal.timeout(15000),
  });

  console.log("[SHIPPING-UTILS] RajaOngkir status:", res.status);

  const json = await res.json();
  console.log("[SHIPPING-UTILS] Raw response keys:", Object.keys(json));
  console.log("[SHIPPING-UTILS] Raw data type:", typeof json.data, Array.isArray(json.data) ? `array[${json.data.length}]` : "");
  if (json.data?.[0]) console.log("[SHIPPING-UTILS] First item keys:", Object.keys(json.data[0]));
  if (json.data?.[0]) console.log("[SHIPPING-UTILS] First item sample:", JSON.stringify(json.data[0]).slice(0, 500));

  const results: ShippingCostResult[] = [];

  if (json.data && Array.isArray(json.data)) {
    for (const item of json.data) {
      const courierName = item.name || item.code || "";
      // Format A: nested — item.costs[].cost[].{value, etd}
      if (item.costs && Array.isArray(item.costs)) {
        for (const svc of item.costs) {
          const costEntry = svc.cost?.[0];
          if (costEntry) {
            results.push({
              cost: costEntry.value || 0,
              courier: courierName,
              service: svc.service || "",
              etd: costEntry.etd || "",
            });
          }
        }
      }
      // Format B: flat — item.{service, cost, etd} directly
      else if (typeof item.cost === "number" || typeof item.value === "number") {
        results.push({
          cost: item.cost || item.value || 0,
          courier: courierName,
          service: item.service || "",
          etd: item.etd || "",
        });
      }
    }
  }

  console.log("[SHIPPING-UTILS] Parsed results:", results.length, "options");
  results.forEach((r) => console.log(`[SHIPPING-UTILS]   ${r.courier} ${r.service}: Rp${r.cost.toLocaleString("id-ID")} (${r.etd})`));

  return results;
}

// Find the best matching cost from RajaOngkir results for a given courier+service string
export function findMatchingCost(
  options: ShippingCostResult[],
  courierMethod: string // e.g. "JNE - REG"
): ShippingCostResult | null {
  console.log("[SHIPPING-UTILS] findMatchingCost:", { courierMethod, optionsCount: options.length });

  // courierMethod format: "CourierName - Service"
  const [courierPart, servicePart] = courierMethod.split(" - ").map((s) => s.trim().toUpperCase());
  if (!courierPart) {
    console.log("[SHIPPING-UTILS] findMatch: courierPart kosong");
    return null;
  }

  console.log("[SHIPPING-UTILS] findMatch: looking for", { courierPart, servicePart });

  // Try exact match first
  const exact = options.find(
    (o) => o.courier.toUpperCase() === courierPart && o.service.toUpperCase() === servicePart
  );
  if (exact) {
    console.log("[SHIPPING-UTILS] findMatch: EXACT match found:", exact);
    return exact;
  }

  // Try partial match on courier name
  const partial = options.find(
    (o) =>
      o.courier.toUpperCase().includes(courierPart) ||
      courierPart.includes(o.courier.toUpperCase())
  );
  if (partial) {
    console.log("[SHIPPING-UTILS] findMatch: PARTIAL match found:", partial);
  } else {
    console.log("[SHIPPING-UTILS] findMatch: NO match found for", courierMethod);
  }
  return partial || null;
}
