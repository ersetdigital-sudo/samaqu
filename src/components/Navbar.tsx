"use client";

import Image from "next/image";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

/* ── Nav data ── */
const navLinks = [
  { href: "#produk", label: "Produk" },
  { href: "#tentang", label: "Tentang" },
  { href: "#size", label: "Panduan Size" },
  { href: "#cara-pesan", label: "Cara Pemesanan" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /* ── Scroll: transparent over hero → solid after hero ── */
  const onScroll = useCallback(() => {
    const hero = document.getElementById("hero");
    const threshold = hero ? hero.offsetHeight - 90 : 200;
    setScrolled(window.scrollY > threshold);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  /* ── Lock body scroll when mobile menu open ── */
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  /* ── Focus trap inside mobile menu ── */
  useEffect(() => {
    if (!menuOpen || !menuRef.current) return;

    const container = menuRef.current;
    const focusable = () =>
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

    // Focus first link on open
    const first = focusable()[0];
    first?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusable();
      const firstEl = items[0];
      const lastEl = items[items.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    toggleRef.current?.focus();
  }

  function toggleMenu() {
    setMenuOpen((v) => !v);
  }

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

  const linkColor = scrolled
    ? "var(--espresso)"
    : "rgba(248,245,241,.78)";

  const ctaColor = scrolled ? "var(--espresso)" : "var(--cream)";

  return (
    <header id="top" className="fixed top-0 inset-x-0 z-50">
      {/* ── Main bar ── */}
      <div className="transition-all duration-500" style={shellStyle}>
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-14">
          <nav
            className="flex items-center justify-between gap-4 h-[72px] sm:h-[84px]"
            role="navigation"
            aria-label="Navigasi utama"
          >
            {/* Logo */}
            <a
              href="#top"
              className="inline-flex items-center leading-none shrink-0"
              aria-label="SAMAQU — kembali ke atas"
            >
              <Image
                src="/images/2191f072-7662-46be-9482-6958f6635adc.png"
                alt="SAMAQU"
                width={120}
                height={44}
                className="h-9 sm:h-11 w-auto transition-[filter] duration-500"
                style={{ filter: scrolled ? "brightness(0.15)" : "none" }}
                priority
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
                    href={link.href}
                    className="nav-desktop-link relative py-1 transition-colors duration-300 hover:text-gold"
                    style={{ color: "inherit" }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Right: CTA + hamburger */}
            <div className="flex items-center gap-4">
              <a
                href="#produk"
                className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase transition-colors duration-500 font-ui group"
                style={{ color: ctaColor }}
              >
                Lihat Koleksi
                <span
                  className="w-6 h-px transition-all duration-500 group-hover:w-9"
                  style={{ background: "var(--gold)" }}
                />
              </a>

              <button
                ref={toggleRef}
                className="lg:hidden grid place-items-center w-10 h-10 -mr-2 transition-colors duration-500"
                style={{ color: scrolled ? "var(--espresso)" : "var(--cream)" }}
                aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                onClick={toggleMenu}
              >
                <span
                  className="nav-hamburger"
                  data-open={menuOpen || undefined}
                >
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* ── Mobile menu (always mounted, animated via CSS) ── */}
      <div
        id="mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi mobile"
        className="lg:hidden nav-mobile-panel"
        data-open={menuOpen || undefined}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 mt-1">
          <nav
            className="rounded-sm border flex flex-col text-[13px] tracking-[0.18em] uppercase font-ui"
            style={{
              background: "rgba(248,245,241,.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderColor: "rgba(201,183,156,.25)",
              color: "var(--coffee)",
              boxShadow: "0 24px 50px -24px rgba(0,0,0,.35)",
            }}
          >
            {navLinks.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-mobile-link px-5 py-4 transition-colors duration-300 hover:bg-sand-2 hover:text-gold"
                style={{
                  animationDelay: menuOpen ? `${i * 0.05}s` : "0s",
                  borderBottom:
                    i < navLinks.length - 1
                      ? "1px solid rgba(201,183,156,.15)"
                      : "none",
                }}
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#produk"
              className="nav-mobile-link mt-1 inline-flex items-center justify-center gap-2 px-5 py-4 transition-colors duration-300 hover:opacity-90"
              style={{
                background: "var(--espresso)",
                color: "var(--cream)",
                animationDelay: menuOpen
                  ? `${navLinks.length * 0.05}s`
                  : "0s",
              }}
              onClick={closeMenu}
            >
              Lihat Koleksi
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </nav>
        </div>
      </div>

      {/* Backdrop overlay when menu open */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[-1]"
          style={{ background: "rgba(45,33,27,.3)" }}
          aria-hidden="true"
          onClick={closeMenu}
        />
      )}
    </header>
  );
}
