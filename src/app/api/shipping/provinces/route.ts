import { NextResponse } from "next/server";

const BASE = "https://rajaongkir.komerce.id/api/v1/destination/province";

export async function GET() {
  try {
    const res = await fetch(BASE, {
      headers: { key: process.env.RAJAONGKIR_API_KEY! },
      next: { revalidate: 86400 }, // cache 24h — province list rarely changes
    });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: "Gagal mengambil data provinsi" }, { status: 500 });
  }
}
