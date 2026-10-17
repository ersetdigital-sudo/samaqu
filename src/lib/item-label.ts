/**
 * Label varian/item untuk pembeli — SATU sumber supaya keranjang, checkout, ringkasan
 * pesanan, dan pesan WhatsApp tidak merangkai sendiri-sendiri.
 *
 * Kategori **Cover & Hanger** bukan pakaian: variannya berupa NAMA paket (mis. "Hanger saja"),
 * bukan warna × ukuran. Di database variannya tetap satu baris `product_variants` dengan
 * `color` = nama paket dan `size` = "ALL SIZE" (lihat `ProductForm.tsx`).
 *
 * Karena `order_items` tidak menyimpan kategori produk, item dikenali sebagai paket dari
 * ukuran penandanya (`ALL SIZE`) — satu-satunya ukuran yang dipakai kategori ini. Untuk data
 * yang memang membawa kategori (halaman produk, keranjang dari halaman produk), kategorinya
 * juga dihormati.
 */

export const PAKET_CATEGORY = "Cover & Hanger";
export const PAKET_SIZE = "ALL SIZE";

/** Ukuran penanda kategori Cover & Hanger. */
export function isPaketSize(size?: string | null): boolean {
  return String(size ?? "").trim().toUpperCase() === PAKET_SIZE;
}

/** Item ini varian "paket" (Cover & Hanger)? */
export function isPaketItem(item?: { size?: string | null; category?: string | null } | null): boolean {
  if (!item) return false;
  if (String(item.category ?? "").trim() === PAKET_CATEGORY) return true;
  return isPaketSize(item.size);
}

/** Nama varian yang layak ditampilkan (buang "default" dan "-" penanda kosong). */
export function variantName(color?: string | null): string {
  const nama = String(color ?? "").trim();
  if (!nama || nama === "-" || nama.toLowerCase() === "default") return "";
  return nama;
}

/**
 * Baris varian untuk ditampilkan di bawah nama produk:
 *  - paket (Cover & Hanger) → nama paket saja, tanpa ukuran;
 *  - lainnya → "Warna · Ukuran" (bagian kosong tidak ikut tampil).
 */
export function itemVariantLabel(item?: {
  color?: string | null;
  size?: string | null;
  /** Dipakai membaca paket dari data lama yang menaruh nama paketnya di kolom `series`. */
  series?: string | null;
  category?: string | null;
} | null): string {
  if (!item) return "";
  // Paket: nama paketnya bisa tersimpan di `color` atau (data lama) di `series`.
  if (isPaketItem(item)) return variantName(item.color) || variantName(item.series);
  return [variantName(item.color), String(item.size ?? "").trim()].filter(Boolean).join(" · ");
}

/** Nama item satu baris: "Cover Thobe - Hanger saja" (paket) atau "Thobe X - Superblack · L". */
export function itemDisplayName(item?: {
  name?: string | null;
  color?: string | null;
  size?: string | null;
  category?: string | null;
} | null): string {
  if (!item) return "";
  const nama = String(item.name ?? "").trim();
  const label = itemVariantLabel(item);
  return label ? `${nama} - ${label}` : nama;
}

/**
 * Akhiran nama item untuk pesan teks (WhatsApp admin/customer):
 * paket → " - Hanger saja"; lainnya → " (Superblack / L)" seperti format lama.
 */
export function itemNameSuffix(item?: {
  color?: string | null;
  size?: string | null;
  category?: string | null;
} | null): string {
  if (!item) return "";
  if (isPaketItem(item)) {
    const paket = variantName(item.color);
    return paket ? ` - ${paket}` : "";
  }
  const varian = [String(item.color ?? "").trim(), String(item.size ?? "").trim()].filter(Boolean).join(" / ");
  return varian ? ` (${varian})` : "";
}
