/**
 * Deteksi alamat dari teks yang ditempel: "Tempel alamat lengkap, isi otomatis"
 * (referensi: fitur serupa di J&T VIP).
 *
 * Aturan mainnya:
 *  - Nomor HP dikenali dari pola 08xx / 628xx / +628xx (boleh ada spasi/strip) dan
 *    dinormalkan ke bentuk `08xx`.
 *  - Nama = teks sebelum nomor HP (pemisah seperti `·`, koma, strip dibuang).
 *  - Provinsi/Kota/Kecamatan dicocokkan ke daftar wilayah yang dipakai dropdown
 *    (`src/lib/kota.ts`, dataset area J&T) — pencocokan dari BELAKANG teks, tidak
 *    sensitif huruf besar-kecil, awalan administratif diabaikan, dan typo ringan
 *    (beda 1 huruf) masih diterima. Yang tidak cocok DIBIARKAN KOSONG, tidak ditebak.
 *  - Kode pos hanya diambil kalau ada angka 5 digit (angka 6 digit diabaikan), dan
 *    dataset wilayah kita tidak menyimpan kode pos — jadi sumbernya cuma teks.
 *
 * Modul ini MURNI: sumber wilayah diinjeksi lewat `WilayahSource`, jadi tidak menarik
 * dataset area J&T ke bundle browser, bisa dipakai server (`/api/ops/alamat-tebak`), dan
 * bisa diuji tanpa database.
 */

export type WilayahSource = {
  /** Semua provinsi (bentuk sudah rapi, sama seperti isi dropdown). */
  provinces: string[];
  /** Kota/kabupaten dalam satu provinsi. */
  citiesOf: (province: string) => string[];
  /** Kecamatan dalam satu kota. */
  districtsOf: (city: string) => string[];
  /** Provinsi dari sebuah kota (cadangan kalau kota tidak ada di daftar provinsi). */
  provinceOfCity: (city: string) => string;
};

export type BagianAlamat = "name" | "whatsapp" | "address" | "province" | "city" | "kecamatan" | "postal_code";

export type HasilDeteksi = {
  name: string;
  whatsapp: string;
  street: string;
  province: string;
  city: string;
  kecamatan: string;
  postal_code: string;
  /** Bagian yang gagal dideteksi → ditampilkan sebagai pesan kecil, tidak ditebak. */
  missing: BagianAlamat[];
  /** Bagian yang berhasil diisi → dipakai tombol "Reset" supaya isian manual tidak ikut hilang. */
  filled: BagianAlamat[];
};

/* ── Normalisasi & pencocokan ── */

const rapikan = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Bentuk pembanding: huruf kecil, tanda baca jadi spasi, spasi dirapikan. */
const normal = (v: unknown) => rapikan(v).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/** Awalan administratif yang tidak membedakan pencocokan. */
const AWALAN_ADMIN = new Set([
  "prov", "provinsi", "kab", "kabupaten", "kota", "kotamadya", "kodya",
  "kec", "kecamatan", "kel", "kelurahan", "desa", "dsn", "dusun",
]);

/** "Kec. Cibitung" → "cibitung" (awalan administratif dibuang). */
function tanpaAwalan(v: unknown): string {
  const kata = normal(v).split(" ").filter(Boolean);
  while (kata.length > 1 && AWALAN_ADMIN.has(kata[0])) kata.shift();
  return kata.join(" ");
}

