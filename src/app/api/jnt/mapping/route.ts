import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/jnt/mapping
 * Extract all cached location data (cities + districts) from shipping_cache
 * and format it for J&T mapping process.
 *
 * J&T needs:
 * - City names → J&T city codes (origin_code, destination_code)
 * - District names → J&T area codes (receiver_area)
 */
export async function GET() {
  try {
    // Get all cached city data
    const { data: cityCaches, error: cityError } = await supabase
      .from("shipping_cache")
      .select("cache_key, cache_data")
      .like("cache_key", "cities_%");

    if (cityError) {
      console.error("[MAPPING] Error fetching city caches:", cityError);
      return NextResponse.json({ error: "Failed to fetch city data" }, { status: 500 });
    }

    // Get all cached district data
    const { data: districtCaches, error: districtError } = await supabase
      .from("shipping_cache")
      .select("cache_key, cache_data")
      .like("cache_key", "districts_%");

    if (districtError) {
      console.error("[MAPPING] Error fetching district caches:", districtError);
      return NextResponse.json({ error: "Failed to fetch district data" }, { status: 500 });
    }

    // Extract unique cities
    const cities = new Map<string, { id: number; name: string; province: string }>();
    for (const cache of cityCaches || []) {
      const data = cache.cache_data;
      if (data?.data && Array.isArray(data.data)) {
        for (const city of data.data) {
          if (city.city_name && city.city_id) {
            cities.set(String(city.city_id), {
              id: city.city_id,
              name: city.city_name,
              province: city.province_name || "",
            });
          }
        }
      }
    }

    // Extract unique districts
    const districts = new Map<string, { id: number; name: string; cityId: string; cityName: string }>();
    for (const cache of districtCaches || []) {
      const data = cache.cache_data;
      if (data?.data && Array.isArray(data.data)) {
        for (const district of data.data) {
          if (district.subdistrict_name && district.subdistrict_id) {
            districts.set(String(district.subdistrict_id), {
              id: district.subdistrict_id,
              name: district.subdistrict_name,
              cityId: String(district.city_id || ""),
              cityName: district.city_name || "",
            });
          }
        }
      }
    }

    // Format for J&T mapping
    const cityList = Array.from(cities.values()).map((c) => ({
      city_id: c.id,
      city_name: c.name.toUpperCase(),
      province: c.province.toUpperCase(),
    }));

    const districtList = Array.from(districts.values()).map((d) => ({
      district_id: d.id,
      district_name: d.name.toUpperCase(),
      city_id: d.cityId,
      city_name: d.cityName.toUpperCase(),
    }));

    console.log(`[MAPPING] Found ${cityList.length} cities, ${districtList.length} districts`);

    return NextResponse.json({
      summary: {
        totalCities: cityList.length,
        totalDistricts: districtList.length,
      },
      cities: cityList,
      districts: districtList,
    });
  } catch (e) {
    console.error("[MAPPING] FATAL ERROR:", e);
    return NextResponse.json({ error: "Gagal mengambil data mapping" }, { status: 500 });
  }
}
