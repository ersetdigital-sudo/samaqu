/**
 * Generator SKU SAMAQU — satu tempat untuk semua kode.
 *
 * Format varian: KATEGORI-KAIN-WARNA-SERIES-UKURAN
 * Contoh: THB-B01-SBL-JHR-L
 * SKU dasar (tanpa ukuran): KATEGORI-KAIN-WARNA[-SERIES]
 *
 * Segmen mengikuti kategori: Kandora tanpa series (KND-B01-SBL-L), Koko/Vest
 * warna+ukuran, Kabak/Cover & Hanger warna saja (KBK-K01 / CVH-SHC).
 *
 * Semua mapping sengaja dikumpulkan di sini supaya menambah warna/kategori/series
 * tidak perlu menyebar ke komponen. SKU yang sudah diisi manual tidak ditimpa:
 * form hanya memakai hasil generator saat kolom SKU kosong.
 */

const clean = (value: unknown) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compact = (value: unknown) => clean(value).replace(/\s+/g, "");

const CATEGORY_CODES: Record<string, string> = {
  THOBE: "THB",
  KANDORA: "KND",
  KOKO: "KOK",
  VEST: "VST",
  KABAK: "KBK",
  "COVER HANGER": "CVH",
  COVER: "CVH",
};

type SkuSegment = "kain" | "warna" | "series" | "ukuran";

/**
 * Segmen yang relevan per kategori. Segmen yang tidak ada dilewati sepenuhnya
 * (tanpa placeholder / strip ganda), urutan tetap KATEGORI-KAIN-WARNA-SERIES-UKURAN.
 *  - Thobe: kain + warna + series + ukuran
 *  - Kandora: kain + warna + ukuran (tanpa series)
 *  - Koko/Vest: warna + ukuran (form tidak meminta kain/series)
 *  - Kabak / Cover & Hanger: warna saja (nama varian, tanpa ukuran)
 */
const CATEGORY_SEGMENTS: Record<string, SkuSegment[]> = {
  THOBE: ["kain", "warna", "series", "ukuran"],
  KANDORA: ["kain", "warna", "ukuran"],
  KOKO: ["warna", "ukuran"],
  VEST: ["warna", "ukuran"],
  // Paket: tidak punya kain/series/ukuran — hanya nama varian (warna).
  KABAK: ["warna"],
  "COVER HANGER": ["warna"],
};

const DEFAULT_SEGMENTS: SkuSegment[] = ["kain", "warna", "series", "ukuran"];

function segmentsFor(category: unknown): SkuSegment[] {
  return CATEGORY_SEGMENTS[clean(category)] ?? DEFAULT_SEGMENTS;
}

const SERIES_CODES: Record<string, string> = {
  JIHARKAH: "JHR",
  IMRON: "IMR",
  BAYATI: "BYT",
  NAHAWAND: "NHW",
  KARIM: "KRM",
  IMALAH: "IML",
};

const COLOR_CODES: Record<string, string> = {
  SUPERBLACK: "SBL",
  "SUPER BLACK": "SBL",
  GREY: "GRY",
  GRAY: "GRY",
  INDIGO: "IND",
  NAVY: "NVY",
  BLACK: "BLK",
  WHITE: "WHT",
  MINT: "MNT",
  CREAM: "CRM",
  BROWN: "BRN",
  BEIGE: "BGE",
  OLIVE: "OLV",
  MAROON: "MRN",
  RED: "RED",
  BLUE: "BLU",
  GREEN: "GRN",
  PURPLE: "PRP",
  PINK: "PNK",
  LATTE: "LAT",
  // Warna gabungan / nama varian khusus — selalu 3 karakter, unik antar warna.
  "GREY INDIGO": "GIN",
  "CHARCOAL GREY": "CHR",
  "SOFT GREY": "SGY",
  "BROKEN WHITE": "BWH",
  "COFFEE BROWN": "CFB",
  "DEEP MAROON": "DMR",
  "SET HANGER COVER": "SHC",
  "KABAK 01": "K01",
  "KABAK 02": "K02",
  "KABAK 04": "K04",
  "KABAK 12": "K12",
};

/** Ukuran yang dianggap varian nyata (bukan ALL SIZE / nama paket). */
export function isRealSize(size: unknown): boolean {
  const value = compact(size);
  return ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL"].includes(value);
}

