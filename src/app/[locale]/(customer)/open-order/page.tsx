"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useSafeTranslations } from "@/lib/safe-i18n";
import OpenOrderForm from "@/components/OpenOrderForm";
import OpenOrderProducts from "@/components/OpenOrderProducts";

export default function OpenOrderPage() {
  const t = useSafeTranslations("openOrder");

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Hero — halaman ini tampil tanpa navbar supaya fokus ke form open order */}
      <div className="relative overflow-hidden" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 85% at 50% -15%, rgba(181,140,74,.3), transparent 62%)" }}
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-5 pt-6 sm:px-8">
          <Link href="/" aria-label="SAMAQU" className="inline-flex items-center">
            <img src="/logo.svg" alt="SAMAQU" className="h-8 w-auto sm:h-9" style={{ filter: "invert(1) brightness(.95)" }} />
          </Link>
          <Link
            href="/"
            aria-label={t("backHome")}
            className="grid h-10 w-10 place-items-center rounded-full transition-colors duration-200 hover:bg-white/10"
            style={{ border: "1px solid rgba(248,245,241,.22)" }}
          >
            <X size={17} />
          </Link>
        </div>
        <div className="relative mx-auto max-w-4xl px-5 pt-14 pb-20 sm:pt-16 sm:pb-24 text-center">
          <p className="text-[11px] sm:text-xs tracking-[0.35em] uppercase font-ui" style={{ color: "var(--gold)" }}>{t("heroEyebrow")}</p>
          <h1 className="mt-5 text-4xl sm:text-6xl leading-[1.08] font-light" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            {t("heroTitle")} <em className="italic" style={{ color: "var(--gold)" }}>{t("heroAccent")}</em>
          </h1>
          <p className="mt-5 text-base sm:text-lg font-ui" style={{ color: "#d4c4b4" }}>{t("heroSubtitle")}</p>
          <div className="mt-8 mx-auto max-w-xl rounded-2xl px-5 py-4 text-left" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(241,233,221,.2)" }}>
            <p className="text-[11px] tracking-[0.2em] uppercase font-ui" style={{ color: "var(--gold)" }}>{t("noticeTitle")}</p>
            <p className="mt-2 text-sm font-ui leading-relaxed" style={{ color: "#d4c4b4" }}>{t("noticeText")}</p>
          </div>
        </div>
      </div>

      {/* Daftar harga */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{t("priceTitle")}</h2>
          <p className="mt-3 font-ui" style={{ color: "var(--text-secondary)" }}>{t("priceSubtitle")}</p>

          <div className="mt-9">
            <OpenOrderProducts />
          </div>
        </div>
      </section>

      {/* Form pesanan */}
      <section className="pb-14 sm:pb-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{t("formTitle")}</h2>
          <p className="mt-3 font-ui" style={{ color: "var(--text-secondary)" }}>{t("formSubtitle")}</p>
          <div className="mt-8">
            <OpenOrderForm />
          </div>
        </div>
      </section>

      {/* Cara order */}
      <section className="py-14 sm:py-20" style={{ background: "var(--sand-2)" }}>
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{t("stepsTitle")}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[t("step1"), t("step2"), t("step3"), t("step4")].map((step, index) => (
              <div key={index} className="rounded-[24px] bg-white p-6 transition-transform duration-300 hover:-translate-y-1" style={{ border: "1px solid rgba(42,33,27,.07)" }}>
                <span
                  className="grid h-10 w-10 place-items-center rounded-full text-lg"
                  style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)", border: "1px solid rgba(181,140,74,.35)", background: "rgba(181,140,74,.06)" }}
                >
                  {index + 1}
                </span>
                <p className="mt-4 text-sm font-ui leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
