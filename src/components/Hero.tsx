"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

const heroSlides = [
  { src: "/images/e1ad0ea0-c5ce-460c-9181-c0b171351939.png", alt: "Model pria mengenakan thobe cream premium SAMAQU di depan arsitektur lengkung yang hangat", objectPosition: "62% 24%" },
  { src: "/images/a5ae2e91-400d-44b9-9190-1b32846ee079.png", alt: "Pria mengenakan thobe krem SAMAQU berdiri di lorong berlengkung dengan cahaya hangat", objectPosition: "60% 30%" },
  { src: "/images/a6e6806f-612f-45a2-9116-59b3790a71e9.png", alt: "Pria mengenakan thobe linen beige SAMAQU dalam interior minimalis mewah bercahaya emas", objectPosition: "60% 28%" },
];

const waHref =
  "https://wa.me/6281234567890?text=" +
  encodeURIComponent("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.");

export default function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % heroSlides.length);
    }, 5500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const lines = document.querySelectorAll(".hero-line");
    if (reduce) {
      lines.forEach((el) => ((el as HTMLElement).style.opacity = "1"));
      return;
    }
    lines.forEach((el, idx) => {
      (el as HTMLElement).style.animationDelay = (0.15 + idx * 0.15) + "s";
      el.classList.add("hero-in");
    });
  }, []);

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ background: "var(--espresso)", minHeight: "100dvh" }}
    >
      {/* Crossfade photo slider */}
      <div className="absolute inset-0">
        {heroSlides.map((slide, i) => (
          <div
            key={slide.src}
            className={`hero-slide absolute inset-0${i === active ? " is-active" : ""}`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              className="hero-media w-full h-full object-cover"
              style={{ objectPosition: slide.objectPosition }}
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        ))}
      </div>

      {/* Dark gradient overlay — desktop */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(100deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.6) 30%,rgba(0,0,0,.42) 48%,rgba(0,0,0,.12) 62%,transparent 78%)" }}
      />
      <div
        className="hidden md:block absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(0deg,rgba(0,0,0,.7) 0%,rgba(0,0,0,.28) 34%,transparent 56%)" }}
      />
      {/* Dark gradient overlay — mobile (stronger for readability) */}
      <div
        className="md:hidden absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.65) 40%,rgba(0,0,0,.75) 100%)" }}
      />

      {/* Content */}
      <div className="relative z-10 h-full">
        <div
          className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-14 flex flex-col justify-end pt-[88px] sm:pt-[104px] lg:pt-[120px] pb-14 sm:pb-20 lg:pb-32"
          style={{ minHeight: "100dvh" }}
        >
          <div className="w-full max-w-[480px] lg:w-[42vw] lg:max-w-[540px] lg:pr-6">
            <p
              className="hero-anim hero-line flex items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] tracking-[0.28em] sm:tracking-[0.32em] uppercase mb-5 sm:mb-7"
              style={{ color: "var(--sand)" }}
            >
              <span className="w-6 sm:w-8 h-px" style={{ background: "var(--gold)" }} />
              Premium Muslim Menswear
            </p>

            <h1 className="mb-5 sm:mb-6" style={{ color: "var(--cream)" }}>
              <span
                className="hero-anim hero-line block font-semibold tracking-[-0.02em] leading-[1.08] text-[8.5vw] sm:text-[3.4rem] lg:text-[3.6rem] xl:text-[3.9rem]"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
              >
                Busana yang Layak
              </span>
              <span
                className="hero-anim hero-line block font-semibold tracking-[-0.02em] leading-[1.08] text-[8.5vw] sm:text-[3.4rem] lg:text-[3.6rem] xl:text-[3.9rem]"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#e0b563" }}
              >
                Menemani Setiap Momen.
              </span>
            </h1>

            <p
              className="hero-anim hero-line text-[14px] sm:text-[15px] lg:text-base leading-relaxed max-w-md sm:max-w-lg mb-5 sm:mb-6"
              style={{ color: "rgba(248,245,241,.85)" }}
            >
              Dirancang dengan material pilihan, potongan yang presisi, dan detail yang dibuat untuk kenyamanan dalam setiap aktivitas.
            </p>

            <ul className="hero-anim hero-line flex flex-col gap-1.5 sm:gap-2 mb-6 sm:mb-8 text-[13px] sm:text-[14px]" style={{ color: "rgba(248,245,241,.9)" }}>
              <li className="flex items-center gap-2 sm:gap-2.5">
                <CheckIcon />6 Koleksi Eksklusif
              </li>
              <li className="flex items-center gap-2 sm:gap-2.5">
                <CheckIcon />Berbagai Jenis Kain
              </li>
              <li className="flex items-center gap-2 sm:gap-2.5">
                <CheckIcon />Panduan Size Lengkap
              </li>
            </ul>

            <div className="hero-anim hero-line flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-x-6 sm:gap-y-3 mb-8 sm:mb-10">
              <a
                href="#produk"
                className="group inline-flex items-center gap-2.5 sm:gap-3 rounded-lg px-6 sm:px-8 py-3.5 sm:py-4 text-[11px] sm:text-[12px] tracking-[0.16em] sm:tracking-[0.18em] uppercase transition hover:opacity-95 w-full sm:w-auto justify-center"
                style={{ background: "var(--gold)", color: "white" }}
              >
                Lihat Koleksi
                <svg className="transition-transform duration-500 group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener"
                className="group inline-flex items-center gap-2 py-3.5 sm:py-4 text-[11px] sm:text-[12px] tracking-[0.16em] sm:tracking-[0.18em] capitalize sm:uppercase transition"
                style={{ color: "var(--cream)" }}
              >
                Hubungi Admin
                <span className="w-6 h-px transition-all duration-500 group-hover:w-9" style={{ background: "var(--gold)" }} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#cara-pesan"
        className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2 group"
      >
        <span className="text-[10px] tracking-[0.32em] uppercase" style={{ color: "rgba(248,245,241,.7)" }}>
          Scroll
        </span>
        <span
          className="w-6 h-10 rounded-full border flex items-start justify-center p-1.5"
          style={{ borderColor: "rgba(248,245,241,.45)" }}
        >
          <span className="scroll-dot w-1 h-2 rounded-full" style={{ background: "var(--gold)" }} />
        </span>
      </a>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg className="shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
