import { getJntConfig, getJntBaseUrl } from "./config";
import type { TrackResponse, TrackErrorResponse } from "./types";

/**
 * Track J&T shipment by AWB number.
 * Uses Basic Auth (different from Order/Tariff which use signature).
 *
 * @param awb - AWB/waybill number
 * @returns Tracking detail + history
 */
export async function trackShipment(awb: string): Promise<{
  success: boolean;
  data: TrackResponse | null;
  error: TrackErrorResponse | null;
}> {
  const config = getJntConfig();
  const url = getJntBaseUrl("track");

  const authHeader = "Basic " + Buffer.from(`${config.trackUsername}:${config.trackPassword}`).toString("base64");

  console.log("[J&T Track] Request:", { url, awb });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      awb,
      eccompanyid: config.companyId,
    }),
  });

  const body = await res.json();

  console.log("[J&T Track] Response:", JSON.stringify(body, null, 2));

  if (body.error_id) {
    return { success: false, data: null, error: body as TrackErrorResponse };
  }

  return { success: true, data: body as TrackResponse, error: null };
}
