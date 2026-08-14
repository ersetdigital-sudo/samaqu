// J&T Area Mapping for Kota Depok
// Source: J&T Mapping Process (developer.jet.co.id)

export interface JntAreaMapping {
  province: string;
  city: string;
  sendSiteCode: string; // for Tariff Check
  originCode: string; // for Order (3 chars)
  destinationCode: string; // for Order (3 chars)
  districts: {
    districtName: string; // for Tariff Check (destAreaCode)
    receiverArea: string; // for Order (e.g. DPK001)
  }[];
}

export const JNT_AREAS: JntAreaMapping[] = [
  {
    province: "JAWA BARAT",
    city: "DEPOK",
    sendSiteCode: "DEPOK",
    originCode: "DPK",
    destinationCode: "DPK",
    districts: [
      { districtName: "PANCORAN MAS", receiverArea: "DPK001" },
    ],
  },
];

export function getOriginCode(city: string): string | null {
  const upper = city.toUpperCase();
  const area = JNT_AREAS.find((a) => a.city === upper);
  return area?.originCode ?? null;
}

export function getDestinationCode(city: string): string | null {
  const upper = city.toUpperCase();
  const area = JNT_AREAS.find((a) => a.city === upper);
  return area?.destinationCode ?? null;
}

export function getReceiverArea(city: string, district: string): string | null {
  const upperCity = city.toUpperCase();
  const upperDistrict = district.toUpperCase();
  const area = JNT_AREAS.find((a) => a.city === upperCity);
  return area?.districts.find((d) => d.districtName === upperDistrict)?.receiverArea ?? null;
}

export function getSendSiteCode(city: string): string | null {
  const upper = city.toUpperCase();
  const area = JNT_AREAS.find((a) => a.city === upper);
  return area?.sendSiteCode ?? null;
}
