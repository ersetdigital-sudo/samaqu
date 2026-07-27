import { NextResponse } from "next/server";

interface ResolveResult {
  district_id: number;
  district_name: string;
  city_id: number;
  city_name: string;
  province_id: number;
  province_name: string;
}

// Cache: postalCode → full result
const cache = new Map<string, ResolveResult>();

// GET /api/shipping/resolve-district?postalCode=12345
// Finds district/city/province IDs from postal code
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postalCode = searchParams.get("postalCode")?.replace(/^0+/, "");
  if (!postalCode) {
    return NextResponse.json({ error: "postalCode wajib" }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(postalCode);
  if (cached) {
    return NextResponse.json(cached);
  }

  const key = process.env.RAJAONGKIR_API_KEY!;
  const headers = { key };

  try {
    const provRes = await fetch("https://rajaongkir.komerce.id/api/v1/destination/province", { headers });
    const provJson = await provRes.json();
    const provinces = provJson.data || [];

    for (const prov of provinces) {
      const cityRes = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/city/${prov.id}`, { headers });
      const cityJson = await cityRes.json();
      const cities = cityJson.data || [];

      for (const city of cities) {
        const distRes = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/district/${city.id}`, { headers });
        const distJson = await distRes.json();
        const districts = distJson.data || [];

        const match = districts.find((d: { zip_code?: string }) =>
          String(d.zip_code || "").replace(/^0+/, "") === postalCode
        );

        if (match) {
          const result: ResolveResult = {
            district_id: match.id,
            district_name: match.name,
            city_id: city.id,
            city_name: city.name,
            province_id: prov.id,
            province_name: prov.name,
          };
          cache.set(postalCode, result);
          return NextResponse.json(result);
        }
      }
    }

    return NextResponse.json({ district_id: null, error: "Kode pos tidak ditemukan" });
  } catch {
    return NextResponse.json({ error: "Gagal resolve kode pos" }, { status: 500 });
  }
}
