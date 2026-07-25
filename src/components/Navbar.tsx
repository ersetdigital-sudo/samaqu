"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MobileDrawer, MobileDrawerCtx } from "@/components/ui/drawer";
import { Storefront, BookOpen, Ruler, ListChecks, Question, ChatCircle as MessageCircle } from "@phosphor-icons/react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import CartDrawer from "@/components/CartDrawer";

/* ── Nav data ── */
const navLinks = [
  { href: "/katalog", label: "Katalog", Icon: Storefront },
  { href: "/testimoni", label: "Testimoni", Icon: MessageCircle },
  { href: "#tentang", label: "Tentang", Icon: BookOpen },
  { href: "#size", label: "Panduan Size", Icon: Ruler },
  { href: "#cara-pesan", label: "Cara Pemesanan", Icon: ListChecks },
  { href: "#faq", label: "FAQ", Icon: Question },
];

/* ── Resolve anchor href: if not on home, prefix with / ── */
function anchorHref(href: string, isHome: boolean): string {
  if (href.startsWith("#")) return isHome ? href : `/${href}`;
  return href;
}

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  /* ── Scroll: transparent over hero → solid after hero ── */
  const onScroll = useCallback(() => {
    if (!isHome) { setScrolled(true); return; }
    const hero = document.getElementById("hero");
    const threshold = hero ? hero.offsetHeight - 90 : 200;
    setScrolled(window.scrollY > threshold);
  }, [isHome]);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  /* ── Styles ── */
  const shellStyle = scrolled
    ? {
        background: "rgba(239,232,222,.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(201,183,156,.35)",
        boxShadow: "0 8px 32px -16px rgba(45,33,27,.12)",
      }
    : {
        background: "transparent",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        borderBottom: "1px solid rgba(248,245,241,.12)",
        boxShadow: "none",
      };

  const linkColor = scrolled ? "var(--espresso)" : "rgba(248,245,241,.78)";
  const ctaColor = scrolled ? "var(--espresso)" : "var(--cream)";

  return (
    <MobileDrawerCtx.Provider value={{ open: menuOpen, setOpen: setMenuOpen }}>
      {/* ── Navbar: fixed, z-50 ── */}
      <header id="top" className="fixed top-0 inset-x-0 z-50">
        <div className="transition-all duration-500" style={shellStyle}>
          <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-14">
            <nav
              className="flex items-center justify-between gap-4 h-[72px] sm:h-[84px]"
              role="navigation"
              aria-label="Navigasi utama"
            >
              {/* Logo */}
              <a
                href="/"
                className="inline-flex items-center leading-none shrink-0 cursor-pointer"
                aria-label="SAMAQU — kembali ke beranda"
              >
                <img
                  src="/logo.svg"
                  alt="SAMAQU"
                  className="h-8 sm:h-10 w-auto transition-[filter] duration-500"
                  style={{
                    filter: !isHome || scrolled ? "none" : "invert(1) brightness(0.95)",
                  }}
                />
              </a>

              {/* Desktop links */}
              <ul
                className="hidden lg:flex items-center gap-9 text-[11px] tracking-[0.18em] uppercase transition-colors duration-500 font-ui"
                style={{ color: linkColor }}
                role="list"
              >
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={anchorHref(link.href, isHome)}
                      className="nav-desktop-link relative py-1 transition-colors duration-300 hover:text-gold"
                      style={{ color: "inherit" }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              {/* Right: CTA + cart + hamburger */}
              <div className="flex items-center gap-4">
                <a
                  href="/katalog"
                  className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase transition-colors duration-500 font-ui group"
                  style={{ color: ctaColor }}
                >
                  Lihat Koleksi
                  <span
                    className="w-6 h-px transition-all duration-500 group-hover:w-9"
                    style={{ background: "var(--gold)" }}
                  />
                </a>

                {/* Cart icon */}
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative grid place-items-center w-10 h-10 transition-colors duration-500"
                  style={{ color: scrolled ? "var(--espresso)" : "var(--cream)" }}
                  aria-label="Keranjang belanja">
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  <CartBadge />
                </button>

                {/* Hamburger — opens drawer */}
                <button
                  className="lg:hidden grid place-items-center w-10 h-10 -mr-2 transition-colors duration-500"
                  style={{ color: scrolled ? "var(--espresso)" : "var(--cream)" }}
                  aria-label="Buka menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(true)}
                >
                  <span className="nav-hamburger" data-open={menuOpen || undefined}>
                    <span />
                    <span />
                    <span />
                  </span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* ── Drawer: renders at body level via portal, z-9999 ── */}
      <MobileDrawer title="Menu">
        <DrawerNavContent onClose={() => setMenuOpen(false)} />
      </MobileDrawer>

      {/* ── Cart Drawer ── */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </MobileDrawerCtx.Provider>
  );
}

