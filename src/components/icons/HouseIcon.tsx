import type { CSSProperties } from "react";

/**
 * Ikon "rumah" (path lucide `house`) sebagai SVG inline.
 *
 * Dipakai SERAGAM di navbar (menu) dan nav bawah mobile supaya ikon Beranda/Home sama persis.
 * Dibuat inline (bukan import library) supaya bentuknya pasti sama dengan yang diminta dan
 * tetap kompatibel dipanggil dengan prop `weight` (dipakai ikon lain di daftar yang sama).
 */
export default function HouseIcon({
  size = 22,
  weight,
  style,
}: {
  size?: number;
  weight?: string;
  style?: CSSProperties;
}) {
  const strokeWidth = weight === "bold" ? 2.2 : weight === "light" ? 1.6 : 2;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
