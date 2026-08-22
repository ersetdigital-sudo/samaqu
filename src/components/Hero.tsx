"use client";

import { useState, useEffect, useRef } from "react";
import { useSafeTranslations } from "@/lib/safe-i18n";
import { supabase } from "@/lib/supabase";
import { getWhatsAppLink } from "@/lib/store-settings";
import { trackWhatsAppClick } from "@/lib/meta-pixel";

/* ── Video sources ── */
const HERO_VIDEO = "/video/Thobe%20Gabungan%20Imron%20dan%20Jiharkah%20Deep%20maroon%20B-02%20Ambience.mp4";

/* ── Default values (match database defaults) ── */
const DEFAULTS = {
  eyebrow_text: "Premium Muslim Menswear",
  title_line1: "Busana yang Layak",
  title_line2: "Menemani Setiap Momen.",
  title_line1_color: "#f8f5f1",
  title_line2_color: "#e0b563",
  description: "Dirancang dengan material pilihan, potongan yang presisi, dan detail yang dibuat untuk kenyamanan dalam setiap aktivitas.",
  feature1: "6 Koleksi Eksklusif",
  feature2: "Berbagai Jenis Kain",
  feature3: "Panduan Size Lengkap",
};

export default function Hero() {
  const t = useSafeTranslations("hero");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [muted, setMuted] = useState(false);
  const [heroData, setHeroData] = useState(DEFAULTS);

  // i18n text overrides — always use translations for text content
  const heroText = {
    eyebrow_text: t("eyebrow"),
    title_line1: t("title1"),
    title_line2: t("title2"),
    description: t("desc"),
    feature1: t("feature1"),
    feature2: t("feature2"),
    feature3: t("feature3"),
  };

  // Fetch hero content from Supabase — only for visual settings (colors)
  useEffect(() => {
    async function fetchHero() {
      try {
        const { data } = await supabase.from("hero_content").select("*").eq("id", 1).single();
        if (data && data.is_active) {
          setHeroData((prev) => ({
            ...prev,
            title_line1_color: data.title_line1_color || DEFAULTS.title_line1_color,
            title_line2_color: data.title_line2_color || DEFAULTS.title_line2_color,
          }));
        }
      } catch {
        // Silent fail - use defaults
      }
    }
    fetchHero();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Detect slow connection
    const conn = (navigator as any).connection;
    if (conn) {
      const effectiveType = conn.effectiveType as string;
      if (effectiveType === "slow-2g" || effectiveType === "2g") return;
    }

    setShouldPlay(true);
  }, []);

  useEffect(() => {
    if (!shouldPlay || !videoRef.current) return;
    videoRef.current.play().catch(() => {
      // Jika autoplay dengan suara diblokir, fallback ke muted
      setMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    });
  }, [shouldPlay]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = muted;
  }, [muted]);

  function toggleMute() {
    setMuted((v) => !v);
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const lines = document.querySelectorAll(".hero-line");
    if (reduce) {
      lines.forEach((el) => ((el as HTMLElement).style.opacity = "1"));
      return;
    }
    lines.forEach((el, idx) => {
      (el as HTMLElement).style.animationDelay = 0.15 + idx * 0.15 + "s";
      el.classList.add("hero-in");
    });
  }, []);

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ background: "var(--espresso)", minHeight: "100dvh" }}
    >
      {/* ── Video background ── */}
      <div className="absolute inset-0">
        {/* Video */}
        {shouldPlay && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted={muted}
            loop
            playsInline
            preload="auto"
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Dark gradient overlay — desktop */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(100deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.6) 30%,rgba(0,0,0,.42) 48%,rgba(0,0,0,.12) 62%,transparent 78%)",
        }}
      />
      <div
        className="hidden md:block absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg,rgba(0,0,0,.7) 0%,rgba(0,0,0,.28) 34%,transparent 56%)",
        }}
      />
      {/* Top-down gradient — ensures navbar readability over any video frame (desktop) */}
      <div
        className="hidden lg:block absolute inset-x-0 top-0 h-[200px] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.18) 50%, transparent 100%)",
        }}
      />
      {/* Dark gradient overlay — mobile */}
      <div
        className="md:hidden absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.65) 40%,rgba(0,0,0,.75) 100%)",
        }}
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
              <span
                className="w-6 sm:w-8 h-px"
                style={{ background: "var(--gold)" }}
              />
              {heroText.eyebrow_text}
            </p>

            <h1 className="mb-5 sm:mb-6">
              {heroText.title_line1 && (
                <span
                  className="hero-anim hero-line block font-semibold tracking-[-0.02em] leading-[1.08] text-[8.5vw] sm:text-[3.4rem] lg:text-[3.6rem] xl:text-[3.9rem]"
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    color: heroData.title_line1_color || "#f8f5f1",
                  }}
                >
                  {heroText.title_line1}
                </span>
              )}
              {heroText.title_line2 && (
                <span
                  className="hero-anim hero-line block font-semibold tracking-[-0.02em] leading-[1.08] text-[8.5vw] sm:text-[3.4rem] lg:text-[3.6rem] xl:text-[3.9rem]"
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    color: heroData.title_line2_color || "#e0b563",
                  }}
                >
                  {heroText.title_line2}
                </span>
              )}
            </h1>

            <p
              className="hero-anim hero-line text-[14px] sm:text-[15px] lg:text-base leading-relaxed max-w-md sm:max-w-lg mb-5 sm:mb-6"
              style={{ color: "rgba(248,245,241,.85)" }}
            >
              {heroText.description}
            </p>

            <ul
              className="hero-anim hero-line flex flex-col gap-1.5 sm:gap-2 mb-6 sm:mb-8 text-[13px] sm:text-[14px]"
              style={{ color: "rgba(248,245,241,.9)" }}
            >
              <li className="flex items-center gap-2 sm:gap-2.5">
                <CheckIcon />
                {heroText.feature1}
              </li>
              <li className="flex items-center gap-2 sm:gap-2.5">
                <CheckIcon />
                {heroText.feature2}
              </li>
              <li className="flex items-center gap-2 sm:gap-2.5">
                <CheckIcon />
                {heroText.feature3}
              </li>
            </ul>

            <div className="hero-anim hero-line flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-x-6 sm:gap-y-3 mb-8 sm:mb-10">
              <a
                href="/katalog"
                className="group inline-flex items-center gap-2.5 sm:gap-3 rounded-lg px-6 sm:px-8 py-3.5 sm:py-4 text-[11px] sm:text-[12px] tracking-[0.16em] sm:tracking-[0.18em] uppercase transition hover:opacity-95 w-full sm:w-auto justify-center"
                style={{ background: "var(--gold)", color: "white" }}
              >
                {t("cta1")}
                <svg
                  className="transition-transform duration-500 group-hover:translate-x-1"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              <a
                href={getWhatsAppLink(t("whatsappMsg"))}
                target="_blank"
                rel="noopener"
                onClick={() => trackWhatsAppClick("hero")}
                className="group inline-flex items-center gap-2 py-3.5 sm:py-4 text-[11px] sm:text-[12px] tracking-[0.16em] sm:tracking-[0.18em] capitalize sm:uppercase transition"
                style={{ color: "var(--cream)" }}
              >
                {t("cta2")}
                <span
                  className="w-6 h-px transition-all duration-500 group-hover:w-9"
                  style={{ background: "var(--gold)" }}
                />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mute/Unmute toggle */}
      {shouldPlay && (
        <button
          onClick={toggleMute}
          className={`absolute bottom-6 right-5 sm:right-8 z-10 flex items-center gap-2 rounded-full transition-all duration-300 hover:scale-105 ${muted ? "px-4 py-2.5" : "w-10 h-10 justify-center"}`}
          style={{
            background: muted ? "var(--gold)" : "rgba(0,0,0,.35)",
            backdropFilter: "blur(8px)",
            border: muted ? "none" : "1px solid rgba(248,245,241,.15)",
          }}
          aria-label={muted ? t("unmute") : t("muteLabel")}
        >
          {muted ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span className="text-[11px] font-semibold text-white">{t("mute")}</span>
            </>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(248,245,241,.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      )}

      {/* Scroll indicator */}
      <a
        href="#cara-pesan"
        className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2 group"
      >
        <span
          className="text-[10px] tracking-[0.32em] uppercase"
          style={{ color: "rgba(248,245,241,.7)" }}
        >
          {t("scroll")}
        </span>
        <span
          className="w-6 h-10 rounded-full border flex items-start justify-center p-1.5"
          style={{ borderColor: "rgba(248,245,241,.45)" }}
        >
          <span
            className="scroll-dot w-1 h-2 rounded-full"
            style={{ background: "var(--gold)" }}
          />
        </span>
      </a>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      className="shrink-0"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--gold)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
