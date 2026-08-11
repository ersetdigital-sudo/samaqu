"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSafeTranslations } from "@/lib/safe-i18n";

export default function CreateYourPricePage() {
  const t = useSafeTranslations("createYourPrice");
  const [price, setPrice] = useState(300000);
  const minPrice = 300000;
  const maxPrice = 500000;

  const fmt = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
  const pct = ((price - minPrice) / (maxPrice - minPrice)) * 100;

  const priceNote = price === minPrice ? t("simNoteMin") : t("simNoteAbove");

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "var(--espresso)" }}>
        <Image
          src="/images/e6311168-b0e0-4586-9209-a2ad19712a37.png"
          alt=""
          fill
          className="object-cover opacity-25"
          priority
        />
        <div className="relative mx-auto max-w-4xl px-5 py-20 sm:py-28 text-center" style={{ color: "var(--cream)" }}>
          <p className="text-[11px] sm:text-xs tracking-[0.35em] uppercase font-ui" style={{ color: "var(--gold)" }}>SAMAQU</p>
          <h1 className="mt-5 text-5xl sm:text-7xl leading-[1.05] font-light" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            Create Your <em className="italic" style={{ color: "var(--gold)" }}>Price</em>
          </h1>
          <p className="mt-6 text-lg sm:text-xl font-ui" style={{ color: "#d4c4b4" }}>{t("heroSubtitle")}</p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#simulasi" className="rounded-full px-7 py-3.5 text-sm font-medium font-ui text-white" style={{ background: "var(--gold)" }}>{t("heroBtn1")}</a>
            <a href="#cerita" className="rounded-full px-7 py-3.5 text-sm font-medium font-ui border" style={{ borderColor: "rgba(241,233,221,.35)", color: "var(--cream)" }}>{t("heroBtn2")}</a>
          </div>
        </div>
      </div>

      {/* Cerita */}
      <section id="cerita" className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-3xl sm:text-4xl leading-snug" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            {t("storyTitle")}
          </h2>
          <div className="my-8 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(42,33,27,.25),transparent)" }} />
          <div className="space-y-5 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
            <p>{t("storyP1")}</p>
            <p>{t("storyP2")}</p>
          </div>
        </div>
      </section>

      {/* Aksesibilitas */}
      <section className="py-16 sm:py-24" style={{ background: "var(--sand-2)" }}>
        <div className="mx-auto max-w-6xl px-5 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              {t("accessTitle")}
            </h2>
            <div className="mt-6 space-y-4 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
              <p>{t("accessP1")}</p>
              <p>{t("accessP2")}</p>
              <p>{t("accessP3")}</p>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <Image
              src="/images/141ca791-3f39-4055-9409-d945ad3205a4.png"
              alt="Produk Samaqu"
              width={800}
              height={1000}
              className="w-full h-full object-cover aspect-[4/3] lg:aspect-[4/5]"
            />
          </div>
        </div>
      </section>

      {/* Cara kerja + simulasi */}
      <section id="simulasi" className="py-16 sm:py-24 scroll-mt-24">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center">
            <p className="text-[11px] tracking-[0.3em] uppercase font-ui" style={{ color: "var(--gold)" }}>{t("howEyebrow")}</p>
            <h2 className="mt-4 text-3xl sm:text-5xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              {t("howTitle")}
            </h2>
            <p className="mt-4 text-lg font-ui" style={{ color: "var(--text-secondary)" }}>{t("howSubtitle")}</p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { num: "01", title: t("step1Title"), desc: t("step1Desc") },
              { num: "02", title: t("step2Title"), desc: t("step2Desc") },
              { num: "03", title: t("step3Title"), desc: t("step3Desc") },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl p-6 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ border: "1px solid rgba(42,33,27,.1)" }}>
                <div className="text-3xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>{step.num}</div>
                <h3 className="mt-3 font-semibold text-lg font-ui" style={{ color: "var(--espresso)" }}>{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Slider simulasi */}
          <div className="mt-12 rounded-3xl p-6 sm:p-10" style={{ background: "var(--bg-tertiary, #e5d8cb)", border: "1px solid rgba(42,33,27,.1)" }}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs tracking-[0.2em] uppercase font-ui" style={{ color: "var(--text-muted)" }}>{t("simLabel")}</p>
                <h3 className="text-2xl sm:text-3xl mt-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{t("simTitle")}</h3>
              </div>
              <div className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none whitespace-nowrap tabular-nums font-ui" style={{ color: "var(--gold)" }}>
                {fmt(price)}
              </div>
            </div>

            <div className="mt-7 px-[14px]">
              <div className="flex justify-between">
                {[0,1,2,3,4].map(i => <span key={i} className="block w-px h-2" style={{ background: "rgba(42,33,27,.2)" }} />)}
              </div>
            </div>

            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              step={10000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-2 w-full"
              style={{
                background: `linear-gradient(90deg, var(--gold) 0%, var(--gold) ${pct}%, rgba(42,33,27,.14) ${pct}%, rgba(42,33,27,.14) 100%)`,
              }}
            />

            <div className="mt-6 sm:mt-7 flex justify-between gap-3 text-[11px] sm:text-xs tabular-nums font-ui" style={{ color: "var(--text-muted)" }}>
              <span>{fmt(minPrice)} (min)</span>
              <span>{fmt(maxPrice)}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {[300000, 320000, 350000].map((p) => (
                <button
                  key={p}
                  onClick={() => setPrice(p)}
                  className="rounded-full px-4 py-2 text-sm font-ui transition-all"
                  style={{
                    background: price === p ? "var(--gold)" : "white",
                    color: price === p ? "white" : "var(--espresso)",
                    border: `1px solid ${price === p ? "var(--gold)" : "rgba(42,33,27,.15)"}`,
                  }}
                >
                  {fmt(p)}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
              {priceNote}
            </p>
          </div>
        </div>
      </section>

      {/* Boleh pilih minimum */}
      <section className="py-16 sm:py-24" style={{ background: "var(--sand-2)" }}>
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl sm:text-5xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            {t("minTitle")}
          </h2>
          <p className="italic text-2xl sm:text-3xl mt-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
            {t("minAnswer")}
          </p>
          <div className="mt-6 space-y-4 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
            <p>{t("minP1")}</p>
            <p>{t("minP2")}</p>
          </div>
        </div>
      </section>

      {/* Bukan diskon */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1 rounded-2xl overflow-hidden">
            <Image
              src="/images/5d744c19-2ea0-411e-b002-bfc4b6cb3d08.png"
              alt="Produk Samaqu"
              width={800}
              height={800}
              className="w-full object-cover aspect-[4/3] lg:aspect-square"
            />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              {t("notDiscountTitle")}
            </h2>
            <div className="mt-6 space-y-4 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
              <p>{t("notDiscountP1")}</p>
              <p>{t("notDiscountP2")}</p>
              <p>{t("notDiscountP3")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="py-20 sm:py-28" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="text-3xl sm:text-5xl leading-snug font-light" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            {t("closingText")}
          </p>
          <p className="mt-8 text-sm tracking-[0.25em] uppercase font-ui" style={{ color: "var(--gold)" }}>{t("closingCta")}</p>
          <Link href="/katalog" className="mt-9 inline-block rounded-full px-8 py-4 text-sm font-medium font-ui text-white" style={{ background: "var(--gold)" }}>
            {t("closingBtn")}
          </Link>
        </div>
      </section>
    </section>
  );
}
