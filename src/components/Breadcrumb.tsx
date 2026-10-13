"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import HouseIcon from "@/components/icons/HouseIcon";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const LOCALES = ["id", "en"];

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
    // Path dari next/navigation masih membawa prefix locale (/id, /en) — jangan
    // dijadikan crumb, kalau tidak "Id" ikut muncul dan merusak breadcrumb.
    const all = pathname.split("/").filter(Boolean);
    const hasLocale = LOCALES.includes(all[0]);
    const localePrefix = hasLocale ? `/${all[0]}` : "";
    const segs = hasLocale ? all.slice(1) : all;

    crumbs = [{ label: "Beranda", href: localePrefix || "/" }];

    // Item terakhir (nama produk) dikirim lewat `extra`, jadi tidak dihitung dari path.
    const segCount = extra?.length ? segs.length - 1 : segs.length;
    let path = localePrefix;
    for (let i = 0; i < segCount; i++) {
      path += `/${segs[i]}`;
      crumbs.push({ label: segmentToLabel(segs[i]), href: path });
    }

    if (extra) {
      crumbs.push(...extra);
    }
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      {/* Mobile — satu baris: Beranda & item tengah tetap penuh, hanya item terakhir
          yang boleh terpotong (ellipsis) dan menyerap sisa lebar. Di bawah 360px
          "Beranda" diganti ikon rumah supaya tetap muat tanpa scroll horizontal. */}
      <ol
        className="flex sm:hidden items-center text-[13px] font-ui flex-nowrap overflow-hidden"
        style={{ color: "var(--stone)", gap: "0.4rem" }}
      >
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          const isHome = i === 0;
          return (
            <li
              key={i}
              className={`flex items-center min-w-0 ${isLast ? "flex-1" : "shrink-0"}`}
              style={{ gap: "0.4rem" }}
            >
              {i > 0 && (
                <span aria-hidden style={{ color: "rgba(0,0,0,.4)" }}>
                  /
                </span>
              )}
              {!isLast && crumb.href ? (
                <Link
                  href={crumb.href}
                  className="inline-flex items-center min-h-11 transition-opacity duration-200 hover:opacity-70"
                  style={{ color: "var(--stone)" }}
                >
                  {isHome ? (
                    <>
                      <span className="inline-flex min-[360px]:hidden">
                        <HouseIcon size={17} />
                      </span>
                      <span className="hidden min-[360px]:inline">Beranda</span>
                    </>
                  ) : (
                    crumb.label
                  )}
                </Link>
              ) : (
                <span
                  className="min-w-0 truncate font-medium"
                  style={{ color: "var(--espresso)" }}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Desktop — jangan diubah */}
      <ol className="hidden sm:flex items-center text-sm font-ui flex-wrap" style={{ color: "var(--stone)", gap: "0.375rem" }}>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center" style={{ gap: "0.375rem" }}>
              {i > 0 && <span style={{ color: "rgba(0,0,0,.5)" }}>/</span>}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="transition-colors duration-200 hover:opacity-80 whitespace-nowrap" style={{ color: "var(--stone)" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="whitespace-nowrap font-medium" style={{ color: "var(--espresso)" }}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
