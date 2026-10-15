/**
 * Regression test dua format khusus J&T Order Create (tanpa mengirim order sama sekali).
 *
 *   node src/lib/jnt/format.test.mjs
 *
 * Yang diuji (lihat ./format.ts):
 *   1. `wibOrderDate()` — orderdate "YYYY-MM-DD hh:mm:ss" WIB (UTC+7), TIDAK bergantung zona
 *      waktu server. Buktikan dengan menjalankannya di dua zona waktu berbeda:
 *        set TZ=UTC          && node src/lib/jnt/format.test.mjs
 *        set TZ=Asia/Jakarta && node src/lib/jnt/format.test.mjs
 *      Hasilnya harus sama.
 *   2. `sanitizeJntItemName()` — item_name tanpa karakter khusus (dokumen J&T), tetap terbaca,
 *      tidak kosong, dan panjangnya dibatasi 50 karakter.
 *
 * Catatan: diletakkan di sebelah modulnya (bukan di folder `scripts/`) supaya ikut masuk repo —
 * `scripts/` sengaja di-gitignore karena boleh memuat kredensial, dan file ini tidak butuh itu.
 */

import { sanitizeJntItemName, wibOrderDate } from "./format.ts";

let gagal = 0;
let lulus = 0;

const tz = process.env.TZ || "(zona waktu server)";

function cek(nama, hasil, harapan) {
  if (hasil === harapan) {
    lulus += 1;
    console.log(` OK    | ${nama}`);
    return;
  }
  gagal += 1;
  console.log(` GAGAL | ${nama}\n         harapan: "${harapan}"\n         hasil  : "${hasil}"`);
}

function cekBenar(nama, kondisi, catatan = "") {
  if (kondisi) {
    lulus += 1;
    console.log(` OK    | ${nama}${catatan ? ` (${catatan})` : ""}`);
    return;
  }
  gagal += 1;
  console.log(` GAGAL | ${nama}${catatan ? ` (${catatan})` : ""}`);
}

console.log(`\n=== orderdate (WIB / UTC+7) — proses berjalan di TZ: ${tz} ===`);
cek("15 Okt 2026 20:00:00 UTC → lewat tengah malam WIB", wibOrderDate(new Date("2026-10-15T20:00:00Z")), "2026-10-16 03:00:00");
cek("1 Jan 2026 00:00:00 UTC", wibOrderDate(new Date("2026-01-01T00:00:00Z")), "2026-01-01 07:00:00");
cek("31 Des 2026 17:30:45 UTC → ganti tahun WIB", wibOrderDate(new Date("2026-12-31T17:30:45Z")), "2027-01-01 00:30:45");
cek("milidetik diabaikan", wibOrderDate(new Date("2026-03-05T10:00:00.900Z")), "2026-03-05 17:00:00");
cek("29 Feb 2028 (kabisat)", wibOrderDate(new Date("2028-02-29T23:59:59Z")), "2028-03-01 06:59:59");
cekBenar("format YYYY-MM-DD hh:mm:ss", /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(wibOrderDate()), wibOrderDate());

console.log("\n=== item_name: karakter khusus dibuang, nama tetap terbaca ===");
cek("em dash dari nama produk", sanitizeJntItemName("Thobe Superblack — Jiharkah"), "Thobe Superblack Jiharkah");
cek("koma antar produk", sanitizeJntItemName("Thobe Navy, Thobe Superblack"), "Thobe Navy Thobe Superblack");
cek("spasi ganda & pinggir", sanitizeJntItemName("   Thobe    Navy   "), "Thobe Navy");
cek("nama tanpa karakter khusus (tidak berubah)", sanitizeJntItemName("Kandora Superblack"), "Kandora Superblack");
cek("garis miring, kutip, tanda seru, kurung", sanitizeJntItemName('Thobe/B01 "Spesial" (Edisi)!'), "Thobe B01 Spesial Edisi");
cek("titik & strip dipertahankan", sanitizeJntItemName("Thobe B-01 V2.1"), "Thobe B-01 V2.1");
cek("huruf non-latin tetap", sanitizeJntItemName("Thobe Nāyf"), "Thobe Nāyf");
cek("hanya tanda baca → tidak boleh kosong", sanitizeJntItemName("— , ! ?"), "Produk SAMAQU");
cek("undefined → tidak kosong", sanitizeJntItemName(undefined), "Produk SAMAQU");

const panjang = sanitizeJntItemName(
  "Thobe Superblack Jiharkah dan Thobe Navy Nahawand dan Thobe Grey Indigo Karim dan Thobe Mint Imron",
);
cekBenar("panjang dibatasi 50", panjang.length <= 50, `${panjang.length} karakter`);
cekBenar("awalan nama tetap utuh", panjang.startsWith("Thobe Superblack Jiharkah"), panjang);
cekBenar("tanpa karakter khusus", !/[^\p{L}\p{N} .-]/u.test(panjang), panjang);
cekBenar("tidak ada spasi ganda/pinggir", panjang === panjang.replace(/\s+/g, " ").trim());

console.log(`\n=== HASIL: ${lulus} lulus, ${gagal} gagal (TZ: ${tz}) ===`);
process.exit(gagal === 0 ? 0 : 1);
