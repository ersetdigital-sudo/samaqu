/**
 * Peta kode pos per kecamatan — dipakai fitur "Tempel alamat lengkap, isi otomatis" supaya
 * kolom Kode Pos ikut terisi tanpa admin harus mencari sendiri.
 *
 * Sumber data: dataset terbuka kode pos Indonesia (rfahmi/kode-pos-indonesia, kelurahan →
 * kode pos) yang diagregasi per KOTA + KECAMATAN. Dataset wilayah J&T yang dipakai dropdown
 * alamat (`src/lib/jnt/area-data.json`) TIDAK memuat kode pos, karena itu peta ini terpisah.
 *
 * Aturan pakai (di `deteksiAlamat`):
 *  - kode pos di teks yang ditempel selalu menang;
 *  - kalau teks tidak menyebut kode pos: kecamatan yang berkode pos TUNGGAL langsung diisi,
 *    yang punya beberapa kode pos dikembalikan sebagai saran pilihan (tidak ditebak).
 *
 * Modul ini hanya dipakai di server (API `/api/ops/alamat-tebak`) supaya file datanya tidak
 * ikut ke bundle browser.
 */

import data from "./kodepos-kecamatan.json";

type PetaKodepos = {
  /** "kota|kecamatan" → daftar kode pos (nama sudah dinormalkan). */
  kota_kecamatan: Record<string, string[]>;
  /** "kecamatan" → kode pos, hanya untuk kecamatan yang kode posnya sama di semua kota. */
  kecamatan_unik: Record<string, string[]>;
};

const PETA = data as PetaKodepos;

/** Bentuk pembanding nama wilayah: huruf kecil, awalan administratif dibuang, tanda baca jadi spasi. */
function normal(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(kab|kabupaten|kota|kec|kecamatan|adm|administrasi|prov|provinsi)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kode pos yang mungkin untuk sebuah wilayah. Kota + kecamatan dipakai lebih dulu (paling
 * tepat); kalau tidak ada, jatuh ke kecamatan yang kode posnya sama di seluruh Indonesia.
 * Hasil kosong berarti wilayahnya belum ada di peta (bukan salah tebak).
 */
export function kodePosDariWilayah(city?: string | null, kecamatan?: string | null): string[] {
  const namaKecamatan = normal(kecamatan);
  if (!namaKecamatan) return [];
  const namaKota = normal(city);
  if (namaKota) {
    const tepat = PETA.kota_kecamatan[`${namaKota}|${namaKecamatan}`];
    if (tepat && tepat.length > 0) return tepat;
  }
  return PETA.kecamatan_unik[namaKecamatan] || [];
}
