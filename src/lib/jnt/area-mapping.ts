// J&T Area Mapping — full dataset (7.128 areas)
// Source: template jnt terbaru.xlsx
// Row format: LOCAL_PROV|LOCAL_KOTA|LOCAL_KEC|JNT_KOTA|CODE3|JNT_KEC|RECEIVER_AREA

import rawRows from "./area-data.json";

export interface JntAreaRow {
  localProv: string;
  localCity: string;
  localDistrict: string;
  jntCity: string; // sendSiteCode (Tariff Check)
  code3: string; // origin_code / destination_code (Order)
  jntDistrict: string; // destAreaCode (Tariff Check)
  receiverArea: string; // receiver_area (Order)
}

export const JNT_AREAS: JntAreaRow[] = (rawRows as string[]).map((line) => {
  const [localProv, localCity, localDistrict, jntCity, code3, jntDistrict, receiverArea] = line.split("|");
  return { localProv, localCity, localDistrict, jntCity, code3, jntDistrict, receiverArea };
});

const norm = (s: string) => s.trim().toUpperCase();

// ─── Indexes (built once at module load) ───
const byLocalDistrict = new Map<string, JntAreaRow>(); // "KEC|KOTA"
const byLocalDistrictOnly = new Map<string, JntAreaRow[]>(); // "KEC"
const byJntDistrict = new Map<string, JntAreaRow>(); // "JNTKEC|JNTKOTA"
const cityToCode3 = new Map<string, string>(); // "LOCAL_KOTA" | "JNT_KOTA" → code3
const cityToSendSite = new Map<string, string>(); // same keys → JNT city name

for (const r of JNT_AREAS) {
  const k1 = `${norm(r.localDistrict)}|${norm(r.localCity)}`;
  if (!byLocalDistrict.has(k1)) byLocalDistrict.set(k1, r);
  const k2 = norm(r.localDistrict);
  if (!byLocalDistrictOnly.has(k2)) byLocalDistrictOnly.set(k2, []);
  byLocalDistrictOnly.get(k2)!.push(r);
  const k3 = `${norm(r.jntDistrict)}|${norm(r.jntCity)}`;
  if (!byJntDistrict.has(k3)) byJntDistrict.set(k3, r);
  const kc = norm(r.localCity);
  const kj = norm(r.jntCity);
  if (!cityToCode3.has(kc)) cityToCode3.set(kc, r.code3);
  if (!cityToCode3.has(kj)) cityToCode3.set(kj, r.code3);
  if (!cityToSendSite.has(kc)) cityToSendSite.set(kc, r.jntCity);
  if (!cityToSendSite.has(kj)) cityToSendSite.set(kj, r.jntCity);
}

function findRow(city: string, district: string): JntAreaRow | null {
  const d = norm(district);
  const c = norm(city);
  return (
    byLocalDistrict.get(`${d}|${c}`) ||
    byJntDistrict.get(`${d}|${c}`) ||
    byLocalDistrictOnly.get(d)?.[0] ||
    null
  );
}

/** Order API: 3-char city code for origin/destination_code */
export function getOriginCode(city: string): string | null {
  return cityToCode3.get(norm(city)) ?? null;
}

export function getDestinationCode(city: string): string | null {
  return getOriginCode(city);
}

/** Order API: district-level area code e.g. "DPK001" */
export function getReceiverArea(city: string, district: string): string | null {
  return findRow(city, district)?.receiverArea ?? null;
}

/** Tariff Check: origin site name e.g. "DEPOK" */
export function getSendSiteCode(city: string): string | null {
  return cityToSendSite.get(norm(city)) ?? null;
}

/**
 * Tariff Check: resolve proper J&T names from local (RajaOngkir) names.
 * Falls back to uppercased inputs when not found (legacy behavior).
 */
export function resolveTariffCodes(
  city: string,
  district: string
): { sendSiteCode: string; destAreaCode: string; found: boolean } {
  const row = findRow(city, district);
  if (row) {
    return { sendSiteCode: row.jntCity.toUpperCase(), destAreaCode: row.jntDistrict.toUpperCase(), found: true };
  }
  return { sendSiteCode: norm(city), destAreaCode: norm(district), found: false };
}
