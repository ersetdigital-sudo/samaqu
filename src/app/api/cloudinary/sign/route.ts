import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// Incoming transformation yang dipakai saat upload:
// - c_limit  → jangan upscale, pertahankan rasio
// - w_2400   → batasi sisi terpanjang supaya storage tidak boros
// - q_auto   → kompresi cerdas (tanpa f_auto agar format asli tidak diubah di storage)
const IMAGE_TRANSFORMATION = "c_limit,w_2400,q_auto:good";
const VIDEO_TRANSFORMATION = "c_limit,w_1280,q_auto";

type SignParams = Record<string, string | number>;

/**
 * Signature Cloudinary = sha1(parameter yang diurutkan alfabetis + api_secret).
 * Hanya parameter yang benar-benar dikirim (kecuali file, api_key, cloud_name,
 * resource_type, dan signature) yang ikut ditandatangani.
 */
function signParams(params: SignParams, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((key) => {
      const value = params[key];
      return value !== undefined && value !== null && String(value) !== "";
    })
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export async function POST(request: Request) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary belum dikonfigurasi. Set NEXT_PUBLIC_CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET." },
      { status: 500 }
    );
  }

  // Guard ringan: tolak kalau Origin tidak sama dengan host (cegah endpoint
  // signing dipakai dari situs lain). Request tanpa Origin (server-side) tetap lolos.
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    try {
      if (!host || new URL(origin).host !== host) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let resourceType: "image" | "video" = "image";
  try {
    const body = await request.json();
    if (body?.resourceType === "video") resourceType = "video";
  } catch {
    // Body kosong → default image
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const transformation = resourceType === "video" ? VIDEO_TRANSFORMATION : IMAGE_TRANSFORMATION;
  const signature = signParams({ timestamp, transformation }, apiSecret);

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    transformation,
    resourceType,
    signature,
  });
}
