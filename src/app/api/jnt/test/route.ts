import { NextResponse } from "next/server";
import { checkTariff } from "@/lib/jnt";
import { trackShipment } from "@/lib/jnt/track";
import { getJntConfig } from "@/lib/jnt/config";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check config (tanpa expose keys)
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

  // 2. Test Tariff Check (JKT → JKT, 1kg)
  try {
    const tariff = await checkTariff({
      weight: 1,
      originCode: "JKT",
      destAreaCode: "JKT",
    });
    results.tariff = {
      success: tariff.success,
      services: tariff.services,
      raw: tariff.raw,
    };
  } catch (err: unknown) {
    results.tariff = { error: err instanceof Error ? err.message : String(err) };
  }

  // 3. Test Track (dummy AWB — expect error, tapi biar tau response format)
  try {
    const track = await trackShipment("JD0000000000");
    results.track = {
      success: track.success,
      data: track.data,
      error: track.error,
    };
  } catch (err: unknown) {
    results.track = { error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(results, { status: 200 });
}
