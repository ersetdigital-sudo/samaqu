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

      {/* ── Vertical side label (desktop) ── */}
      <div
        className="hidden xl:flex absolute left-8 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-5"
        aria-hidden
      >
        <span className="w-px h-16" style={{ background: "linear-gradient(180deg,transparent,rgba(224,181,99,.6))" }} />
        <span
          className="text-[10px] tracking-[0.42em] uppercase"
          style={{ writingMode: "vertical-rl", color: "rgba(216,196,168,.55)" }}
        >
          SAMAQU — {t("eyebrow")}
        </span>
        <span className="w-px h-16" style={{ background: "linear-gradient(180deg,rgba(224,181,99,.6),transparent)" }} />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 h-full">
        <div
          className="max-w-[1240px] mx-auto px-5 sm:px-10 lg:px-16 xl:pl-24 flex flex-col justify-end pt-[96px] sm:pt-[110px] lg:pt-[130px] pb-24 lg:pb-28"
          style={{ minHeight: "100dvh" }}
        >
          <div className="w-full max-w-[500px] lg:w-[44vw] lg:max-w-[560px]">
            {/* Eyebrow */}
            <p
              data-hero-stagger
              className="hero-enter self-start flex items-center gap-2.5 md:gap-3.5 rounded-full px-3.5 py-2 md:px-0 md:py-0 md:rounded-none text-[9px] md:text-[10.5px] tracking-[0.3em] md:tracking-[0.4em] uppercase mb-6 md:mb-8 bg-[rgba(10,7,5,.52)] md:bg-transparent backdrop-blur-md md:backdrop-blur-0 border border-[rgba(224,181,99,.28)] md:border-0"
              style={{ color: "var(--sand)" }}
            >
              <span className="hero-pulse-dot w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--gold)" }} />
              <span className="hidden md:block w-9 h-px" style={{ background: "linear-gradient(90deg,var(--gold),transparent)" }} />
              {t("eyebrow")}
            </p>

            {/* Display title — line mask reveal */}
            <h1 className="mb-6 md:mb-7">
              <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                <span
                  data-hero-stagger
                  className="hero-mask hero-title-shadow block font-medium tracking-[-0.015em] leading-[1.05] text-[clamp(2.55rem,11.8vw,4.1rem)]"
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    color: heroData.title_line1_color,
                  }}
                >
                  {t("title1")}
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.1em] -mb-[0.06em]">
                <span
                  data-hero-stagger
                  className="hero-mask hero-title-shadow block font-medium italic tracking-[-0.01em] leading-[1.06] text-[clamp(2.55rem,11.8vw,4.1rem)]"
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    color: heroData.title_line2_color,
                  }}
                >
                  {t("title2")}
                </span>
              </span>
            </h1>

            {/* Description */}
            <p
              data-hero-stagger
              className="hero-enter text-[13px] md:text-[15px] leading-[1.7] md:leading-[1.75] max-w-md mb-6 md:mb-9"
              style={{ color: "rgba(248,245,241,.9)" }}
            >
              {t("desc")}
            </p>

            {/* Features — mobile: glass chips / desktop: minimal list */}
            <ul
              data-hero-stagger
              className="hero-enter flex flex-wrap gap-2 md:gap-x-8 md:gap-y-2 mb-8 md:mb-11 text-[11px] md:text-[13px]"
              style={{ color: "rgba(248,245,241,.9)" }}
            >
              {[t("feature1"), t("feature2"), t("feature3")].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 rounded-full px-3.5 py-2 md:px-0 md:py-0 bg-[rgba(10,7,5,.45)] md:bg-transparent backdrop-blur-md md:backdrop-blur-0 border border-[rgba(248,245,241,.12)] md:border-0"
                >
                  <svg
                    className="shrink-0"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div data-hero-stagger className="hero-enter flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-7">
              <a
                href="/katalog"
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full px-8 sm:px-9 py-4 sm:py-[1.15rem] text-[11px] sm:text-[11.5px] tracking-[0.2em] uppercase font-ui font-semibold w-full sm:w-auto transition active:scale-[0.97]"
                style={{ background: "var(--gold)", color: "#1c140d", boxShadow: "0 18px 44px -14px rgba(224,181,99,.5)" }}
              >
                <span
                  className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ background: "#f2d9a4" }}
                  aria-hidden
                />
                <span className="relative">{t("cta1")}</span>
                <svg
                  className="relative transition-transform duration-500 group-hover:translate-x-1.5"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>

              {/* Secondary CTA — mobile: ghost glass button */}
              <a
                href={getWhatsAppLink(t("whatsappMsg"))}
                target="_blank"
                rel="noopener"
                onClick={() => trackWhatsAppClick("hero")}
                className="sm:hidden group inline-flex items-center justify-center gap-2.5 w-full rounded-full px-8 py-4 text-[11px] tracking-[0.2em] uppercase transition active:scale-[0.97]"
                style={{
                  color: "var(--cream)",
                  background: "rgba(10,7,5,.42)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(248,245,241,.22)",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                {t("cta2")}
              </a>

              {/* Secondary CTA — desktop: underline text link */}
              <a
                href={getWhatsAppLink(t("whatsappMsg"))}
                target="_blank"
                rel="noopener"
                onClick={() => trackWhatsAppClick("hero")}
                className="hidden sm:inline-flex group items-center gap-3 py-1 text-[11.5px] tracking-[0.2em] uppercase transition"
                style={{ color: "var(--cream)" }}
              >
                {t("cta2")}
                <span className="relative block h-px w-8 overflow-hidden">
                  <span
                    className="absolute inset-0 origin-left scale-x-100 group-hover:scale-x-0 transition-transform duration-[400ms]"
                    style={{ background: "rgba(248,245,241,.5)" }}
                  />
                  <span
                    className="absolute inset-0 origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-[400ms] delay-100"
                    style={{ background: "var(--gold)" }}
                  />
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sound control cluster — mobile: top-right (clear of WA float), desktop: bottom-right ── */}
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

      {/* ── Scroll indicator (desktop) ── */}
      <a
        href="#cara-pesan"
        className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2.5 group"
      >
        <span className="text-[9.5px] tracking-[0.38em] uppercase" style={{ color: "rgba(248,245,241,.6)" }}>
          {t("scroll")}
        </span>
        <span
          className="w-[26px] h-[42px] rounded-full border flex items-start justify-center p-[7px]"
          style={{ borderColor: "rgba(248,245,241,.3)" }}
        >
          <span className="scroll-dot w-[3px] h-2 rounded-full" style={{ background: "var(--gold)" }} />
        </span>
      </a>
    </section>
  );
}
