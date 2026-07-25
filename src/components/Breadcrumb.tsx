"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const labelMap: Record<string, string> = {
  katalog: "Katalog",
  testimoni: "Testimoni",
  "tentang-kami": "Tentang Kami",
  checkout: "Checkout",
  cart: "Keranjang",
};

function segmentToLabel(segment: string): string {
  if (labelMap[segment]) return labelMap[segment];
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface BreadcrumbProps {
  extra?: BreadcrumbItem[];
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ extra, items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  let crumbs: BreadcrumbItem[];

  if (items) {
    crumbs = items;
  } else {
    const segments = pathname.split("/").filter(Boolean);
    crumbs = [{ label: "Home", href: "/" }];

    /* If extra provided, skip last segment (it's the dynamic route, replaced by extra) */
    const segCount = extra?.length ? segments.length - 1 : segments.length;
    let path = "";
    for (let i = 0; i < segCount; i++) {
      path += `/${segments[i]}`;
      crumbs.push({ label: segmentToLabel(segments[i]), href: path });
    }

    if (extra) {
      crumbs.push(...extra);
    }
  }

  /* Mobile: collapse middle items if > 3 */
  const isLong = crumbs.length > 3;
  const mobileCrumbs = isLong
    ? [crumbs[0], ...crumbs.slice(-2)]
    : crumbs;
  const desktopCrumbs = crumbs;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      {/* Mobile */}
      <ol className="flex sm:hidden items-center text-[11px] font-ui flex-nowrap overflow-hidden" style={{ color: "var(--stone)", gap: "0.25rem" }}>
        {mobileCrumbs.map((crumb, i) => {
          const isLast = i === mobileCrumbs.length - 1;
          return (
            <li key={i} className="flex items-center shrink-0" style={{ gap: "0.25rem" }}>
              {i > 0 && <span style={{ color: "rgba(201,183,156,.4)" }}>/</span>}
              {i === 0 && isLong ? (
                <span className="truncate max-w-[2rem]" style={{ color: "var(--stone)" }}>…</span>
              ) : crumb.href ? (
                <Link href={crumb.href} className="truncate transition-colors duration-200 hover:opacity-80" style={{ color: "var(--stone)", maxWidth: "7rem" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate" style={{ color: "var(--espresso)", fontWeight: 500, maxWidth: "10rem" }}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Desktop */}
      <ol className="hidden sm:flex items-center text-[12px] font-ui flex-wrap" style={{ color: "var(--stone)", gap: "0.375rem" }}>
        {desktopCrumbs.map((crumb, i) => {
          const isLast = i === desktopCrumbs.length - 1;
          return (
            <li key={i} className="flex items-center" style={{ gap: "0.375rem" }}>
              {i > 0 && <span style={{ color: "rgba(201,183,156,.4)" }}>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors duration-200 hover:opacity-80 whitespace-nowrap" style={{ color: "var(--stone)" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="whitespace-nowrap" style={{ color: "var(--espresso)", fontWeight: 500 }}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
