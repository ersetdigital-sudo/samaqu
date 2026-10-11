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
  const config = await getJntConfig();
  const url = getJntBaseUrl("track", config.env);

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

  // Jangan log isi lengkapnya: respons berisi nama & alamat penerima.
  console.log("[J&T Track] Response:", {
    status: res.status,
    ...(body.error_message ? { error: body.error_message } : {}),
    history: Array.isArray(body.history) ? body.history.length : 0,
  });

  if (body.error_id) {
    return { success: false, data: null, error: body as TrackErrorResponse };
  }

  return { success: true, data: body as TrackResponse, error: null };
}
