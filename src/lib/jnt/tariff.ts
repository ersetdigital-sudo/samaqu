import { getJntConfig, getJntBaseUrl } from "./config";
import { generateSignature } from "./signature";
import type { TariffRequest, TariffResponse, TariffService } from "./types";
import { JNT_LAYANAN } from "./layanan";

/**
 * Check J&T shipping tariff (Tariff Check API).
 *
 * Flow: 1) Build data JSON → 2) Sign with key → 3) POST form-urlencoded → 4) Parse response
 *
 * @param params - TariffRequest with weight, origin/destination codes, etc.
 * @returns Array of available services with costs
 */
export async function checkTariff(params: {
  weight: number;
  originCode: string;
  destAreaCode: string;
  productType?: string;
}): Promise<{ success: boolean; services: TariffService[]; raw: TariffResponse }> {
  const config = await getJntConfig();
  const url = getJntBaseUrl("tariff", config.env);

  const data: TariffRequest = {
    weight: params.weight,
    sendSiteCode: params.originCode.toUpperCase(),
    destAreaCode: params.destAreaCode.toUpperCase(),
    cusName: config.tariffCusName,
    productType: params.productType || "EZ",
  };

  const dataJson = JSON.stringify(data);
  const sign = generateSignature(dataJson, config.tariffKey);

  console.log("[J&T Tariff] Request:", { url, data, sign: sign.slice(0, 8) + "..." });

  const formData = new URLSearchParams();
  formData.append("data", dataJson);
  formData.append("sign", sign);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const raw: TariffResponse = await res.json();

  console.log("[J&T Tariff] Response:", JSON.stringify(raw, null, 2));

  if (raw.is_success !== "true") {
    return { success: false, services: [], raw };
  }

  let services: TariffService[] = [];
  try {
    services = JSON.parse(raw.content);
  } catch {
    console.error("[J&T Tariff] Failed to parse content:", raw.content);
  }

  return { success: true, services, raw };
}

/**
 * Tarif untuk SEMUA layanan yang kita dukung (katalog `JNT_LAYANAN`: EZ + ECO).
 *
 * Rute yang tidak dilayani layanan tertentu dijawab J&T dengan daftar kosong, jadi layanan itu
 * otomatis TIDAK muncul — contoh nyata: Depok→Sukmajaya hanya EZ, sedangkan Depok→Makassar
 * EZ Rp47.000 vs ECO Rp31.000. Jadi pilihan "layanan hemat" hanya tampil kalau memang ada.
 */
export async function checkTariffSemua(params: {
  weight: number;
  originCode: string;
  destAreaCode: string;
}): Promise<{ serviceCode: string; name: string; cost: number; etd: string }[]> {
  const hasil: { serviceCode: string; name: string; cost: number; etd: string }[] = [];
  for (const layanan of JNT_LAYANAN) {
    const jawaban = await checkTariff({ ...params, productType: layanan.code });
    if (!jawaban.success) continue;
    for (const service of jawaban.services) {
      hasil.push({
        serviceCode: layanan.code,
        name: String(service?.name || layanan.code),
        cost: parseInt(String(service?.cost ?? "0")) || 0,
        // Kalau J&T mengirim ETA, pakai itu; route memakai estimate layanan sebagai fallback.
        etd: String(service?.etd || service?.estimated_delivery || service?.estimate || "").trim(),
      });
    }
  }
  return hasil;
}
