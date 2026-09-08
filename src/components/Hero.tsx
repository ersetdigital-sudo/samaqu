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
  title_line1_color: "#f8f5f1",
  title_line2_color: "#e0b563",
};

export default function Hero() {
  const t = useSafeTranslations("hero");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [showUnmuteHint, setShowUnmuteHint] = useState(true);
  const [heroData, setHeroData] = useState(DEFAULTS);
  const hasInteracted = useRef(false);

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

  // Start video playback (always muted first for autoplay policy)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const conn = (navigator as any).connection;
    if (conn) {
      const effectiveType = conn.effectiveType as string;
      if (effectiveType === "slow-2g" || effectiveType === "2g") return;
    }

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Auto-unmute after first real user gesture (click/touch only —
  // scroll is NOT a valid gesture for unmuted playback on iOS and pauses the video)
  useEffect(() => {
    function handleInteraction() {
      if (hasInteracted.current) return;
      hasInteracted.current = true;
      if (videoRef.current) {
        videoRef.current.muted = false;
        setMuted(false);
        setShowUnmuteHint(false);
      }
    }

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  function toggleMute() {
    if (videoRef.current) {
      const newMuted = !muted;
      videoRef.current.muted = newMuted;
      setMuted(newMuted);
      setShowUnmuteHint(false);
      hasInteracted.current = true;
    }
  }

  // Staggered entrance choreography
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const items = document.querySelectorAll<HTMLElement>("[data-hero-stagger]");
    if (reduce) {
      items.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }
    items.forEach((el, idx) => {
      el.style.transitionDelay = `${0.15 + idx * 0.11}s`;
      requestAnimationFrame(() => el.classList.add("is-in"));
    });
  }, []);

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ background: "var(--espresso)", minHeight: "100dvh" }}
    >
      {/* ── Video background ── */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      </div>

      {/* ── Cinematic overlays ── */}
      {/* Desktop: angled editorial gradient */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(98deg,rgba(16,11,8,.82) 0%,rgba(16,11,8,.62) 34%,rgba(16,11,8,.3) 56%,rgba(16,11,8,.05) 76%,transparent 92%)",
        }}
      />
      <div
        className="hidden md:block absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg,rgba(16,11,8,.78) 0%,rgba(16,11,8,.3) 30%,transparent 52%)",
        }}
      />
      <div
        className="hidden lg:block absolute inset-x-0 top-0 h-[220px] pointer-events-none"
        style={{
          background: "linear-gradient(180deg,rgba(16,11,8,.5) 0%,rgba(16,11,8,.2) 46%,transparent 100%)",
        }}
      />
      {/* Mobile: deep cinematic scrim — content anchors bottom, type stays readable over bright frames */}
      <div
        className="md:hidden absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg,rgba(14,10,7,.48) 0%,rgba(14,10,7,.4) 16%,rgba(14,10,7,.58) 38%,rgba(14,10,7,.88) 64%,rgba(14,10,7,.97) 100%)",
        }}
      />
      {/* Ambient gold glow — breathing */}
      <div className="hero-glow absolute pointer-events-none" aria-hidden />
      {/* Filmic grain */}
      <div className="hero-noise absolute inset-0 pointer-events-none" aria-hidden />
      {/* Bottom gold hairline */}
      <div
        className="absolute bottom-0 inset-x-0 h-px pointer-events-none z-20"
        style={{ background: "linear-gradient(90deg,transparent,rgba(224,181,99,.55),transparent)" }}
        aria-hidden
      />

      {/* ── Content ── */}
      <div className="relative z-10 h-full">
        <div
          className="max-w-[1240px] mx-auto px-5 sm:px-10 lg:px-16 xl:pl-24 flex flex-col justify-end pt-[96px] sm:pt-[110px] lg:pt-[130px] pb-24 lg:pb-28"
          style={{ minHeight: "100dvh" }}
        >
          <div className="w-full max-w-[620px] lg:w-[50vw] lg:max-w-[660px]">
            {/* Badge */}
            <div
              data-hero-stagger
              className="hero-enter inline-flex items-center gap-3 rounded-full px-4 py-2"
              style={{
                background: "rgba(0,0,0,.35)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,.1)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--gold)" }} />
              <span
                className="font-semibold font-ui"
                style={{ letterSpacing: "0.26em", fontSize: "11px", color: "var(--gold)" }}
              >
                {t("badge")}
              </span>
            </div>

            {/* Display title */}
            <h1
              data-hero-stagger
              className="hero-enter mt-5 font-semibold"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "clamp(40px, 10vw, 62px)",
                lineHeight: 1.06,
                color: heroData.title_line1_color,
              }}
            >
              {t("title1")}
              <span
                className="block italic font-normal mt-1"
                style={{ color: heroData.title_line2_color }}
              >
                {t("title2")}
              </span>
            </h1>

            {/* Subheadline */}
            <p
              data-hero-stagger
              className="hero-enter italic mt-4"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "clamp(19px, 3vw, 22px)",
                color: "#e8ddcf",
              }}
            >
              {t("subtitle")}
            </p>

            {/* Description */}
            <p
              data-hero-stagger
              className="hero-enter mt-5 max-w-[46ch] text-[14px] sm:text-[15px] leading-relaxed font-ui"
              style={{ color: "var(--sand)" }}
            >
              {t("desc")}
            </p>

            {/* Feature icons — 3 items */}
            <ul
              data-hero-stagger
              className="hero-enter mt-7 flex flex-wrap gap-x-8 gap-y-4"
            >
              {/* Material Pilihan */}
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3 9 5-9 5-9-5 9-5Z" />
                  <path d="m3 13 9 5 9-5" />
                </svg>
                <span className="text-[13px] leading-tight font-ui" style={{ color: "#e3d8cb" }}>
                  {t("item1")}
                </span>
              </li>
              {/* Cutting Presisi */}
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="18" r="2.4" />
                  <circle cx="18" cy="18" r="2.4" />
                  <path d="M8 16 18 4M16 16 6 4" />
                </svg>
                <span className="text-[13px] leading-tight font-ui" style={{ color: "#e3d8cb" }}>
                  {t("item2")}
                </span>
              </li>
              {/* Create Your Price */}
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12V4h8l9 9-8 8-9-9Z" />
                  <circle cx="7.5" cy="7.5" r="1.2" fill="var(--gold)" stroke="none" />
                </svg>
                <span className="text-[13px] leading-tight font-ui" style={{ color: "#e3d8cb" }}>
                  {t("item3")}
                </span>
              </li>
            </ul>

            {/* CTAs */}
            <div data-hero-stagger className="hero-enter mt-7 flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Primary — gold filled */}
              <a
                href="/katalog"
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full px-8 py-3.5 text-[13px] font-bold tracking-wide font-ui w-full sm:w-auto transition active:scale-[0.97]"
                style={{ background: "var(--gold)", color: "#1c1512", boxShadow: "0 18px 44px -14px rgba(224,181,99,.5)" }}
              >
                <span
                  className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ background: "#efd0a0" }}
                  aria-hidden
                />
                <span className="relative">{t("cta1")}</span>
                <svg
                  className="relative w-4 h-4 transition-transform duration-500 group-hover:translate-x-1.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>

              {/* Secondary — outline with WhatsApp icon */}
              <a
                href={getWhatsAppLink(t("whatsappMsg"))}
                target="_blank"
                rel="noopener"
                onClick={() => trackWhatsAppClick("hero")}
                className="group inline-flex items-center justify-center gap-3 rounded-full px-8 py-3.5 text-[13px] font-semibold tracking-wide font-ui w-full sm:w-auto transition active:scale-[0.97]"
                style={{
                  color: "white",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.35)",
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" />
                </svg>
                {t("cta2")}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sound control cluster ── */}
      <div className="absolute right-4 top-[108px] md:top-auto md:right-8 md:bottom-[max(1.4rem,env(safe-area-inset-bottom))] z-20 flex flex-col items-end gap-2.5">
        {showUnmuteHint && (
          <button
            onClick={toggleMute}
            className="hero-enter flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full text-[10px] tracking-[0.14em] uppercase font-ui font-medium transition-all duration-300 hover:scale-[1.04]"
            style={{
              background: "rgba(12,8,6,.55)",
              backdropFilter: "blur(12px)",
              color: "var(--cream)",
              border: "1px solid rgba(224,181,99,.35)",
            }}
          >
            <span className="hero-pulse-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)" }} />
            Aktifkan Suara
          </button>
        )}
        <button
          onClick={toggleMute}
          className={`flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 ${muted ? "w-11 h-11" : "w-11 h-11"}`}
          style={{
            background: muted ? "var(--gold)" : "rgba(12,8,6,.5)",
            backdropFilter: "blur(12px)",
            border: muted ? "none" : "1px solid rgba(248,245,241,.18)",
          }}
          aria-label={muted ? t("unmute") : t("muteLabel")}
        >
          {muted ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(248,245,241,.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Scroll indicator ── */}
      <div className="relative z-10 flex items-center gap-4 mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16 xl:pl-24 pb-7 lg:pb-10">
        {/* Vertical track with animated dot */}
        <div className="relative h-[44px] w-px" style={{ background: "rgba(201,160,99,.28)" }}>
          <span className="scroll-dot absolute left-1/2 -translate-x-1/2 top-0 w-[6px] h-[6px] rounded-full" style={{ background: "var(--gold)", boxShadow: "0 0 10px rgba(224,189,132,.8)" }} />
        </div>
        {/* Label */}
        <span className="text-[10px] sm:text-[11px] tracking-[.26em] leading-tight font-ui" style={{ color: "var(--sand)" }}>
          {t("scroll")}
        </span>
        {/* Arrow */}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
