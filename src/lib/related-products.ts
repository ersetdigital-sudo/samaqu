/**
 * Aturan rekomendasi "Produk lain dari kain ini" — SATU sumber untuk semua halaman
 * detail produk (katalog biasa & versi locale) supaya logikanya tidak pernah beda.
 *
 * Aturan (sesuai permintaan owner):
 *  - kandidat: produk lain dengan Jenis Kain yang sama + kategori yang sama;
 *  - jangan tampilkan produk yang sedang dibuka, dan jangan tampilkan warna yang sama
 *    (termasuk series lain dari warna itu);
 *  - satu kartu per warna — tidak boleh ada dua kartu berwarna sama;
 *  - warna gelap/hitam diurutkan paling belakang supaya hitam tidak mendominasi;
 *  - kalau warna lain kurang dari `limit`, lengkapi dengan Jenis Kain lain di kategori
 *    yang sama (hanya warna yang belum tampil); kalau masih kurang, tampilkan apa adanya
 *    tanpa mengulang warna yang sama.
 */

import { colorMap, type Product } from "./katalog-data";
import { warnaFromName } from "./ops-order";

/** Kunci warna sebuah produk (dipakai untuk dedupe & menyembunyikan warna produk aktif). */
export function productColorKey(p: Product): string {
  const nameColor = warnaFromName(p.name, p.category).toLowerCase();
  // Thobe menyimpan varian warna `default`; warnanya ada di nama produk.
  if (String(p.category || "").toLowerCase() === "thobe") return nameColor;
  const color = (p.colors || [])
    .map((c) => String(c || "").trim())
    .find((c) => c && c.toLowerCase() !== "default");
  return (color || nameColor).toLowerCase();
}

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function isDarkColor(color: string): boolean {
  const key = color.toLowerCase();
  if (/black|hitam/.test(key)) return true;
  const hex =
    colorMap[color] ||
    colorMap[Object.keys(colorMap).find((k) => k.toLowerCase() === key) || ""];
  const lum = hex ? luminance(hex) : null;
  return lum !== null && lum < 0.15;
}

/** Judul kartu = nama lengkap produk (kategori + warna + jenis kain), bukan cuma series. */
export function relatedProductTitle(p: Product): string {
  const base =
    String(p.name || "").trim() ||
    [p.category, p.series].filter(Boolean).join(" ").trim();
  const kain = String(p.jenis_kain?.name || p.kain || "").trim();
  if (!kain) return base;
  if (base.toLowerCase().includes(kain.toLowerCase())) return base;
  return `${base} ${kain}`.trim();
}

function sameJenisKain(current: Product, p: Product): boolean {
  if (current.jenis_kain_id && p.jenis_kain_id) {
    return p.jenis_kain_id === current.jenis_kain_id;
  }
  const a = String(current.jenis_kain?.name || current.kain || "").trim().toLowerCase();
  const b = String(p.jenis_kain?.name || p.kain || "").trim().toLowerCase();
  return !!a && a === b;
}

/**
 * Pilih (maksimal `limit`) produk rekomendasi dari `pool` (idealnya produk
 * `is_published = true`). Urutan: Jenis Kain sama dulu, lalu jenis kain lain
 * sekategori sebagai pelengkap — selalu satu warna satu kartu.
 */
export function pickRelatedProducts(current: Product, pool: Product[], limit = 4): Product[] {
  const category = String(current.category || "").toLowerCase();
  const currentColor = productColorKey(current);
  const seen = new Set<string>([currentColor]);
  const out: Product[] = [];

  const take = (list: Product[]) => {
    // Warna terang dulu, gelap/hitam di belakang.
    const ranked = [...list].sort(
      (a, b) => Number(isDarkColor(productColorKey(a))) - Number(isDarkColor(productColorKey(b)))
    );
    for (const p of ranked) {
      if (out.length >= limit) return;
      const color = productColorKey(p);
      if (!color || seen.has(color)) continue;
      seen.add(color);
      out.push(p);
    }
  };

  const sameCategory = pool.filter(
    (p) => p.id !== current.id && String(p.category || "").toLowerCase() === category
  );

  take(sameCategory.filter((p) => sameJenisKain(current, p)));
  if (out.length < limit) take(sameCategory.filter((p) => !sameJenisKain(current, p)));

  return out;
}