export function categoryCode(category: unknown): string {
  const key = clean(category);
  if (!key) return "";
  return CATEGORY_CODES[key] || compact(key).slice(0, 3);
}

export function seriesCode(series: unknown): string {
  const key = clean(series).replace(/\b(SERIES|SERI)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!key) return "";
  return SERIES_CODES[key] || compact(key).slice(0, 3);
}

/** Kain dipakai apa adanya tanpa tanda baca: "B-01" / "B.01" → "B01". */
export function kainCode(kain: unknown): string {
  return compact(kain);
}

/**
 * Warna 3 karakter. Warna gabungan memakai mapping eksplisit (mis.
 * "Grey Indigo" → GIN, "Charcoal Grey" → CHR); warna gabungan baru yang belum
 * dipetakan tetap dipotong 3 karakter (inisial kata + huruf berikutnya).
 */
export function colorCode(color: unknown): string {
  const key = clean(color);
  if (!key || key === "DEFAULT") return "";
  if (COLOR_CODES[key]) return COLOR_CODES[key];

  const words = key.split(" ");
  if (words.length > 1) {
    // Warna gabungan yang belum dipetakan tetap 3 karakter: inisial tiap kata
    // lalu dilengkapi huruf dari kata-kata berikutnya.
    const initials = words.map((word) => word[0]).join("");
    const rest = words.map((word) => word.slice(1)).join("");
    return (initials + rest).slice(0, 3);
  }
  return compact(key).slice(0, 3);
}

/**
 * Warna efektif untuk SKU. Produk Thobe lama menyimpan warna di NAMA produk
 * (varian `default`), mis. "Thobe Imron Series Superblack". Nama series dan kata
 * "SERIES" dibuang supaya yang tersisa hanya warna.
 */
export function resolveColorName(input: {
  color?: unknown;
  productName?: unknown;
  category?: unknown;
  series?: unknown;
}): string {
  const color = clean(input.color);
  if (color && color !== "DEFAULT") return String(input.color ?? "").trim();

  let rest = clean(input.productName);
  if (!rest) return "";

  const category = clean(input.category);
  if (category && rest.startsWith(category)) rest = rest.slice(category.length).trim();

  const series = clean(input.series).replace(/\b(SERIES|SERI)\b/g, " ").replace(/\s+/g, " ").trim();
  if (series) {
    const escaped = series.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    rest = rest.replace(new RegExp(`\\b${escaped}\\b`, "g"), " ");
  }
  rest = rest.replace(/\b(SERIES|SERI)\b/g, " ").replace(/\s+/g, " ").trim();
  return rest;
}

export function generateBaseSku(input: {
  category?: unknown;
  kain?: unknown;
  color?: unknown;
  series?: unknown;
}): string {
  const segments = segmentsFor(input.category);
  const category = categoryCode(input.category);
  const color = colorCode(input.color);
  // Kategori paket (Kabak/Cover) tidak punya SKU dasar otomatis.
  if (!segments.length || !segments.includes("warna") || !category || !color) return "";

  const values: Record<SkuSegment, string> = {
    kain: kainCode(input.kain),
    warna: color,
    series: seriesCode(input.series),
    ukuran: "",
  };
  return [category, ...segments.filter((segment) => segment !== "ukuran").map((segment) => values[segment])]
    .filter(Boolean)
    .join("-");
}

export function generateVariantSku(input: {
  category?: unknown;
  kain?: unknown;
  color?: unknown;
  series?: unknown;
  size?: unknown;
}): string {
  const segments = segmentsFor(input.category);
  const category = categoryCode(input.category);
  const color = colorCode(input.color);
  if (!segments.length || !segments.includes("warna") || !category || !color) return "";
  const includesSize = segments.includes("ukuran");
  if (includesSize && !isRealSize(input.size)) return "";

  const values: Record<SkuSegment, string> = {
    kain: kainCode(input.kain),
    warna: color,
    series: seriesCode(input.series),
    ukuran: compact(input.size),
  };
  return [category, ...segments.map((segment) => values[segment])].filter(Boolean).join("-");
}

/** SKU yang dobel (case-insensitive). Dipakai form untuk menandai bentrok. */
export function duplicateSkus(skus: string[]): string[] {
  const counts = new Map<string, number>();
  for (const raw of skus) {
    const key = String(raw ?? "").trim().toUpperCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([sku]) => sku);
}
