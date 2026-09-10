"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import AkunPageTransition from "./AkunPageTransition";

export interface AkunCustomer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  chest_size?: number | null;
  shoulder_size?: number | null;
  length_size?: number | null;
  sleeve_size?: number | null;
}

interface NavItem {
  href: string;
  label: string;
  group: string | null;
  icon: string;
  match: string[];
}

const NAV: NavItem[] = [
  { href: "/akun", label: "Dashboard", group: null, icon: "M4 11 12 4l8 7M6 10v10h12V10", match: ["/akun"] },
  { href: "/akun/pesanan", label: "Pesanan Saya", group: "Pesanan", icon: "M3 8.5 12 4l9 4.5-9 4.5-9-4.5ZM3 8.5v7L12 20l9-4.5v-7", match: ["/akun/pesanan"] },
  { href: "/akun/wishlist", label: "Wishlist", group: "Akses Cepat", icon: "M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z", match: ["/akun/wishlist"] },
  { href: "/panduan-ukuran", label: "Panduan Ukuran", group: "Akses Cepat", icon: "M3 14 14 3l7 7L10 21zM7.5 12.5 9 14M10.5 9.5 12 11", match: ["/panduan-ukuran"] },
  { href: "/akun/profil", label: "Informasi Profil", group: "Data Saya", icon: "M12 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4.5 20a7.5 7.5 0 0 1 15 0", match: ["/akun/profil"] },
  { href: "/akun/alamat", label: "Alamat Pengiriman", group: "Data Saya", icon: "M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11ZM12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z", match: ["/akun/alamat"] },
  { href: "/akun/bantuan", label: "Hubungi Admin", group: "Bantuan", icon: "M21 12a8 8 0 1 1-3.2-6.4M8 11h8M8 15h5", match: ["/akun/bantuan"] },
];

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

export default function AkunShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useSafeLocale();
  const [customer, setCustomer] = useState<AkunCustomer | null>(null);
  const [ready, setReady] = useState(false);

  const prefix = `/${locale}`;
  const to = (href: string) => `${prefix}${href}`;

  useEffect(() => {
    let alive = true;
    async function init() {
      const c = await getCurrentCustomer();
      if (!alive) return;
      if (!c) {
        router.replace(to("/akun/login"));
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      setCustomer({ ...(c as AkunCustomer), email: user?.email || "" });
      setReady(true);
    }
    init();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = (customer?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const groups: { group: string | null; items: NavItem[] }[] = [];
  for (const item of NAV) {
    const last = groups[groups.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }

  if (!ready) {
    return (
      <div className="akun-root min-h-[70vh] grid place-items-center" style={{ background: "#f5f1ea" }}>
        <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: "#0f3d33" }} />
      </div>
    );
  }

  return (
    <div style={{ background: "#f5f1ea" }} className="akun-root min-h-screen pb-40 md:pb-24">
      <div className="md:max-w-[1100px] md:mx-auto md:px-10 md:pt-8 md:pb-12 md:flex md:gap-6">
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden md:block md:w-[250px] md:shrink-0">
          <div className="sticky top-[92px]">
            <div className="rounded-[1.25rem] bg-white p-3 shadow-[0_1px_2px_rgba(15,61,51,.04),0_8px_24px_rgba(15,61,51,.06)]">
              <div className="flex items-center gap-3 px-2 py-2 mb-1">
                <span className="w-10 h-10 rounded-2xl grid place-items-center text-[13px] font-extrabold" style={{ background: "#e3ede9", color: "#0f3d33" }}>{initials}</span>
                <span className="min-w-0">
                  <span className="block font-extrabold text-sm leading-tight truncate" style={{ color: "#0f3d33" }}>{customer?.name || "Pelanggan"}</span>
                  <span className="block text-[11px] text-[#8b9793] truncate">{customer?.email || ""}</span>
                </span>
              </div>

              {groups.map((g, gi) => (
                <div key={g.group ?? `g${gi}`}>
                  {g.group ? <p className="text-[11px] tracking-[.14em] uppercase font-bold text-[#7c8b85] px-3 pt-3 pb-1.5">{g.group}</p> : null}
                  {g.items.map((item) => {
                    const on = isActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={to(item.href)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-[13.5px] transition-colors ${on ? "text-white" : "text-[#3c4b46] hover:bg-[#f2efe8]"}`}
                        style={on ? { background: "#0f3d33" } : undefined}
                      >
                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d={item.icon} />
                        </svg>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0 px-4 pt-4 pb-10 md:px-0 md:pt-0 md:max-w-[720px]">
          <AkunPageTransition>{children}</AkunPageTransition>
        </div>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#ece6da] px-2 pt-2 pb-5 shadow-[0_-6px_24px_rgba(15,61,51,.06)]">
        <div className="flex items-stretch justify-around">
          {BOTTOM.map((item) => {
            const on = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={to(item.href)}
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

export function AkunHeader({ title, back }: { title: string; back?: string }) {
  const locale = useSafeLocale();
  const router = useRouter();
  const href = back ? `/${locale}${back}` : undefined;
  return (
    <div className="akun-root sticky top-0 z-30 -mx-4 px-4 md:mx-0 md:px-0 md:static bg-[#f5f1ea]/90 backdrop-blur md:bg-transparent md:backdrop-blur-0 flex items-center gap-3 pt-3 pb-4 md:pt-0 md:pb-6 border-b border-[#eae3d6] md:border-0">
      <button
        type="button"
        onClick={() => (href ? router.push(href) : router.back())}
        className="md:hidden w-10 h-10 -ml-1 grid place-items-center rounded-2xl bg-white shadow-[0_2px_8px_rgba(15,61,51,.08)] active:scale-95 transition"
        aria-label="Kembali"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0f3d33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
      </button>
      <h1 className="text-[17px] md:text-3xl font-extrabold" style={{ color: "#0f3d33" }}>{title}</h1>
    </div>
  );
}