"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

const navLinks = [
  { href: "#produk", label: "Produk" },
  { href: "#tentang", label: "Tentang" },
  { href: "#size", label: "Panduan Size" },
  { href: "#cara-pesan", label: "Cara Pemesanan" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const onScroll = useCallback(() => {
    const hero = document.getElementById("hero");
    const threshold = hero ? hero.offsetHeight - 90 : 200;
    setSolid(window.scrollY > threshold);
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

  const shellStyle = solid
    ? {
        background: "rgba(42,33,27,.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(248,245,241,.1)",
        boxShadow: "0 18px 44px -26px rgba(0,0,0,.6)",
      }
    : {
        background: "transparent",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        borderBottom: "1px solid rgba(248,245,241,.12)",
        boxShadow: "none",
      };

  return (
    <header
      id="top"
      className="fixed top-0 inset-x-0 z-50"
    >
      <div
        className="transition-all duration-500"
        style={shellStyle}
      >
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-14">
          <nav className="flex items-center justify-between gap-4 h-[72px] sm:h-[84px]">
            <a
              href="#top"
              className="inline-flex items-center leading-none"
              aria-label="SAMAQU"
            >
              <Image
                src="/images/2191f072-7662-46be-9482-6958f6635adc.png"
                alt="SAMAQU"
                width={120}
                height={44}
                className="h-9 sm:h-11 w-auto"
                priority
              />
            </a>

            <div
              className="hidden lg:flex items-center gap-9 text-[11px] tracking-[0.18em] uppercase transition-colors duration-500"
              style={{ color: "rgba(248,245,241,.78)" }}
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative py-1 transition hover:text-cream"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <a
                href="#produk"
                className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase transition-colors duration-500 group"
                style={{ color: "var(--cream)" }}
              >
                Lihat Koleksi
                <span
                  className="w-6 h-px transition-all duration-500 group-hover:w-9"
                  style={{ background: "var(--gold)" }}
                />
              </a>
              <button
                className="lg:hidden grid place-items-center w-10 h-10 -mr-2 transition-colors duration-500"
                style={{ color: "var(--cream)" }}
                aria-label="Buka menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 8h16M4 16h16" />
                </svg>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden max-w-[1200px] mx-auto px-4 sm:px-6 mt-1">
          <div
            className="rounded-2xl border p-3 flex flex-col text-[13px] tracking-[0.18em] uppercase"
            style={{
              background: "rgba(248,245,241,.94)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              borderColor: "rgba(45,33,27,.08)",
              color: "var(--coffee)",
              boxShadow: "0 24px 50px -24px rgba(0,0,0,.4)",
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-3 rounded-xl transition hover:bg-sand-2 hover:text-gold"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#produk"
              className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-white transition hover:opacity-90"
              style={{ background: "var(--espresso)" }}
              onClick={() => setMenuOpen(false)}
            >
              Lihat Koleksi
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
