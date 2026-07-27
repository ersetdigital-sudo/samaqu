import { NextResponse } from "next/server";

// POST /api/shipping/cost
// Body: { origin: districtId, destination: districtId, weight: grams, courier?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, destination, weight, courier } = body;

    if (!origin || !destination || !weight) {
      return NextResponse.json({ error: "origin, destination, weight wajib" }, { status: 400 });
    }

    const couriers =
      courier || "jne:sicepat:jnt:ninja:tiki:wahana:pos:lion:anteraja";

    const formBody = new URLSearchParams();
    formBody.append("origin", String(origin));
    formBody.append("destination", String(destination));
    formBody.append("weight", String(weight));
    formBody.append("courier", couriers);
    formBody.append("price", "lowest");

    const res = await fetch(
      "https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost",
      {
        method: "POST",
        headers: {
          key: process.env.RAJAONGKIR_API_KEY!,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      }
    );

    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Gagal menghitung ongkir" }, { status: 500 });
  }
}
