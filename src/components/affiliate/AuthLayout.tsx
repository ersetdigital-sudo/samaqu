"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Kerangka halaman auth portal affiliate.
 *
 * Port 1:1 dari wireframe "Dark Slanted Auth" (Desktop Auth Pack 1) — struktur,
 * class, spacing, dan warna diambil apa adanya dari wireframe, hanya teksnya
 * disesuaikan untuk SAMAQU (SAMAQU Affiliate Center).
 *
 * Aset gambar wireframe disimpan lokal di `public/affiliate/` supaya tidak
 * bergantung pada CDN luar.
 */

const HERO_IMAGE = "/affiliate/auth-hero.jpg";
const AVATAR_IMAGE = "/affiliate/avatar.jpg";

export default function AuthLayout({
  title,
  subtitle,
  children,
  footerLink,
  navLink,
  navCta,
  onGoogle,
  googleDisabled,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link di bawah form: teks + tujuan + warna (wireframe: "Don't have an account? Sign up") */
  footerLink: { text: string; link: string; linkLabel: string };
  navLink: { href: string; label: string };
  navCta: { href: string; label: string };
  onGoogle?: () => void;
  googleDisabled?: boolean;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative"
      style={{ background: "#f0f2f5" }}
    >
      {/* Sliced Image Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute left-0 top-0 w-[65%] h-full"
          style={{ clipPath: "polygon(0 0, 55% 0, 48% 100%, 0 100%)" }}
        >
          <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      </div>

      {/* Main Card */}
      <div className="main-card relative w-full max-w-[1050px] min-h-[700px] bg-white rounded-[2.5rem] shadow-lg p-4 md:p-5 flex flex-col md:flex-row">
        {/* LEFT - Image Panel (absolute positioned with padding offset) */}
        <div className="relative md:absolute md:top-5 md:left-5 md:bottom-5 w-full md:w-[56%] h-[350px] md:h-auto z-20 rounded-l-[2rem] overflow-hidden mb-6 md:mb-0">
          {/* Slanted cut inner wrapper */}
          <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 0% 100%)" }}>
            <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

            {/* Content Layer */}
            <div className="relative w-[95%] md:w-[85%] h-full flex flex-col justify-between p-8 md:p-10 mx-auto md:mx-0">
              {/* Top Navigation */}
              <div className="flex items-center justify-between">
                <span className="text-white/90 text-sm font-medium tracking-wide">
                  SAMAQU Affiliate Center
                </span>
                <div className="flex items-center gap-5">
                  <Link
                    href={navLink.href}
                    className="text-white/80 text-sm hover:text-white transition-colors"
                  >
                    {navLink.label}
                  </Link>
                  <Link
                    href={navCta.href}
                    className="border border-white/60 rounded-full px-5 py-1.5 text-white text-sm hover:bg-white/10 transition-colors"
                  >
                    {navCta.label}
                  </Link>
                </div>
              </div>

              {/* Bottom Section */}
              <div>
                {/* User Profile */}
                <div className="flex items-center gap-3">
                  <img
                    src={AVATAR_IMAGE}
                    alt=""
                    className="w-12 h-12 rounded-full border-2 border-white/20 object-cover"
                  />
                  <div>
                    <p className="text-white font-bold text-base tracking-wide">
                      SAMAQU Affiliate Center
                    </p>
                    <p className="text-gray-300 text-xs mt-0.5">Program kemitraan resmi SAMAQU</p>
                  </div>
                </div>
                {/* Arrow Controls */}
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    aria-label="Sebelumnya"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    aria-label="Berikutnya"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT - Form Panel */}
        <div className="w-full md:w-[44%] md:ml-auto md:px-4 lg:px-8 py-4 flex flex-col justify-center z-10 bg-white">
          {/* Top Header: Logo & Language */}
          <div className="flex items-center justify-between mb-16 md:mb-20">
            <span className="font-extrabold text-xl tracking-widest text-gray-900 uppercase">
              SAMAQU
            </span>
            <button
              type="button"
              className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <span>🇮🇩</span> ID
            </button>
          </div>

          {/* Form Wrapper */}
          <div className="w-full max-w-[340px] mx-auto flex-grow flex flex-col justify-center">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-[2.75rem] font-extrabold text-gray-900 mb-2">{title}</h1>
              <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
            </div>

            {children}

            {/* Footer Links & Socials */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 font-medium mb-8">
                {footerLink.text}{" "}
                <Link
                  href={footerLink.link}
                  className="font-semibold hover:underline"
                  style={{ color: "#eb4d4b" }}
                >
                  {footerLink.linkLabel}
                </Link>
              </p>

              <div className="flex justify-center gap-6">
                <a
                  href="https://instagram.com/samaqu.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-800 transition"
                  aria-label="Instagram SAMAQU"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1 .4 2.2.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .3-2.2.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.3-.5.2-.9.4-1.2.7-.3.3-.6.7-.7 1.2-.1.4-.3 1-.3 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.3 2.1.2.5.4.9.7 1.2.3.3.7.6 1.2.7.4.1 1 .3 2.1.1 1.2.1 1.6.1 4.7s0 3.5-.1 4.7c-.1 1.1-.2 1.7-.3 2.1-.2.5-.4.9-.7 1.2-.3.3-.6.7-1.2.7-.4.1-1 .3-2.1.3-1.2.1-1.6.1-4.7.1zm0 8.1a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4zm0-6.9a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4zm5.3-7.1a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/6285212150100"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-800 transition"
                  aria-label="WhatsApp SAMAQU"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.8 9.8 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.47 2 12.04 2zm0 17.94h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.08.8.83-3-.2-.31a8.13 8.13 0 0 1-1.25-4.34c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.4a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.66 8.16-8.16 8.16zm4.48-6.11c-.25-.13-1.46-.72-1.68-.8-.23-.09-.39-.13-.55.12-.16.25-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.04-.38-1.97-1.22-.73-.65-1.22-1.45-1.36-1.7-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.43h-.47c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.47-.29z" />
                  </svg>
                </a>
                <Link
                  href="/id/katalog"
                  className="text-gray-400 hover:text-gray-800 transition"
                  aria-label="Katalog SAMAQU"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </Link>
                <Link
                  href="/affiliate/bantuan"
                  className="text-gray-400 hover:text-gray-800 transition"
                  aria-label="Pusat Bantuan"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
