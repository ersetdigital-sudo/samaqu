import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";

// GET /api/shipping/search-destination?search=nama_kecamatan&city=nama_kota&province=nama_provinsi&limit=5
// Searches RajaOngkir domestic-destination by name, optionally filtered by city/province
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const city = searchParams.get("city")?.trim().toUpperCase() || "";
  const province = searchParams.get("province")?.trim().toUpperCase() || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  console.log("[SEARCH-DEST] Request:", { search, city, province, limit });

  if (!search) {
    console.log("[SEARCH-DEST] ERROR: search param kosong");
    return NextResponse.json({ error: "search wajib" }, { status: 400 });
  }

  try {
    const url = `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(search)}&limit=${limit}&offset=0`;
    console.log("[SEARCH-DEST] Calling RajaOngkir:", url);

    const res = await fetch(url, {
      headers: { key: await getRajaOngkirApiKey() },
      signal: AbortSignal.timeout(10000),
    });

    console.log("[SEARCH-DEST] RajaOngkir response status:", res.status);

    const json = await res.json();
    const results: Array<{ id: number; name: string; city_name?: string; province_name?: string; subdistrict_name?: string }> = json.data || [];

    console.log("[SEARCH-DEST] Results count:", results.length);
    if (results.length > 0) {
      console.log("[SEARCH-DEST] First 3 results:", results.slice(0, 3).map((r) => ({
        id: r.id,
        name: r.subdistrict_name || r.name,
        city: r.city_name,
        province: r.province_name,
      })));
    }

    if (results.length === 0) {
      console.log("[SEARCH-DEST] Tidak ada hasil ditemukan untuk:", search);
      return NextResponse.json({ data: [], match: null });
    }

    // Smart matching: try to find exact match by kecamatan + city + province
    const searchUpper = search.toUpperCase();

    // Priority 1: exact kecamatan name + city + province match
    if (city && province) {
      const exact = results.find((r) => {
        const name = (r.subdistrict_name || r.name || "").toUpperCase();
        const rCity = (r.city_name || "").toUpperCase();
        const rProv = (r.province_name || "").toUpperCase();
        return name === searchUpper && rCity.includes(city) && rProv.includes(province);
      });
      if (exact) {
        console.log("[SEARCH-DEST] Match [P1: exact+city+province]:", { id: exact.id, name: exact.subdistrict_name || exact.name, city: exact.city_name });
        return NextResponse.json({ data: results, match: exact });
      }
    }

    // Priority 2: exact kecamatan name + city match
    if (city) {
      const cityMatch = results.find((r) => {
        const name = (r.subdistrict_name || r.name || "").toUpperCase();
        const rCity = (r.city_name || "").toUpperCase();
        return name === searchUpper && rCity.includes(city);
      });
      if (cityMatch) {
        console.log("[SEARCH-DEST] Match [P2: exact+city]:", { id: cityMatch.id, name: cityMatch.subdistrict_name || cityMatch.name, city: cityMatch.city_name });
        return NextResponse.json({ data: results, match: cityMatch });
      }
    }

    // Priority 3: partial kecamatan name + city match
    if (city) {
      const partialCity = results.find((r) => {
        const name = (r.subdistrict_name || r.name || "").toUpperCase();
        const rCity = (r.city_name || "").toUpperCase();
        return name.includes(searchUpper) && rCity.includes(city);
      });
      if (partialCity) {
        console.log("[SEARCH-DEST] Match [P3: partial+city]:", { id: partialCity.id, name: partialCity.subdistrict_name || partialCity.name, city: partialCity.city_name });
        return NextResponse.json({ data: results, match: partialCity });
      }
    }

    // Priority 4: just exact kecamatan name
    const exactName = results.find((r) => {
      const name = (r.subdistrict_name || r.name || "").toUpperCase();
      return name === searchUpper;
    });
    if (exactName) {
      console.log("[SEARCH-DEST] Match [P4: exact name only]:", { id: exactName.id, name: exactName.subdistrict_name || exactName.name });
      return NextResponse.json({ data: results, match: exactName });
    }

    // Priority 5: first result (best guess)
    console.log("[SEARCH-DEST] Match [P5: fallback first result]:", { id: results[0].id, name: results[0].subdistrict_name || results[0].name, city: results[0].city_name });
    return NextResponse.json({ data: results, match: results[0] });
  } catch (e) {
    console.error("[SEARCH-DEST] ERROR:", e);
    return NextResponse.json({ error: "Gagal mencari tujuan" }, { status: 500 });
  }
}
