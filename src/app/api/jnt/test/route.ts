import { NextResponse } from "next/server";
import { trackShipment } from "@/lib/jnt/track";
import { getJntConfig } from "@/lib/jnt/config";

export async function GET() {
  const results: Record<string, unknown> = {};
  const config = getJntConfig();

  results.config = {
    env: config.env,
    hasOrderUsername: !!config.orderUsername,
    hasOrderApiKey: !!config.orderApiKey,
    hasOrderKey: !!config.orderKey,
    hasTariffKey: !!config.tariffKey,
    hasTariffCusName: !!config.tariffCusName,
    hasTrackUsername: !!config.trackUsername,
    hasTrackPassword: !!config.trackPassword,
    hasCompanyId: !!config.companyId,
  };

  // Test 1: Tariff — raw fetch tanpa signature (sandbox mode)
  try {
    const tariffUrl = "https://demo-general.inuat-jntexpress.id/jandt_track/inquiry.action";
    const tariffData = JSON.stringify({
      weight: 1,
      sendSiteCode: "JAKARTA",
      destAreaCode: "KALIDERES",
      cusName: config.tariffCusName,
      productType: "EZ",
    });

    console.log("[J&T Test] Tariff raw request:", tariffData);

    const tariffRes = await fetch(tariffUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: tariffData, sign: "" }).toString(),
    });

    const tariffRaw = await tariffRes.text();
    console.log("[J&T Test] Tariff raw response:", tariffRaw);
    results.tariff_raw = tariffRaw;
  } catch (err: unknown) {
    results.tariff_raw = { error: err instanceof Error ? err.message : String(err) };
  }

  // Test 2: Tariff — dengan signature
  try {
    const { generateSignature } = await import("@/lib/jnt/signature");
    const tariffUrl = "https://demo-general.inuat-jntexpress.id/jandt_track/inquiry.action";
    const tariffData = JSON.stringify({
      weight: 1,
      sendSiteCode: "JAKARTA",
      destAreaCode: "KALIDERES",
      cusName: config.tariffCusName,
      productType: "EZ",
    });
    const sign = generateSignature(tariffData, config.tariffKey);

    console.log("[J&T Test] Tariff signed request:", { data: tariffData, sign });

    const tariffRes = await fetch(tariffUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: tariffData, sign }).toString(),
    });

    const tariffRaw = await tariffRes.text();
    console.log("[J&T Test] Tariff signed response:", tariffRaw);
    results.tariff_signed = tariffRaw;
  } catch (err: unknown) {
    results.tariff_signed = { error: err instanceof Error ? err.message : String(err) };
  }

  // Test 3: Track
  try {
    const track = await trackShipment("JD0000000000");
    results.track = { success: track.success, data: track.data, error: track.error };
  } catch (err: unknown) {
    results.track = { error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(results, { status: 200 });
}
