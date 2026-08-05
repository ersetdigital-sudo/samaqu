"use client";

import { useSafeTranslations } from "@/lib/safe-i18n";

/* ── SVG Icons ── */
function BookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="#A9793F" strokeWidth="1.4">
      <path d="M8 12c6-3 12-3 16 1 4-4 10-4 16-1v24c-6-3-12-3-16 1-4-4-10-4-16-1Z" />
      <path d="M24 13v24" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="#A9793F" strokeWidth="1.4">
      <circle cx="24" cy="24" r="14" />
      <path d="M24 14v10l7 4" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="#A9793F" strokeWidth="1.4">
      <path d="M10 34V14a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4Z" />
      <path d="M16 20h16M16 27h10" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="#A9793F" strokeWidth="1.4">
      <path d="M24 8l4 8 9 1-6.5 6.3L32 32l-8-4-8 4 1.5-8.7L11 17l9-1Z" />
    </svg>
  );
}

function PrayIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="#A9793F" strokeWidth="1.4">
      <path d="M14 38V22a10 10 0 0 1 20 0v16" />
      <path d="M10 38h28" />
      <path d="M24 12V6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="#A9793F" strokeWidth="1.4">
      <path d="M24 37s-13-7.6-13-16a7 7 0 0 1 13-3.6A7 7 0 0 1 37 21c0 8.4-13 16-13 16Z" />
    </svg>
  );
}

/* ── Value Icons ── */
function DesignIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto" fill="none" stroke="#A9793F" strokeWidth="1.3">
      <circle cx="24" cy="24" r="16" />
      <path d="M24 8c6 6 6 26 0 32-6-6-6-26 0-32ZM8 24h32" />
    </svg>
  );
}

function QualityIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto" fill="none" stroke="#A9793F" strokeWidth="1.3">
      <path d="M12 18 24 10l12 8v18l-12 6-12-6Z" />
      <path d="M12 18l12 8 12-8M24 26v18" />
    </svg>
  );
}

function DetailIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto" fill="none" stroke="#A9793F" strokeWidth="1.3">
      <path d="M10 34c6-16 22-22 28-22-2 12-10 24-24 26Z" />
      <path d="M10 38c4-8 10-12 16-14" />
    </svg>
  );
}

function BenefitIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto" fill="none" stroke="#A9793F" strokeWidth="1.3">
      <path d="M24 38s-12-7-12-15a6 6 0 0 1 12-3 6 6 0 0 1 12 3c0 8-12 15-12 15Z" />
      <path d="M6 12l4 4M42 12l-4 4" />
    </svg>
  );
}

const MAKNA_ITEMS = [
  { Icon: BookIcon, idKey: "read", enKey: "readEn" },
  { Icon: ClockIcon, idKey: "memorize", enKey: "memorizeEn" },
  { Icon: DocumentIcon, idKey: "study", enKey: "studyEn" },
  { Icon: StarIcon, idKey: "teach", enKey: "teachEn" },
  { Icon: PrayIcon, idKey: "practice", enKey: "practiceEn" },
  { Icon: HeartIcon, idKey: "love", enKey: "loveEn" },
];

const VALUE_ITEMS = [
  { Icon: DesignIcon, idKey: "design", enKey: "designEn" },
  { Icon: QualityIcon, idKey: "quality", enKey: "qualityEn" },
  { Icon: DetailIcon, idKey: "detail", enKey: "detailEn" },
  { Icon: BenefitIcon, idKey: "benefit", enKey: "benefitEn" },
];

