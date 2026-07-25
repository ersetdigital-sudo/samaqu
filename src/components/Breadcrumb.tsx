"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/* ── Map path segments to readable labels ── */
const labelMap: Record<string, string> = {
  katalog: "Katalog",
  testimoni: "Testimoni",
  "tentang-kami": "Tentang Kami",
  checkout: "Checkout",
  cart: "Keranjang",
};

function segmentToLabel(segment: string): string {
  if (labelMap[segment]) return labelMap[segment];
  /* Capitalize first letter, replace hyphens with spaces */
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface BreadcrumbProps {
  /** Extra items to append (e.g., product name for dynamic routes) */
  extra?: BreadcrumbItem[];
  /** Override auto-generated items entirely */
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ extra, items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  let crumbs: BreadcrumbItem[];

  if (items) {
    crumbs = items;
  } else {
    /* Auto-generate from URL */
    const segments = pathname.split("/").filter(Boolean);
    crumbs = [{ label: "Home", href: "/" }];

    let path = "";
    for (let i = 0; i < segments.length; i++) {
      path += `/${segments[i]}`;
      const isLast = i === segments.length - 1 && !extra?.length;
      crumbs.push({
        label: segmentToLabel(segments[i]),
        href: isLast ? undefined : path,
      });
    }

    if (extra) {
      crumbs.push(...extra);
    }
  }

  /* Mobile: if > 3 items, show "... / parent / current" */
  const isLong = crumbs.length > 3;
  const displayCrumbs = isLong
    ? [crumbs[0], ...crumbs.slice(-2)]
    : crumbs;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap text-[11px] sm:text-[12px] font-ui" style={{ color: "var(--stone)", gap: "0.375rem" }}>
        {isLong && (
          <>
            <li className="hidden sm:list-item">…</li>
            <li className="hidden sm:list-item" style={{ color: "rgba(201,183,156,.4)" }}>/</li>
          </>
        )}
        {displayCrumbs.map((crumb, i) => {
          const isLast = i === displayCrumbs.length - 1;
          return (
            <li key={i} className="flex items-center" style={{ gap: "0.375rem" }}>
              {i > 0 && <span style={{ color: "rgba(201,183,156,.4)" }}>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors duration-200 hover:opacity-80" style={{ color: "var(--stone)" }}>
                  {i === 0 && isLong ? "…" : crumb.label}
                </Link>
              ) : (
                <span style={{ color: "var(--espresso)", fontWeight: 500 }}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
