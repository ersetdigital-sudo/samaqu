import { NextRequest, NextResponse } from "next/server";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { WILAYAH_PROVINSI, citiesOfProvince, districtsOfCity } from "@/lib/kota";

/**
 * Daftar wilayah untuk isian alamat di menu Transaksi.
 *
 * Sumbernya dataset area J&T yang sudah dipakai integrasi pengiriman
 * (`src/lib/jnt/area-data.json`) — jadi tidak butuh panggilan ke layanan luar dan
 * nama kota/kecamatan yang dipilih admin seragam.
 *
 *   GET /api/ops/wilayah                  → { provinces }
 *   GET /api/ops/wilayah?province=…       → { cities }
 *   GET /api/ops/wilayah?city=…           → { districts }
 */
export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const sp = new URL(req.url).searchParams;
  const province = String(sp.get("province") || "").trim();
  const city = String(sp.get("city") || "").trim();

  if (city) return NextResponse.json({ districts: districtsOfCity(city) });
  if (province) return NextResponse.json({ cities: citiesOfProvince(province) });
  return NextResponse.json({ provinces: WILAYAH_PROVINSI });
}