export default function SamaQuran() {
  const t = useSafeTranslations("samaQuran");

  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "#1E150E" }}>
        {/* Background SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="gWarm" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#1B120B" />
              <stop offset="55%" stopColor="#4A3016" />
              <stop offset="100%" stopColor="#C08A3E" />
            </linearGradient>
            <radialGradient id="gGlow" cx="72%" cy="28%" r="45%">
              <stop offset="0%" stopColor="#F4C77A" stopOpacity=".8" />
              <stop offset="100%" stopColor="#F4C77A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="600" fill="url(#gWarm)" />
          <rect width="800" height="600" fill="url(#gGlow)" />
          <g opacity=".22" stroke="#F4C77A" fill="none" strokeWidth="1">
            <circle cx="640" cy="180" r="120" />
            <circle cx="640" cy="180" r="88" />
            <circle cx="640" cy="180" r="56" />
          </g>
          <g opacity=".5" fill="#F4C77A">
            <circle cx="120" cy="120" r="2" />
            <circle cx="210" cy="70" r="1.5" />
            <circle cx="300" cy="150" r="1.8" />
            <circle cx="700" cy="420" r="2" />
            <circle cx="90" cy="330" r="1.5" />
          </g>
        </svg>

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24 md:py-28 grid md:grid-cols-2 gap-10 md:gap-8 items-center">
          <div className="text-center md:text-left order-2 md:order-1">
            <p className="text-white/60 tracking-[.35em] text-[11px] mb-4">SAMAQU</p>
            <h1 className="font-display text-[#F6E9D2] text-4xl sm:text-6xl md:text-7xl leading-[1.05]">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 md:max-w-md mx-auto md:mx-0 text-[#EBD9BC]/85 text-base sm:text-lg leading-relaxed">
              {t("heroDesc")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
              <a href="#makna" className="px-6 py-3 rounded-full bg-[#F6E9D2] text-[#2B2118] text-sm hover:bg-white transition">
                {t("heroCta1")}
              </a>
              <a href="#kontak" className="px-6 py-3 rounded-full border border-[#F6E9D2]/40 text-[#F6E9D2] text-sm hover:bg-[#F6E9D2]/10 transition">
                {t("heroCta2")}
              </a>
            </div>
          </div>

          {/* Quran Illustration */}
          <div className="order-1 md:order-2 w-full max-w-sm sm:max-w-md mx-auto">
            <svg viewBox="0 0 520 460" className="w-full h-auto" role="img" aria-label="Ilustrasi Al-Qur'an terbuka di atas rehal">
              <defs>
                <radialGradient id="qGlow" cx="50%" cy="38%" r="52%">
                  <stop offset="0%" stopColor="#F6D79A" stopOpacity=".55" />
                  <stop offset="100%" stopColor="#F6D79A" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="pageL" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F7EAD1" />
                  <stop offset="100%" stopColor="#E4CFA6" />
                </linearGradient>
                <linearGradient id="pageR" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="#F7EAD1" />
                  <stop offset="100%" stopColor="#E4CFA6" />
                </linearGradient>
                <linearGradient id="cover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5C3A1B" />
                  <stop offset="100%" stopColor="#2B1A0C" />
                </linearGradient>
                <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7A4E24" />
                  <stop offset="100%" stopColor="#3B2410" />
                </linearGradient>
              </defs>

              <circle cx="260" cy="200" r="220" fill="url(#qGlow)" />

              {/* Decorative arch */}
              <g opacity=".45" fill="none" stroke="#F4C77A" strokeWidth="1.5">
                <path d="M150 250V140a110 110 0 0 1 220 0v110" />
                <path d="M172 250V148a88 88 0 0 1 176 0v102" />
              </g>

              {/* Rehal (stand) */}
              <g stroke="#1F1308" strokeWidth="2">
                <path d="M110 300 L260 372 L410 300 L410 322 L260 396 L110 322 Z" fill="url(#wood)" />
                <path d="M186 330 L260 366 L334 330 L334 430 L260 462 L186 430 Z" fill="#4A2E14" opacity=".85" />
              </g>

              {/* Book covers */}
              <path d="M260 268 C210 234 150 226 96 232 L96 306 C150 300 210 308 260 340 Z" fill="url(#cover)" stroke="#C08A3E" strokeWidth="2" />
              <path d="M260 268 C310 234 370 226 424 232 L424 306 C370 300 310 308 260 340 Z" fill="url(#cover)" stroke="#C08A3E" strokeWidth="2" />

              {/* Pages */}
              <path d="M258 262 C210 226 152 218 102 224 L102 296 C152 290 212 298 258 330 Z" fill="url(#pageL)" />
              <path d="M262 262 C310 226 368 218 418 224 L418 296 C368 290 308 298 262 330 Z" fill="url(#pageR)" />

              {/* Text lines */}
              <g stroke="#8A5F2C" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round">
                <path d="M124 246h110M124 262h110M124 278h110M124 294h84" />
                <path d="M286 246h110M286 262h110M286 278h110M328 294h68" />
              </g>

              {/* Ornamental frame */}
              <g fill="none" stroke="#C08A3E" strokeOpacity=".65">
                <path d="M114 236c46-4 96 2 136 28v66c-40-26-90-32-136-28Z" />
                <path d="M406 236c-46-4-96 2-136 28v66c40-26 90-32 136-28Z" />
              </g>

              {/* Spine + bookmark */}
              <path d="M258 262 L262 262 L262 330 L258 330 Z" fill="#8A5F2C" />
              <path d="M256 330 L264 330 L264 392 L260 380 L256 392 Z" fill="#C0452F" />

              {/* Floating particles */}
              <g fill="#F6D79A" opacity=".75">
                <circle cx="150" cy="110" r="3" />
                <circle cx="380" cy="96" r="2.4" />
                <circle cx="432" cy="170" r="2" />
                <circle cx="92" cy="180" r="2" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* ── MAKNA ── */}
      <section id="makna" className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="text-stone text-sm sm:text-base">{t("maknaIntro")}</p>
          <h2 className="font-display text-4xl sm:text-5xl text-gold mt-3">{t("maknaTitle")}</h2>
          <p className="mt-7 text-stone leading-relaxed">{t("maknaDesc1")}</p>
          <p className="mt-4 text-gold leading-relaxed">{t("maknaDesc2")}</p>
        </div>

        <div className="mx-auto max-w-5xl px-5 mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {MAKNA_ITEMS.map((item) => (
            <div key={item.idKey} className="flex flex-col items-center text-center gap-3">
              <item.Icon />
              <span className="text-xs text-stone">{t(`makna.${item.idKey}`)}</span>
            </div>
          ))}
        </div>

        <p className="mx-auto max-w-xl px-5 mt-14 text-center text-stone leading-relaxed">
          {t("maknaClosing")}
        </p>
      </section>

      {/* ── PERJALANAN ── */}
      <section id="perjalanan" className="py-16 sm:py-24" style={{ background: "var(--cream-2, #EFE6D9)" }}>
        <div className="mx-auto max-w-6xl px-5 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2
              className="font-display text-3xl sm:text-4xl leading-snug"
              dangerouslySetInnerHTML={{ __html: t("perjalananTitle") }}
            />
            <div className="mt-7 space-y-4 text-stone leading-relaxed">
              <p>{t("perjalananDesc1")}</p>
              <p>{t("perjalananDesc2")}</p>
              <p>{t("perjalananDesc3")}</p>
            </div>
            <blockquote className="mt-8 rounded-xl p-6 leading-relaxed" style={{ background: "#241A12", color: "#EBD9BC" }}>
              <svg viewBox="0 0 24 24" className="w-6 h-6 mb-3 fill-[#C08A3E]">
                <path d="M7 7h4v5a5 5 0 0 1-5 5V15a3 3 0 0 0 3-3H7Zm9 0h4v5a5 5 0 0 1-5 5v-2a3 3 0 0 0 3-3h-2Z" />
              </svg>
              {t("perjalananQuote")}
            </blockquote>
          </div>
          <div>
            <svg viewBox="0 0 480 560" className="w-full h-auto rounded-2xl shadow-lg" role="img" aria-label="Ilustrasi seseorang duduk membaca di bawah cahaya jendela">
              <defs>
                <linearGradient id="room" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A2716" />
                  <stop offset="100%" stopColor="#14100C" />
                </linearGradient>
                <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F6D79A" stopOpacity=".75" />
                  <stop offset="100%" stopColor="#F6D79A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width="480" height="560" fill="url(#room)" />
              <g>
                <path d="M300 60h120v250H300Z" fill="#F3D9A5" opacity=".9" />
                <path d="M360 60v250M300 150h120M300 230h120" stroke="#2A1B10" strokeWidth="6" />
                <path d="M300 60h120a60 60 0 0 0-120 0Z" fill="#F3D9A5" />
              </g>
              <path d="M300 60 L420 60 L470 470 L150 470 Z" fill="url(#beam)" />
              <g fill="#0E0A07">
                <ellipse cx="200" cy="470" rx="120" ry="18" opacity=".7" />
                <path d="M170 470c-6-40 2-80 12-104 6-14 20-22 34-20 16 2 26 14 26 30 0 26-10 60-6 94Z" />
                <circle cx="212" cy="322" r="26" />
                <path d="M186 340c-14 8-22 24-24 44l60-8Z" />
              </g>
              <g opacity=".6" fill="#F6D79A">
                <circle cx="120" cy="200" r="2" />
                <circle cx="90" cy="300" r="1.6" />
                <circle cx="260" cy="160" r="1.8" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* ── HIDUP SAMA QURAN ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-gold leading-snug">{t("hidupTitle")}</h2>
          <p className="mt-6 text-stone leading-relaxed">{t("hidupDesc1")}</p>
          <p className="mt-4 text-stone/90 text-sm leading-relaxed">{t("hidupDesc2")}</p>
          <p className="mt-8 leading-relaxed" style={{ color: "var(--brown, #6B4A2F)" }}>{t("hidupDesc3")}</p>
        </div>

        <div id="nilai" className="mx-auto max-w-4xl px-5 mt-14 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {VALUE_ITEMS.map((item) => (
            <div key={item.idKey} className="text-center">
              <item.Icon />
              <p
                className="mt-3 text-xs text-stone leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t(`values.${item.idKey}`) }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="kontak" className="relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#241A12" />
              <stop offset="60%" stopColor="#4A3016" />
              <stop offset="100%" stopColor="#8A5F2C" />
            </linearGradient>
          </defs>
          <rect width="800" height="400" fill="url(#g2)" />
          <g opacity=".25" stroke="#F4C77A" fill="none">
            <circle cx="120" cy="80" r="60" />
            <circle cx="700" cy="330" r="90" />
          </g>
        </svg>
        <div className="relative mx-auto max-w-3xl px-5 py-20 sm:py-24 text-center">
          <p className="font-display text-2xl tracking-[.3em] text-[#F6E9D2]">SAMAQU</p>
          <h2 className="font-display text-3xl sm:text-4xl text-[#E7BE7C] mt-4">{t("ctaTitle")}</h2>
          <p className="mt-4 text-[#EBD9BC]/80">{t("ctaDesc")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="mailto:halo@samaqu.id" className="px-6 py-3 rounded-full bg-[#F6E9D2] text-[#2B2118] text-sm hover:bg-white transition">
              halo@samaqu.id
            </a>
            <a href="#top" className="px-6 py-3 rounded-full border border-[#F6E9D2]/40 text-[#F6E9D2] text-sm hover:bg-[#F6E9D2]/10 transition">
              {t("ctaBack")}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
