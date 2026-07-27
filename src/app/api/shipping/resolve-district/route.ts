import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/shipping/resolve-district?postalCode=12345
// Finds district_id from postal code, cached in Supabase
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postalCode = searchParams.get("postalCode")?.replace(/^0+/, "");
  if (!postalCode) {
    return NextResponse.json({ error: "postalCode wajib" }, { status: 400 });
  }

  // 1. Check Supabase cache
  const { data: cached } = await supabase
    .from("postal_district_cache")
    .select("district_id, district_name")
    .eq("postal_code", postalCode)
    .single();

  if (cached?.district_id) {
    return NextResponse.json({ district_id: cached.district_id, district_name: cached.district_name });
  }

  // 2. Not cached — search RajaOngkir
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
          // Cache in Supabase for next time
          await supabase.from("postal_district_cache").upsert({
            postal_code: postalCode,
            district_id: match.id,
            district_name: match.name,
            city_id: city.id,
            city_name: city.name,
            province_id: prov.id,
            province_name: prov.name,
          });

          return NextResponse.json({ district_id: match.id, district_name: match.name });
        }
      }
    }

    return NextResponse.json({ district_id: null, error: "Kode pos tidak ditemukan" });
  } catch {
    return NextResponse.json({ error: "Gagal resolve kode pos" }, { status: 500 });
  }
}
