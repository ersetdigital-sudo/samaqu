"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";

/**
 * Kerangka halaman auth portal affiliate.
 *
 * Mengikuti wireframe "Dark Slanted Auth": kartu besar (radius 2.5rem) dengan panel
 * hero gelap terslant di kiri (56%) dan panel formulir di kanan (44%).
 * TIDAK memakai foto produk — panel hero diisi gradasi gelap + grid + blok brand.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  navLink,
  navCta,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  navLink: { href: string; label: string };
  navCta: { href: string; label: string };
}) {
  return (
    <div className="aw-wrap">
      {/* Latar belakang: panel terslant (dekorasi, tanpa foto) */}
      <div className="aw-slice" aria-hidden="true">
        <div />
      </div>

      <div className="aw-card">
        {/* Panel hero gelap terslant */}
        <div className="aw-hero">
          <div className="aw-hero-slant" />
          <div className="aw-hero-grid" />
          <div className="aw-hero-content">
            <div className="aw-hero-nav">
              <span className="aw-hero-brand">SAMAQU Affiliate Center</span>
              <div className="aw-hero-links">
                <Link href={navLink.href} className="aw-hero-link">
                  {navLink.label}
                </Link>
                <Link href={navCta.href} className="aw-hero-cta">
                  {navCta.label}
                </Link>
              </div>
            </div>

            <div>
              <div className="aw-profile">
                <div className="aw-avatar">S</div>
                <div>
                  <p className="aw-profile-name">SAMAQU Affiliate Center</p>
                  <p className="aw-profile-role">Program kemitraan resmi SAMAQU</p>
                </div>
              </div>
              <div className="aw-arrows" aria-hidden="true">
                <span className="aw-arrow">
                  <Icon name="chevl" className="sm" />
                </span>
                <span className="aw-arrow">
                  <Icon name="chevr" className="sm" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel formulir */}
        <div className="aw-form-wrap">
          <div className="aw-form-top">
            <span className="aw-wordmark">SAMAQU</span>
            <span className="aw-lang">🇮🇩 ID</span>
          </div>

          <div className="aw-form">
            <div className="aw-title">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>

            {children}

            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
