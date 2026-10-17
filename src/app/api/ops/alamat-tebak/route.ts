import { NextRequest, NextResponse } from "next/server";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { WILAYAH_PROVINSI, citiesOfProvince, districtsOfCity, provinceOfCity } from "@/lib/kota";
import { kodePosDariWilayah } from "@/lib/kodepos";
import { deteksiAlamat } from "@/lib/alamat-deteksi";

/**
 * "Tempel alamat lengkap, isi otomatis" (drawer Tambah Transaksi, langkah Pelanggan).
 *
 *   POST /api/ops/alamat-tebak  { text }  →  hasil deteksi
 *
 * Pencocokan provinsi/kota/kecamatan memakai daftar wilayah yang SAMA dengan isi dropdown
 * (`src/lib/kota.ts`, dataset area J&T), jadi nilai yang terisi otomatis pasti ada di daftar
 * pilihan admin. Kode pos diambil dari teks yang ditempel; kalau tidak ada, dilengkapi dari
 * peta kode pos per kecamatan (`src/lib/kodepos.ts`). Kedua dataset dibaca di server — browser
 * tidak perlu memuatnya.
 *
 * Hanya membaca: tidak menulis database dan tidak memanggil layanan luar.
 */
export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "");
    if (!text.trim()) return NextResponse.json({ error: "Teks alamat masih kosong" }, { status: 400 });

    return NextResponse.json(
      deteksiAlamat(text, {
        provinces: WILAYAH_PROVINSI,
        citiesOf: citiesOfProvince,
        districtsOf: districtsOfCity,
        provinceOfCity,
        postalOf: kodePosDariWilayah,
      }),
    );
  } catch (error) {
    console.error("[OPS] alamat-tebak:", error);
    return NextResponse.json({ error: "Gagal membaca teks alamat" }, { status: 500 });
  }
}
