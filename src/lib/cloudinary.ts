export interface CloudinaryConfig {
  cloud: string;
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;
  if (!cloud) {
    throw new Error("Cloudinary belum dikonfigurasi. Set NEXT_PUBLIC_CLOUDINARY_CLOUD.");
  }
  return { cloud };
}

export interface CloudinaryUrlOptions {
  /** Lebar maksimum dalam px (c_limit = tidak upscale). */
  width?: number;
  /** Tinggi maksimum dalam px (c_limit = tidak upscale). */
  height?: number;
  /** Kualitas: default "auto" (q_auto). */
  quality?: string | number;
  /** Crop mode, default "limit" supaya gambar asli tidak diperbesar. */
  crop?: string;
  /** Format, default "auto" (f_auto → WebP/AVIF sesuai browser). */
  format?: string;
  /** dpr, mis. "auto" untuk retina. */
  dpr?: string;
  /** Parameter transformasi tambahan, mis. "g_auto". */
  extra?: string;
}

const CLOUDINARY_TRANSFORM_SEGMENT = /^(f_|q_|w_|h_|c_|dpr_|g_|t_|e_|ar_|vc_|b_|r_|x_|y_|o_)/;

/**
 * Sisipkan transformasi Cloudinary ke URL delivery supaya browser cuma
 * mengunduh ukuran yang dibutuhkan (hemat bandwidth/kredit).
 *
 * Contoh:
 *   https://res.cloudinary.com/demo/image/upload/v1/a.jpg
 *   → https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600,c_limit/v1/a.jpg
 *
 * URL non-Cloudinary (aset lokal / video) dikembalikan apa adanya.
 */
export function cloudinaryUrl(src: string, opts: CloudinaryUrlOptions = {}): string {
  if (!src || !src.includes("res.cloudinary.com")) return src;
  // Video: jangan ubah (transcode on-the-fly bisa menambah biaya processing)
  if (src.includes("/video/upload/")) return src;

  const marker = "/image/upload/";
  const idx = src.indexOf(marker);
  if (idx === -1) return src;

  const base = src.slice(0, idx + marker.length);
  const rest = src.slice(idx + marker.length);

  // Hindari transform ganda kalau URL sudah punya parameter transformasi
  const firstSegment = rest.split("/")[0];
  if (CLOUDINARY_TRANSFORM_SEGMENT.test(firstSegment)) return src;

  const parts: string[] = [
    `f_${opts.format ?? "auto"}`,
    `q_${opts.quality ?? "auto"}`,
  ];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  parts.push(`c_${opts.crop ?? "limit"}`);
  if (opts.dpr) parts.push(`dpr_${opts.dpr}`);
  if (opts.extra) parts.push(opts.extra);

  return `${base}${parts.join(",")}/${rest}`;
}

interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  transformation: string;
  resourceType: "image" | "video";
  signature: string;
}

/**
 * Upload file ke Cloudinary memakai signed upload (server menandatangani
 * parameter lewat /api/cloudinary/sign). Dengan cara ini server bisa memaksa
 * incoming transformation, sehingga storage tidak menyimpan file resolusi
 * mentah. Tidak lagi butuh unsigned upload preset.
 *
 * Env yang dibutuhkan:
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  const { cloud } = getCloudinaryConfig();
  const isVideo = file.type.startsWith("video/");
  const resourceType: "image" | "video" = isVideo ? "video" : "image";

  // 1) Minta signature + parameter transformation dari server
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType }),
  });
  if (!signRes.ok) {
    console.error("[uploadToCloudinary] Gagal minta signature:", signRes.status);
    throw new Error("Upload gagal");
  }
  const sign = (await signRes.json()) as CloudinarySignature;

  // 2) Kirim file + parameter bertanda tangan langsung ke Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sign.apiKey);
  formData.append("timestamp", String(sign.timestamp));
  formData.append("signature", sign.signature);
  formData.append("transformation", sign.transformation);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[uploadToCloudinary] Cloudinary error:", res.status, detail);
    throw new Error("Upload gagal");
  }
  const data = await res.json();
  return data.secure_url;
}
