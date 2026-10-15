"use client";

/**
 * Helper upload foto persegi (khusus section Instagram Home).
 *
 * Foto dinormalkan jadi persegi 1:1 (crop tengah) sebelum diunggah supaya semua
 * slot seragam dan website tetap ringan — tidak bergantung pada ukuran/rasio
 * berkas yang dipilih admin.
 */

/** Batas ukuran berkas mentah yang diterima, sebelum dikompres. */
export const IMAGE_SQUARE_MAX_BYTES = 10 * 1024 * 1024;
/** Sisi hasil (px). 1080 = cukup tajam untuk layar @2x, tetap ringan. */
export const IMAGE_SQUARE_SIZE = 1080;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Validasi tipe & ukuran; melempar Error berbahasa Indonesia kalau tidak lolos. */
export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format harus JPG, PNG, atau WebP");
  }
  if (file.size > IMAGE_SQUARE_MAX_BYTES) {
    throw new Error("Ukuran maksimal 10MB");
  }
}

/** Resize + crop tengah ke persegi `size`px, hasil JPEG (kecil & seragam). */
export async function squareResizeImage(file: File, size = IMAGE_SQUARE_SIZE): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal membaca gambar"));
      el.src = url;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("Dimensi gambar tidak terbaca");

    // Crop tengah ke persegi.
    const side = Math.min(w, h);
    const sx = (w - side) / 2;
    const sy = (h - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia di browser ini");
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) throw new Error("Gagal mengompres gambar");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
