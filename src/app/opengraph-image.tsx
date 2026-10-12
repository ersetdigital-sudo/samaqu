import { ImageResponse } from "next/og";

export const alt = "SAMAQU — Busana Muslim Pria Premium";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Kartu share/OG monokrom (dipakai otomatis oleh semua route). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 14, textTransform: "uppercase", color: "#a0a1ac" }}>
          Premium Muslim Menswear
        </div>
        <div style={{ fontSize: 160, fontWeight: 700, letterSpacing: 8, marginTop: 10, lineHeight: 1 }}>
          SAMAQU
        </div>
        <div style={{ fontSize: 38, marginTop: 24, color: "#d9d9d9" }}>
          Thobe · Kandora · Koko · Vest · Kabak
        </div>
      </div>
    ),
    { ...size },
  );
}
