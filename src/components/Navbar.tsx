"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ShoppingBag, Home } from "lucide-react";
import { MobileDrawer, MobileDrawerCtx } from "@/components/ui/drawer";
import { Storefront, BookOpen, Ruler, ListChecks, Question, ChatCircle as MessageCircle } from "@phosphor-icons/react";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useCart } from "@/lib/cart-context";
import CartDrawer from "@/components/CartDrawer";
import { getWhatsAppLink } from "@/lib/store-settings";

/* ── Nav data ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;
type NavItem = { label: string; href: string; hasDropdown?: false; Icon?: IconComponent } | { label: string; hasDropdown: true; Icon?: IconComponent };

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Katalog", href: "/katalog", Icon: Storefront },
  { label: "Testimoni", href: "/testimoni", Icon: MessageCircle },
  { label: "Tentang Kami", href: "/tentang-kami", Icon: BookOpen },
  { label: "Bantuan", hasDropdown: true, Icon: Question },
];

const BANTUAN_LINKS = [
  { label: "PANDUAN UKURAN", href: "/#size", Icon: Ruler },
  { label: "CARA PESAN", href: "/cara-pesan", Icon: ListChecks },
  { label: "FAQ", href: "/#faq", Icon: Question },
  { label: "CREATE YOUR PRICE", href: "/create-your-price", Icon: Question },
];

/* ── Resolve anchor href: if not on home, prefix with / ── */
function resolveHref(href: string, isHome: boolean): string {
  if (href.startsWith("/#")) return isHome ? href.slice(1) : href;
  return href;
}

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [openDropdown, setOpenDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileBantuanOpen, setMobileBantuanOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  /* ── Close desktop dropdown on outside click ── */
  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openDropdown]);

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

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1" style={{ color: linkColor }}>
                {NAV_ITEMS.map((item) => {
                  if (!item.hasDropdown) {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={`rounded-full px-4 py-2 text-[13px] tracking-[0.14em] uppercase font-ui font-medium transition-colors ${
                          isActive ? "text-gold" : "hover:text-gold"
                        }`}
                        style={{ color: "inherit" }}
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  // Bantuan dropdown (desktop)
                  return (
                    <div key={item.label} className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setOpenDropdown((v) => !v)}
                        aria-expanded={openDropdown}
                        className={`flex items-center gap-1 rounded-full px-4 py-2 text-[13px] tracking-[0.14em] uppercase font-ui font-medium transition-colors ${
                          openDropdown ? "text-gold" : "hover:text-gold"
                        }`}
                        style={{ color: "inherit" }}
                      >
                        {item.label}
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-300 ${
                            openDropdown ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {openDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border p-1.5 shadow-lg"
                            style={{
                              background: "rgba(239,232,222,.97)",
                              borderColor: "rgba(201,183,156,.3)",
                              backdropFilter: "blur(16px)",
                            }}
                          >
                            {BANTUAN_LINKS.map((link) => (
                              <Link
                                key={link.label}
                                href={resolveHref(link.href, isHome)}
                                onClick={() => setOpenDropdown(false)}
                                className="flex w-full items-center rounded-xl px-3.5 py-2.5 text-sm font-ui font-medium transition-colors hover:bg-[rgba(201,183,156,.15)]"
                                style={{ color: "var(--espresso)" }}
                              >
                                {link.label}
                              </Link>
                            ))}
                            <div className="mt-1 border-t pt-1.5" style={{ borderColor: "rgba(201,183,156,.2)" }}>
                              <a
                                href={getWhatsAppLink("Halo Admin SAMAQU, saya butuh bantuan.")}
                                target="_blank"
                                rel="noopener"
                                onClick={() => setOpenDropdown(false)}
                                className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-ui font-medium transition-colors hover:bg-[rgba(201,183,156,.15)]"
                                style={{ color: "var(--gold)" }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.6 6.3A7.85 7.85 0 0 0 12 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1A7.9 7.9 0 0 0 12 19.9 7.94 7.94 0 0 0 17.6 6.3Z" />
                                </svg>
                                Chat Admin
                              </a>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </nav>

              {/* Right: profile + cart + hamburger */}
              <div className="flex items-center gap-4">
                <ProfileDropdown />
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative grid place-items-center w-10 h-10 transition-colors duration-500 cursor-pointer"
                  style={{ color: ctaColor }}
                  aria-label="Keranjang belanja"
                >
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  <CartBadge />
                </button>
                <button
                  className="lg:hidden grid place-items-center w-10 h-10 -mr-2 transition-colors duration-500"
                  style={{ color: ctaColor }}
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

      {/* ── Mobile Drawer ── */}
      <MobileDrawer title="Menu">
        <DrawerNavContent
          onClose={() => setMenuOpen(false)}
          isHome={isHome}
          bantuanOpen={mobileBantuanOpen}
          toggleBantuan={() => setMobileBantuanOpen((v) => !v)}
        />
      </MobileDrawer>

      {/* ── Cart Drawer ── */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </MobileDrawerCtx.Provider>
  );
}

/* ── Mobile drawer nav content ── */
function DrawerNavContent({
  onClose,
  isHome,
  bantuanOpen,
  toggleBantuan,
}: {
  onClose: () => void;
  isHome: boolean;
  bantuanOpen: boolean;
  toggleBantuan: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full" role="navigation" aria-label="Menu mobile">
      <ul className="flex flex-col" role="list">
        {NAV_ITEMS.map((item) => {
          if (!item.hasDropdown) {
            return (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="flex items-center gap-4 px-6 py-4 text-[13px] tracking-[0.18em] uppercase font-ui transition-colors duration-200 hover:text-gold hover:bg-[var(--sand-2)]"
                  style={{
                    color: "var(--espresso)",
                    borderBottom: "1px solid rgba(201,183,156,.12)",
                  }}
                  onClick={onClose}
                >
                  {item.Icon && <item.Icon size={22} weight="light" style={{ color: "var(--gold)" }} />}
                  {item.label}
                </a>
              </li>
            );
          }

          // Bantuan — accordion dropdown
          return (
            <li key={item.label}>
              <button
                onClick={toggleBantuan}
                className="flex items-center justify-between w-full px-6 py-4 text-[13px] tracking-[0.18em] uppercase font-ui transition-colors duration-200 hover:text-gold hover:bg-[var(--sand-2)]"
                style={{
                  color: "var(--espresso)",
                  borderBottom: "1px solid rgba(201,183,156,.12)",
                }}
              >
                <span className="flex items-center gap-4">
                  {item.Icon && <item.Icon size={22} weight="light" style={{ color: "var(--gold)" }} />}
                  {item.label}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${bantuanOpen ? "rotate-180" : ""}`}
                  style={{ color: "var(--gold)" }}
                />
              </button>

              {/* Sub-links */}
              <AnimatePresence>
                {bantuanOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {BANTUAN_LINKS.map((link) => (
                      <a
                        key={link.label}
                        href={resolveHref(link.href, isHome)}
                        className="flex items-center gap-4 pl-14 pr-6 py-3.5 text-[12px] tracking-[0.16em] uppercase font-ui transition-colors duration-200 hover:text-gold hover:bg-[var(--sand-2)]"
                        style={{
                          color: "var(--espresso)",
                          borderBottom: "1px solid rgba(201,183,156,.08)",
                        }}
                        onClick={onClose}
                      >
                        {link.Icon && <link.Icon size={18} weight="light" style={{ color: "var(--gold)" }} />}
                        {link.label}
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA area */}
      <div className="p-6 space-y-3 border-t" style={{ borderColor: "rgba(201,183,156,.15)" }}>
        <a
          href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
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
        <p className="text-center text-[10px] tracking-[0.2em] uppercase mt-4 font-ui" style={{ color: "var(--stone)" }}>
          SAMAQU — Busana Muslim Premium
        </p>
      </div>
    </nav>
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
      }}
    >
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
