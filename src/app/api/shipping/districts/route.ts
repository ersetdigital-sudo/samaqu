import { NextResponse } from "next/server";

// GET /api/shipping/districts?provinceId=6
// Returns cities/kabupaten under a province (RajaOngkir calls this "city")
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provinceId = searchParams.get("provinceId");
  if (!provinceId) {
    return NextResponse.json({ error: "provinceId wajib" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `https://rajaongkir.komerce.id/api/v1/destination/city/${provinceId}`,
      { headers: { key: process.env.RAJAONGKIR_API_KEY! } }
    );
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data kota" }, { status: 500 });
  }
}
