import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";

// GET /api/shipping/districts?provinceId=6
// Returns kota/kabupaten under a province
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provinceId = searchParams.get("provinceId");
  const cityId = searchParams.get("cityId");

  try {
    const apiKey = await getRajaOngkirApiKey();

    // If cityId provided, return kecamatan (districts) under that city
    if (cityId) {
      const res = await fetch(
        `https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`,
        { headers: { key: apiKey } }
      );
      const json = await res.json();
      return NextResponse.json(json);
    }

    // Otherwise return kota/kabupaten under a province
    if (!provinceId) {
      return NextResponse.json({ error: "provinceId atau cityId wajib" }, { status: 400 });
    }

    const res = await fetch(
      `https://rajaongkir.komerce.id/api/v1/destination/city/${provinceId}`,
      { headers: { key: apiKey } }
    );
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
