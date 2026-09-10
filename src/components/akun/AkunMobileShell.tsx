"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSafeLocale } from "@/lib/safe-i18n";
import AkunPageTransition from "./AkunPageTransition";

const BOTTOM = [
  { href: "/akun", label: "Akun", icon: "M12 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4.5 20a7.5 7.5 0 0 1 15 0", match: ["/akun"] },
  { href: "/akun/pesanan", label: "Pesanan", icon: "M3 8.5 12 4l9 4.5-9 4.5-9-4.5ZM3 8.5v7L12 20l9-4.5v-7", match: ["/akun/pesanan"] },
  { href: "/akun/wishlist", label: "Wishlist", icon: "M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z", match: ["/akun/wishlist"] },
  { href: "/akun/bantuan", label: "Bantuan", icon: "M21 12a8 8 0 1 1-3.2-6.4M8 11h8M8 15h5", match: ["/akun/bantuan"] },
];

function isActive(pathname: string, item: { href: string; match: string[] }): boolean {
  const bare = pathname.replace(/^\/(id|en)/, "") || "/";
  if (bare === "/akun" || bare === "/akun/") return item.href === "/akun";
  return item.match.some((m) => m !== "/akun" && bare.startsWith(m));
}

export default function AkunMobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const locale = useSafeLocale();
  const prefix = `/${locale}`;
  const to = (href: string) => `${prefix}${href}`;

  return (
    <div className="md:hidden min-h-screen pb-40">
      <div className="px-4 pt-4 pb-10">
        <AkunPageTransition>{children}</AkunPageTransition>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#ece6da] px-2 pt-2 pb-5 shadow-[0_-6px_24px_rgba(15,61,51,.06)]">
        <div className="flex items-stretch justify-around">
          {BOTTOM.map((item) => {
            const on = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={to(item.href)}
                prefetch={true}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition ${on ? "bg-[#eef4f1]" : "active:bg-[#f5f1ea]"}`}
              >
                <span className={on ? "text-[#0f3d33]" : "text-[#a3aeaa]"}>
                  <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={on ? "2" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                </span>
                <span className={`text-[10px] font-bold ${on ? "text-[#0f3d33]" : "text-[#a3aeaa]"}`}>{item.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-[#0f3d33]" : ""}`} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
