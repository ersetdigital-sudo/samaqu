"use client";

/**
 * Nav bawah ala aplikasi (mobile) untuk halaman toko.
 *
 * Layout mengikuti wireframe `hot-pot-restaurant-home`: 5 slot — Beranda,
 * Katalog, cart FAB bulat di tengah, Pesanan, Akun. Hanya tampil di bawah
 * breakpoint `lg`; header/desktop tidak disentuh.
 *
 * Bar aksi bawah milik halaman (keranjang, checkout, detail produk) digeser
 * naik setinggi `--mobile-nav-h` supaya tidak bertumpuk dengan bar ini.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { SquaresFour, Package, User } from "@phosphor-icons/react";
import { ShoppingCart } from "lucide-react";
import HouseIcon from "@/components/icons/HouseIcon";
import { CartBadge } from "@/components/CartBadge";
import { useSafeLocale } from "@/lib/safe-i18n";

type NavItem = {
  href: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: ComponentType<any>;
  match: (path: string) => boolean;
};

/** Path tanpa prefix locale supaya pencocokan tidak bergantung bahasa. */
function barePath(pathname: string | null): string {
  return (pathname ?? "/").replace(/^\/(id|en)(?=\/|$)/, "") || "/";
}

const LEFT_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", Icon: HouseIcon, match: (p) => p === "/" },
  { href: "/katalog", label: "Katalog", Icon: SquaresFour, match: (p) => p.startsWith("/katalog") },
];

const RIGHT_ITEMS: NavItem[] = [
  { href: "/akun/pesanan", label: "Pesanan", Icon: Package, match: (p) => p.startsWith("/akun/pesanan") },
  {
    href: "/akun",
    label: "Akun",
    Icon: User,
    match: (p) => p === "/akun" || (p.startsWith("/akun") && !p.startsWith("/akun/pesanan")),
  },
];

function NavLink({
  item,
  active,
  locale,
}: {
  item: NavItem;
  active: boolean;
  locale: string;
}) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href === "/" ? `/${locale}` : `/${locale}${href}`}
      aria-current={active ? "page" : undefined}
      className="flex h-20 flex-col items-center justify-center gap-1 pb-2 transition-colors duration-200"
      style={{ color: active ? "#000000" : "#8a8a85" }}
    >
      <Icon size={21} weight={active ? "bold" : "regular"} />
      <span className={`text-[10px] tracking-[0.02em] ${active ? "font-bold" : "font-medium"}`}>
        {label}
      </span>
    </Link>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const locale = useSafeLocale();
  const bare = barePath(pathname);
  const cartActive = bare === "/cart" || bare.startsWith("/cart/");

  return (
    <nav
      aria-label="Navigasi bawah"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 rounded-t-[24px] bg-white"
      style={{
        borderTop: "1px solid rgba(0,0,0,.06)",
        boxShadow: "0 -10px 30px -18px rgba(0,0,0,.22)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto grid h-20 max-w-lg grid-cols-5 items-stretch px-3">
        {LEFT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(bare)} locale={locale} />
        ))}

        <div className="relative flex h-20 items-end justify-center pb-2">
          <Link
            href={`/${locale}/cart`}
            aria-label="Keranjang"
            aria-current={cartActive ? "page" : undefined}
            className={`absolute -top-6 grid h-14 w-14 place-items-center rounded-full bg-black text-white shadow-[0_8px_20px_rgba(0,0,0,.28)] transition active:scale-95 ${
              cartActive ? "ring-2 ring-black ring-offset-2" : ""
            }`}
          >
            <ShoppingCart size={23} strokeWidth={2} />
            <CartBadge background="#ffffff" color="#000000" />
          </Link>
        </div>

        {RIGHT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(bare)} locale={locale} />
        ))}
      </div>
    </nav>
  );
}
