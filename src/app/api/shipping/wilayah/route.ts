import { NextResponse } from "next/server";
import { WILAYAH_PROVINSI, citiesOfProvince, districtsOfCity } from "@/lib/kota";

/**
 * Daftar wilayah untuk isian alamat pelanggan (Open Order).
 *
 * Sumbernya dataset area J&T yang sudah dipakai integrasi pengiriman
 * (`src/lib/jnt/area-data.json`) — jadi tidak ada panggilan ke layanan luar, tidak ada
 * kuota yang bisa habis, dan nama kota/kecamatan yang tersimpan persis yang dibutuhkan
 * J&T saat menghitung tarif.
 *
 * Bentuk responsnya sengaja sama dengan route shipping lama (`{ data: [{ id, name }] }`)
 * supaya pemanggil yang sudah ada tidak perlu diubah selain URL-nya.
 *
 *   GET /api/shipping/wilayah                → { data: [{ id, name }] }   (provinsi)
 *   GET /api/shipping/wilayah?province=…     → { data: [{ id, name }] }   (kota/kabupaten)
 *   GET /api/shipping/wilayah?city=…         → { data: [{ id, name }] }   (kecamatan)
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const province = String(sp.get("province") || "").trim();
  const city = String(sp.get("city") || "").trim();

  const names = city ? districtsOfCity(city) : province ? citiesOfProvince(province) : WILAYAH_PROVINSI;

  // id = namanya sendiri: nilai ini hanya dipakai sebagai nilai <select> di browser,
  // sedangkan yang dikirim ke server adalah nama kota/kecamatan.
  const data = names.map((name) => ({ id: name, name }));

  const res = NextResponse.json({ data });
  res.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  return res;
}
