import { NextResponse } from "next/server";
import { getRajaOngkirApiKey } from "@/lib/rajaongkir-key";

const BASE = "https://rajaongkir.komerce.id/api/v1/destination/province";

export async function GET() {
  try {
    const apiKey = await getRajaOngkirApiKey();
    const res = await fetch(BASE, {
      headers: { key: apiKey },
    });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    console.error("RajaOngkir provinces error:", e);
    return NextResponse.json({ error: "Gagal mengambil data provinsi", data: [] }, { status: 500 });
  }
}