/** Jarak Levenshtein (dipakai untuk toleransi typo ringan). */
function jarak(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i, ...Array(n).fill(0)];
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Urutan kata `needle` muncul utuh di dalam `haystack`. */
function adaUrutanKata(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

/**
 * Kecocokan longgar untuk satu frasa tempat: sama, salah satu memuat yang lain
 * (per kata utuh), atau beda maksimal 1 huruf untuk frasa ≥5 huruf.
 */
function cocok(kandidat: unknown, pilihan: unknown): boolean {
  const a = tanpaAwalan(kandidat);
  const b = tanpaAwalan(pilihan);
  if (!a || !b) return false;
  if (a === b) return true;
  const kataA = a.split(" ");
  const kataB = b.split(" ");
  const pendek = a.length <= b.length ? kataA : kataB;
  const panjang = a.length <= b.length ? kataB : kataA;
  if (pendek.join("").length >= 4 && adaUrutanKata(panjang, pendek)) return true;
  if (pendek.join(" ").length >= 5 && jarak(a, b) <= 1) return true;
  return false;
}

/* ── Nomor HP ── */

const POLA_HP = /(?:\+?62|0)(?:[\s.-]?\d){6,18}/g;

/** "08123456789 17510" (hp menempel kode pos) → hp dipotong, sisanya jadi kandidat kode pos. */
function pisahHpDanKodePos(digit: string): { hp: string; sisa: string } {
  const bersih = digit.replace(/^62/, "0");
  if (bersih.length <= 13) return { hp: bersih, sisa: "" };
  // Lebih dari 13 digit: pola paling umum adalah "hp + kode pos 5 digit" tanpa pemisah.
  const ekor = bersih.slice(-5);
  const kepala = bersih.slice(0, -5);
  if (kepala.length >= 10 && kepala.length <= 13) return { hp: kepala, sisa: ekor };
  return { hp: bersih.slice(0, 13), sisa: bersih.slice(13) };
}

export function cariNomorHp(teks: string): { hp: string; mulai: number; selesai: number; ekor: string } | null {
  const cocokan = [...String(teks || "").matchAll(POLA_HP)];
  for (const m of cocokan) {
    const mentah = m[0];
    const digit = mentah.replace(/\D/g, "");
    if (!/^(0|62)?8/.test(digit.replace(/^62/, "0"))) continue;
    if (digit.replace(/^62/, "0").length < 10) continue; // 08 + minimal 8 digit
    const { hp, sisa } = pisahHpDanKodePos(digit);
    if (hp.length < 10 || hp.length > 13) continue;
    return { hp, mulai: m.index ?? 0, selesai: (m.index ?? 0) + mentah.length, ekor: sisa };
  }
  return null;
}

/* ── Kode pos ── */

/** Semua angka tepat 5 digit yang berdiri sendiri (bukan bagian angka lebih panjang). */
export function cariKodePos(teks: string): string {
  const cocokan = [...String(teks || "").matchAll(/(?<!\d)\d{5}(?!\d)/g)].map((m) => m[0]);
  return cocokan.length > 0 ? cocokan[cocokan.length - 1] : "";
}

/* ── Segmentasi alamat ── */

/** Pecah jadi potongan per pemisah umum: koma, titik koma, garis baru, `·`, `|`. */
function potongSegmen(teks: string): string[] {
  return String(teks || "")
    .split(/[,;\n|·•]+/)
    .map(rapikan)
    .filter(Boolean);
}

/** Hapus satu kemunculan teks (tanpa peduli besar-kecil huruf) dari alamat. */
function hapusKemunculan(teks: string, potongan: string): string {
  const cari = rapikan(potongan);
  if (!cari) return teks;
  const escaped = cari.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return teks.replace(new RegExp(escaped, "i"), " ");
}

/**
 * Cari satu frasa tempat di dalam daftar segmen, dari BELAKANG (urutan alamat:
 * jalan → kelurahan → kecamatan → kota → provinsi). Mengembalikan frasa asli yang
 * cocok (untuk dihapus dari alamat lengkap) beserta nilainya.
 */
function cariTempat(
  segmen: string[],
  daftar: string[],
): { nilai: string; frasa: string } | null {
  if (daftar.length === 0) return null;
  for (let i = segmen.length - 1; i >= 0; i -= 1) {
    const isi = segmen[i];
    const langsung = daftar.find((pilihan) => cocok(isi, pilihan));
    if (langsung) return { nilai: langsung, frasa: isi };
    // Frasa tempat menempel di dalam segmen ("Jl. X Kel. Y Kec. Z") → cari per pilihan.
    for (const pilihan of daftar) {
      const kataPilihan = tanpaAwalan(pilihan).split(" ").filter(Boolean);
      if (kataPilihan.join("").length < 4) continue;
      const kataIsi = normal(isi).split(" ").filter(Boolean);
      if (!adaUrutanKata(kataIsi, kataPilihan)) continue;
      // Ambil potongan asli dari teks segmen: buang awalan administratif di depannya bila ada.
      const pola = new RegExp(`(?:${[...AWALAN_ADMIN].join("|")})?[\\s.]*${kataPilihan.join("[\\s.]+")}`, "i");
      const ketemu = isi.match(pola);
      if (ketemu) return { nilai: pilihan, frasa: ketemu[0] };
    }
  }
  return null;
}

/* ── Deteksi utama ── */

export function deteksiAlamat(teks: string, sumber: WilayahSource): HasilDeteksi {
  const mentah = rapikan(teks);
  const hasil: HasilDeteksi = {
    name: "",
    whatsapp: "",
    street: "",
    province: "",
    city: "",
    kecamatan: "",
    postal_code: "",
    missing: [],
    filled: [],
  };
  if (!mentah) return hasil;

  /* 1 · Nomor HP */
  const hp = cariNomorHp(mentah);
  if (hp) {
    hasil.whatsapp = hp.hp;
    hasil.filled.push("whatsapp");
  } else {
    hasil.missing.push("whatsapp");
  }

  /* 2 · Nama = teks sebelum nomor HP */
  const sebelumHp = hp ? mentah.slice(0, hp.mulai) : "";
  const nama = rapikan(sebelumHp.replace(/^[\s·,;|.\-–—]+|[\s·,;|.\-–—]+$/g, ""));
  if (nama) {
    hasil.name = nama;
    hasil.filled.push("name");
  } else {
    hasil.missing.push("name");
  }

  /* 3 · Bagian alamat = sisa teks setelah nomor HP */
  const teksAlamat = hp ? mentah.slice(hp.selesai) : mentah;
  const segmen = potongSegmen(teksAlamat);

  /* 4 · Kode pos: dari sisa HP atau angka 5 digit di teks (angka 6 digit diabaikan) */
  const kodePos = hp?.ekor && /^\d{5}$/.test(hp.ekor) ? hp.ekor : cariKodePos(teksAlamat);
  if (kodePos) {
    hasil.postal_code = kodePos;
    hasil.filled.push("postal_code");
  } else {
    hasil.missing.push("postal_code");
  }

  /* 5 · Provinsi → Kota → Kecamatan (cocok dari belakang) */
  const semuaKota = sumber.provinces.flatMap((provinsi) =>
    sumber.citiesOf(provinsi).map((kota) => ({ provinsi, kota })),
  );

  const provinsi = cariTempat(segmen, sumber.provinces);
  if (provinsi) {
    hasil.province = provinsi.nilai;
    hasil.filled.push("province");
  }

  const frasaDipakai: string[] = [];
  const kota = cariTempat(segmen, semuaKota.map((baris) => baris.kota));
  if (kota) {
    hasil.city = kota.nilai;
    frasaDipakai.push(kota.frasa);
    if (!hasil.province) {
      // Provinsi tidak disebut → ambil dari data kota (daftar provinsi dulu, lalu cadangan).
      const dariDaftar = semuaKota.find((baris) => baris.kota === kota.nilai)?.provinsi || "";
      const provinsiCadangan = dariDaftar || rapikan(sumber.provinceOfCity(kota.nilai));
      const cocokDiDaftar = sumber.provinces.find((p) => cocok(p, provinsiCadangan));
      if (cocokDiDaftar) {
        hasil.province = cocokDiDaftar;
        hasil.filled.push("province");
      }
    }
    const kecamatan = cariTempat(segmen, sumber.districtsOf(kota.nilai));
    if (kecamatan) {
      hasil.kecamatan = kecamatan.nilai;
      hasil.filled.push("kecamatan");
      frasaDipakai.push(kecamatan.frasa);
    } else {
      hasil.missing.push("kecamatan");
    }
  } else {
    hasil.missing.push("city", "kecamatan");
  }

  /* 6 · Alamat lengkap: buang kecamatan/kota/provinsi/hp/nama/kode pos (tanpa mengulang) */
  let alamat = teksAlamat;
  for (const potongan of [provinsi?.frasa, ...frasaDipakai, hasil.name, kodePos]) {
    if (potongan) alamat = hapusKemunculan(alamat, potongan);
  }
  if (hp) alamat = hapusKemunculan(alamat, mentah.slice(hp.mulai, hp.selesai));
  hasil.street = potongSegmen(alamat).join(", ");
  if (hasil.street) hasil.filled.push("address");

  return hasil;
}
