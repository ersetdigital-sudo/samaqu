import { getJntConfig, getJntBaseUrl } from "./config";
import { generateSignature } from "./signature";

export interface CancelResponse {
  success: boolean;
  desc: string;
  detail: {
    orderid: string;
    status: string;
    reason?: string;
  }[];
}

export async function cancelOrder(params: {
  orderId: string;
  remark?: string;
}): Promise<{ success: boolean; raw: CancelResponse }> {
  const config = getJntConfig();
  const url = getJntBaseUrl("cancel");

  const detail = {
    username: config.orderUsername,
    api_key: config.orderApiKey,
    orderid: params.orderId.slice(0, 20),
    remark: (params.remark || "Cancelled by API").slice(0, 30),
  };

  const dataParam = JSON.stringify({ detail: [detail] });
  const dataSign = generateSignature(dataParam, config.orderKey);

  console.log("[J&T Cancel] Request:", { url, orderid: params.orderId });

  const formData = new URLSearchParams();
  formData.append("data_param", dataParam);
  formData.append("data_sign", dataSign);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const raw: CancelResponse = await res.json();

  console.log("[J&T Cancel] Response:", JSON.stringify(raw, null, 2));

  return { success: raw.success && raw.detail?.[0]?.status === "Sukses", raw };
}
