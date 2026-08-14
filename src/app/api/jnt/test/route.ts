import { NextResponse } from "next/server";
import { trackShipment } from "@/lib/jnt/track";
import { getJntConfig } from "@/lib/jnt/config";
import { generateSignature } from "@/lib/jnt/signature";

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

  // Test 1: Tariff — dengan signature
  try {
    const tariffUrl = "https://demo-general.inuat-jntexpress.id/jandt_track/inquiry.action";
    const tariffData = JSON.stringify({
      weight: 1,
      sendSiteCode: "JAKARTA",
      destAreaCode: "KALIDERES",
      cusName: config.tariffCusName,
      productType: "EZ",
    });
    const sign = generateSignature(tariffData, config.tariffKey);

    console.log("[J&T Test] Tariff data:", tariffData);
    console.log("[J&T Test] Tariff key:", config.tariffKey);
    console.log("[J&T Test] Tariff sign:", sign);

    const tariffRes = await fetch(tariffUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: tariffData, sign }).toString(),
    });

    const tariffRaw = await tariffRes.text();
    console.log("[J&T Test] Tariff response:", tariffRaw);
    results.tariff = tariffRaw;
  } catch (err: unknown) {
    results.tariff = { error: err instanceof Error ? err.message : String(err) };
  }

  // Test 2: Track
  try {
    const track = await trackShipment("JD0000000000");
    results.track = { success: track.success, data: track.data, error: track.error };
  } catch (err: unknown) {
    results.track = { error: err instanceof Error ? err.message : String(err) };
  }

  // Test 3: Order — create test order
  try {
    const orderUrl = "https://demo-ecommerce.inuat-jntexpress.id/jts-idn-ecommerce-api/api/order/create";
    const testOrderId = "TEST-" + Date.now();
    const orderDetail = {
      username: config.orderUsername,
      api_key: config.orderApiKey,
      orderid: testOrderId,
      shipper_name: "PENGIRIM TEST",
      shipper_contact: "PENGIRIM TEST",
      shipper_phone: "+628123456789",
      shipper_addr: "JL. Pengirim no.88, RT/RW:001/010, Pluit",
      origin_code: "JKT",
      receiver_name: "PENERIMA TEST",
      receiver_phone: "+62812348888",
      receiver_addr: "JL. Penerima no.1, RT/RW:04/07, Sidoarjo",
      receiver_zip: "40123",
      destination_code: "JKT",
      receiver_area: "JKT001",
      qty: 1,
      weight: 1,
      goodsdesc: "TESTING",
      servicetype: 6,
      insurance: 0,
      orderdate: "2026-08-14 10:00:00",
      item_name: "TEST ITEM",
      cod: 0,
      sendstarttime: "",
      sendendtime: "",
      expresstype: "1",
      goodsvalue: 10000,
    };

    const dataParam = JSON.stringify({ detail: [orderDetail] });
    const dataSign = generateSignature(dataParam, config.orderKey);

    console.log("[J&T Test] Order data_param:", dataParam);
    console.log("[J&T Test] Order key:", config.orderKey);
    console.log("[J&T Test] Order data_sign:", dataSign);

    const orderRes = await fetch(orderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data_param: dataParam, data_sign: dataSign }).toString(),
    });

    const orderRaw = await orderRes.text();
    console.log("[J&T Test] Order response:", orderRaw);
    results.order = orderRaw;
  } catch (err: unknown) {
    results.order = { error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(results, { status: 200 });
}