/* ── Cart badge with bounce animation ── */
function CartBadge() {
  const { totalItems } = useCart();
  const [bump, setBump] = useState(false);
  const prev = usePrevious(totalItems);

  useEffect(() => {
    if (prev !== undefined && totalItems > prev) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      return () => clearTimeout(t);
    }
  }, [totalItems, prev]);

  if (totalItems === 0) return null;

  return (
    <span
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-ui font-bold"
      style={{
        background: "var(--gold)",
        color: "white",
        transform: bump ? "scale(1.3)" : "scale(1)",
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
      {totalItems}
    </span>
  );
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useState<T | undefined>(undefined);
  const current = ref[0];
  ref[0] = value as T;
  return current;
}

/* ── Drawer nav content ── */
const waHref =
  "https://wa.me/6281234567890?text=" +
  encodeURIComponent(
    "Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan."
  );

function DrawerNavContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <nav className="flex flex-col h-full" role="navigation" aria-label="Menu mobile">
      {/* Links */}
      <ul className="flex flex-col" role="list">
        {navLinks.map((link) => (
          <li key={link.href}>
            <a
              href={anchorHref(link.href, isHome)}
              className="flex items-center gap-4 px-6 py-4 text-[13px] tracking-[0.18em] uppercase font-ui transition-colors duration-200 hover:text-gold hover:bg-[var(--sand-2)]"
              style={{
                color: "var(--espresso)",
                borderBottom: "1px solid rgba(201,183,156,.12)",
              }}
              onClick={onClose}
            >
              <link.Icon size={22} weight="light" style={{ color: "var(--gold)" }} />
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA area */}
      <div className="p-6 space-y-3 border-t" style={{ borderColor: "rgba(201,183,156,.15)" }}>
        <a
          href={waHref}
          target="_blank"
          rel="noopener"
          className="flex items-center justify-center gap-2 w-full px-5 py-3.5 text-[11px] tracking-[0.16em] uppercase font-ui font-medium transition-all duration-300 hover:opacity-90 rounded-sm"
          style={{ background: "var(--gold)", color: "white" }}
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.6 6.3A7.85 7.85 0 0 0 12 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1A7.9 7.9 0 0 0 12 19.9 7.94 7.94 0 0 0 17.6 6.3Z" />
          </svg>
          Chat Admin
        </a>
        <a
          href="/katalog"
          className="flex items-center justify-center gap-2 w-full px-5 py-3.5 text-[11px] tracking-[0.16em] uppercase font-ui font-medium transition-opacity duration-200 hover:opacity-80 rounded-sm"
          style={{ background: "var(--espresso)", color: "var(--cream)" }}
          onClick={onClose}
        >
          Lihat Koleksi
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
        <p className="text-center text-[10px] tracking-[0.2em] uppercase mt-4 font-ui" style={{ color: "var(--stone)" }}>
          SAMAQU — Busana Muslim Premium
        </p>
      </div>
    </nav>
  );
}
