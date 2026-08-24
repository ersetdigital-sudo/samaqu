import { NextResponse } from "next/server";
import { trackShipment } from "@/lib/jnt/track";
import { getJntConfig } from "@/lib/jnt/config";
import { generateSignature } from "@/lib/jnt/signature";
import { getOriginCode, getReceiverArea, getSendSiteCode, resolveTariffCodes } from "@/lib/jnt/area-mapping";

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

  // Resolve area codes using area-mapping
  const depokOrigin = getOriginCode("DEPOK");
  const depokSendSite = getSendSiteCode("DEPOK");
  const woylaOrigin = getOriginCode("WOYLA");
  const woylaReceiverArea = getReceiverArea("MEULABOH", "WOYLA");
  const woylaTariff = resolveTariffCodes("MEULABOH", "WOYLA");

  results.areaMapping = {
    depok: { originCode: depokOrigin, sendSiteCode: depokSendSite },
    woyla: { originCode: woylaOrigin, receiverArea: woylaReceiverArea, tariff: woylaTariff },
  };

  console.log("[J&T Test] Area mapping resolved:", JSON.stringify(results.areaMapping, null, 2));

  // Test 1: Tariff — DEPOK → WOYLA
  try {
    const tariffUrl = "https://demo-general.inuat-jntexpress.id/jandt_track/inquiry.action";
    const tariffData = JSON.stringify({
      weight: 1,
      sendSiteCode: depokSendSite || "DEPOK",
      destAreaCode: woylaTariff.destAreaCode || "MEH010",
      cusName: config.tariffCusName,
      productType: "EZ",
    });
    const sign = generateSignature(tariffData, config.tariffKey);

    console.log("[J&T Test] Tariff request:", { sendSiteCode: depokSendSite, destAreaCode: woylaTariff.destAreaCode, data: tariffData });

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

  // Test 3: Order — create test order (JAKARTA → WOYLA)
  try {
    const orderUrl = "https://demo-ecommerce.inuat-jntexpress.id/jts-idn-ecommerce-api/api/order/create";
    const testOrderId = "TEST-" + Date.now();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const orderDetail = {
      username: config.orderUsername,
      api_key: config.orderApiKey,
      orderid: testOrderId,
      shipper_name: "PENGIRIM TEST",
      shipper_contact: "PENGIRIM TEST",
      shipper_phone: "+628123456789",
      shipper_addr: "JL. Pengirim no.88, RT/RW:001/010, Cengkareng, Jakarta Barat",
      origin_code: depokOrigin || "JKT",
      receiver_name: "PENERIMA TEST",
      receiver_phone: "+62812348888",
      receiver_addr: "JL. Penerima no.1, Woyla, Aceh Barat",
      receiver_zip: "23681",
      destination_code: woylaOrigin || "MEH",
      receiver_area: woylaReceiverArea || "MEH010",
      qty: 1,
      weight: 1,
      goodsdesc: "TESTING JNT API",
      servicetype: 6,
      insurance: 0,
      orderdate: orderDate,
      item_name: "TEST ITEM",
      cod: 0,
      sendstarttime: "",
      sendendtime: "",
      expresstype: "1",
      goodsvalue: 10000,
    };

    const dataParam = JSON.stringify({ detail: [orderDetail] });
    const dataSign = generateSignature(dataParam, config.orderKey);

    console.log("[J&T Test] Order request:", {
      orderid: testOrderId,
      orderdate: orderDate,
      origin_code: orderDetail.origin_code,
      destination_code: orderDetail.destination_code,
      receiver_area: orderDetail.receiver_area,
    });
    console.log("[J&T Test] Order data_param:", dataParam);
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
