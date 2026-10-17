import { getJntConfig, getJntBaseUrl } from "./config";
import { generateSignature } from "./signature";
import { sanitizeJntItemName, wibOrderDate } from "./format";
import type { OrderRequest, OrderResponse } from "./types";

/**
 * Create a J&T order (Order Create API).
 * Returns AWB (waybill) number.
 *
 * Flow: 1) Build data_param JSON in {"detail":[...]} → 2) Sign → 3) POST form-urlencoded
 *
 * @param params - Order details (sender, receiver, package info)
 * @returns AWB number and status
 */
export async function createOrder(params: {
  orderId: string;
  shipperName: string;
  shipperPhone: string;
  shipperAddress: string;
  originCode: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverZip: string;
  destinationCode: string;
  receiverArea: string;
  qty: number;
  weight: number;
  goodsDesc: string;
  itemName: string;
  goodsValue: number;
  /** Layanan yang dipakai (`expresstype` J&T). Kosong → "1" (EZ) seperti perilaku lama. */
  expressType?: string;
  cod?: number;
  insurance?: number;
  serviceType?: number;
}): Promise<{ success: boolean; awbNo: string | null; raw: OrderResponse }> {
  const config = await getJntConfig();
  const url = getJntBaseUrl("order", config.env);

  const now = new Date();
  // Dokumen J&T: `orderdate` = "YYYY-MM-DD hh:mm:ss" waktu UTC+7 (WIB) — lihat `format.ts`.
  const orderDate = wibOrderDate(now);
  /** Dokumen J&T: `item_name` tidak boleh memakai karakter khusus (lihat `format.ts`). */
  const itemNameSafe = sanitizeJntItemName(params.itemName);

  const detail: OrderRequest = {
    username: config.orderUsername,
    api_key: config.orderApiKey,
    orderid: params.orderId.slice(0, 20),
    shipper_name: params.shipperName.slice(0, 30),
    shipper_contact: params.shipperName.slice(0, 30),
    shipper_phone: params.shipperPhone.slice(0, 15),
    shipper_addr: params.shipperAddress.slice(0, 200),
    origin_code: params.originCode.toUpperCase(),
    receiver_name: params.receiverName.slice(0, 30),
    receiver_phone: params.receiverPhone.slice(0, 15),
    receiver_addr: params.receiverAddress.slice(0, 200),
    receiver_zip: params.receiverZip.slice(0, 5) || "00000",
    destination_code: params.destinationCode.toUpperCase(),
    receiver_area: params.receiverArea.toUpperCase(),
    qty: params.qty,
    weight: params.weight,
    goodsdesc: params.goodsDesc.slice(0, 40),
    servicetype: params.serviceType ?? 6,
    insurance: params.insurance ?? 0,
    orderdate: orderDate,
    item_name: itemNameSafe,
    cod: params.cod ?? 0,
    sendstarttime: "",
    sendendtime: "",
    expresstype: params.expressType || "1",
    goodsvalue: params.goodsValue,
  };

  const dataParam = JSON.stringify({ detail: [detail] });
  const dataSign = generateSignature(dataParam, config.orderKey);

  console.log("[J&T Order] Request:", { url, orderid: params.orderId, dataSign: dataSign.slice(0, 8) + "..." });

  const formData = new URLSearchParams();
  formData.append("data_param", dataParam);
  formData.append("data_sign", dataSign);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const raw: OrderResponse = await res.json();

  console.log("[J&T Order] Response:", JSON.stringify(raw, null, 2));

  const awbNo = raw.detail?.[0]?.awb_no ?? null;
  return { success: raw.success && raw.detail?.[0]?.status === "Sukses", awbNo, raw };
}
