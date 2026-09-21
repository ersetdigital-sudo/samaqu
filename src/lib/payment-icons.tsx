import type { CSSProperties } from "react";

/** Ikon bawaan untuk metode pembayaran (gaya line-art, konsisten di admin & checkout). */
export type PaymentIconKey = "bank" | "qris" | "ewallet" | "cod" | "cash" | "card" | "store";

export const PAYMENT_ICON_OPTIONS: { key: PaymentIconKey; label: string }[] = [
  { key: "bank", label: "Transfer Bank" },
  { key: "qris", label: "QRIS" },
  { key: "ewallet", label: "E-Wallet" },
  { key: "cod", label: "Bayar di Tempat" },
  { key: "cash", label: "Tunai" },
  { key: "card", label: "Kartu / Debit" },
  { key: "store", label: "Toko / Outlet" },
];

const ICON_KEYS = PAYMENT_ICON_OPTIONS.map((o) => o.key);

export function isPaymentIconKey(value: string | null | undefined): value is PaymentIconKey {
  return !!value && (ICON_KEYS as string[]).includes(value);
}

/** Ikon default kalau admin belum memilih ikon untuk sebuah jenis metode. */
export function defaultIconForType(type: string | null | undefined): PaymentIconKey {
  if (type === "qris") return "qris";
  if (type === "ewallet") return "ewallet";
  if (type === "cod") return "cod";
  if (type === "other") return "store";
  return "bank";
}

/** Ambil kunci ikon yang aman dipakai dari sebuah metode pembayaran. */
export function resolveIconKey(icon?: string | null, methodType?: string | null): PaymentIconKey {
  if (isPaymentIconKey(icon)) return icon;
  return defaultIconForType(methodType);
}

export function PaymentIcon({
  type,
  size = 20,
  className,
  style,
}: {
  type?: string | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const key = resolveIconKey(isPaymentIconKey(type ?? undefined) ? type : undefined, type);
  const base = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
    "aria-hidden": true,
  };

  switch (key) {
    case "qris":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <line x1="14" y1="14" x2="21" y2="21" />
        </svg>
      );
    case "ewallet":
      return (
        <svg {...base}>
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <circle cx="12" cy="9.5" r="2.5" />
          <path d="M10.5 18.5h3" />
        </svg>
      );
    case "cod":
      return (
        <svg {...base}>
          <rect x="1" y="3" width="15" height="13" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case "cash":
      return (
        <svg {...base}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 10v4M18 10v4" />
        </svg>
      );
    case "card":
      return (
        <svg {...base}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="2" y1="9" x2="22" y2="9" />
          <line x1="6" y1="15" x2="10" y2="15" />
        </svg>
      );
    case "store":
      return (
        <svg {...base}>
          <path d="M3.5 9 5 4h14l1.5 5" />
          <path d="M4.5 9v10.5h15V9" />
          <path d="M9.5 19.5V14h5v5.5" />
        </svg>
      );
    default:
      return (
        <svg {...base}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
  }
}
