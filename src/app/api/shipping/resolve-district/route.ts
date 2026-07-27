import { NextResponse } from "next/server";

// Cache: postalCode → districtId
const cache = new Map<string, number>();

// GET /api/shipping/resolve-district?postalCode=12345
// Finds district ID from postal code by searching all provinces/cities/districts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postalCode = searchParams.get("postalCode")?.replace(/^0+/, "");
  if (!postalCode) {
    return NextResponse.json({ error: "postalCode wajib" }, { status: 400 });
  }

  // Check cache
  if (cache.has(postalCode)) {
    return NextResponse.json({ district_id: cache.get(postalCode) });
  }

  const key = process.env.RAJAONGKIR_API_KEY!;
  const headers = { key };

  try {
    // Get all provinces
    const provRes = await fetch("https://rajaongkir.komerce.id/api/v1/destination/province", { headers });
    const provJson = await provRes.json();
    const provinces = provJson.data || [];

    for (const prov of provinces) {
      // Get cities in this province
      const cityRes = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/city/${prov.id}`, { headers });
      const cityJson = await cityRes.json();
      const cities = cityJson.data || [];

      for (const city of cities) {
        // Get districts in this city
        const distRes = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/district/${city.id}`, { headers });
        const distJson = await distRes.json();
        const districts = distJson.data || [];

        const match = districts.find((d: { zip_code?: string }) =>
          String(d.zip_code || "").replace(/^0+/, "") === postalCode
        );

        if (match) {
          cache.set(postalCode, match.id);
          return NextResponse.json({ district_id: match.id, city_name: city.name, province_name: prov.name });
        }
      }
    }

    return NextResponse.json({ district_id: null, error: "Kode pos tidak ditemukan" });
  } catch {
    return NextResponse.json({ error: "Gagal resolve kode pos" }, { status: 500 });
  }
}
