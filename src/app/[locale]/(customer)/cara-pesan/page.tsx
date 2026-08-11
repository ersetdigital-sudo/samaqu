"use client";

import Image from "next/image";
import Link from "next/link";
import { getWhatsAppLink } from "@/lib/store-settings";
import { useSafeTranslations } from "@/lib/safe-i18n";

export default function CaraPesanPage() {
  const t = useSafeTranslations("caraPesanPage");

  const websiteSteps = [
    { num: "01", title: t("webStep1Title"), desc: t("webStep1Desc") },
    { num: "02", title: t("webStep2Title"), desc: t("webStep2Desc") },
    { num: "03", title: t("webStep3Title"), desc: t("webStep3Desc") },
    { num: "04", title: t("webStep4Title"), desc: t("webStep4Desc") },
    { num: "05", title: t("webStep5Title"), desc: t("webStep5Desc"), accent: true },
  ];

  const whatsappSteps = [
    { num: "01", title: t("waStep1Title"), desc: t("waStep1Desc") },
    { num: "02", title: t("waStep2Title"), desc: t("waStep2Desc") },
    { num: "03", title: t("waStep3Title"), desc: t("waStep3Desc") },
    { num: "04", title: t("waStep4Title"), desc: t("waStep4Desc") },
  ];

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Hero */}
      <div style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-24 pb-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase font-ui mb-5" style={{ color: "var(--gold)" }}>{t("heroEyebrow")}</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.08] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
              {t("heroTitle")} <span className="italic" style={{ color: "var(--gold)" }}>{t("heroTitle") === "Cara Pemesanan" ? "Pemesanan" : "Order"}</span>
            </h1>
            <p className="text-2xl sm:text-3xl mt-4 font-ui" style={{ color: "#d4c4b4", fontFamily: "var(--font-cormorant), Georgia, serif" }}>
              {t("heroSubtitle")}
            </p>
            <p className="mt-6 font-ui leading-relaxed max-w-xl" style={{ color: "#d4c4b4" }}>
              {t("heroDesc")}
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <a href="#website" className="text-center rounded-full px-7 py-3.5 text-sm font-medium font-ui transition-colors hover:opacity-90" style={{ background: "var(--cream)", color: "var(--espresso)" }}>{t("heroCtaWeb")}</a>
              <a href="#whatsapp" className="text-center rounded-full px-7 py-3.5 text-sm font-ui border transition-colors hover:bg-white/10" style={{ borderColor: "rgba(241,233,221,.4)" }}>{t("heroCtaWa")}</a>
            </div>
          </div>
          <div className="relative">
            <Image src="/images/e6311168-b0e0-4586-9209-a2ad19712a37.png" alt="Samaqu Collection" width={800} height={700} className="w-full h-72 sm:h-[26rem] object-cover rounded-2xl" />
            <Image src="/images/d454a908-d0e1-4d2d-a4d7-71c2f0436d2a.png" alt="Fabric detail" width={320} height={384} className="hidden sm:block absolute -bottom-8 -left-8 w-40 h-48 object-cover rounded-xl border-4" style={{ borderColor: "var(--espresso)" }} />
          </div>
        </div>
      </div>

      {/* Two options quick */}
      <div style={{ background: "var(--sand-2)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid sm:grid-cols-2 gap-5">
          <a href="#website" className="rounded-2xl p-6 flex items-start gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white" style={{ border: "1px solid rgba(42,33,27,.08)" }}>
            <span className="text-3xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>01</span>
            <span>
              <span className="block font-medium font-ui" style={{ color: "var(--espresso)" }}>{t("option1Title")}</span>
              <span className="block text-sm font-ui mt-1" style={{ color: "var(--text-secondary)" }}>{t("option1Desc")}</span>
            </span>
          </a>
          <a href="#whatsapp" className="rounded-2xl p-6 flex items-start gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white" style={{ border: "1px solid rgba(42,33,27,.08)" }}>
            <span className="text-3xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>02</span>
            <span>
              <span className="block font-medium font-ui" style={{ color: "var(--espresso)" }}>{t("option2Title")}</span>
              <span className="block text-sm font-ui mt-1" style={{ color: "var(--text-secondary)" }}>{t("option2Desc")}</span>
            </span>
          </a>
        </div>
      </div>

      {/* Website Steps */}
      <section id="website" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16">
          <div className="lg:sticky lg:top-24 self-start">
            <p className="text-xs tracking-[0.3em] uppercase font-ui mb-4" style={{ color: "var(--gold)" }}>{t("webOption")}</p>
            <h2 className="text-3xl sm:text-4xl leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{t("webTitle")}</h2>
            <p className="italic text-xl font-ui mt-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--text-secondary)" }}>{t("webSubtitle")}</p>
            <div className="my-7 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(42,33,27,.25),transparent)" }} />
            <Image src="/images/141ca791-3f39-4055-9409-d945ad3205a4.png" alt="Samaqu Product" width={600} height={400} className="w-full h-56 sm:h-72 object-cover rounded-2xl" />
            <Link href="/katalog" className="mt-7 inline-flex justify-center w-full sm:w-auto rounded-full px-8 py-3.5 text-sm font-medium font-ui text-white transition-colors hover:opacity-90" style={{ background: "var(--espresso)" }}>{t("webCta")}</Link>
          </div>
          <ol className="space-y-7">
            {websiteSteps.map((step) => (
              <li key={step.num} className="relative pl-16">
                <span className="absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center text-lg" style={{ background: step.accent ? "var(--gold)" : "var(--bg-tertiary, #e5d8cb)", color: step.accent ? "white" : "var(--espresso)", fontFamily: "var(--font-cormorant), Georgia, serif" }}>
                  {step.num}
                </span>
                <h3 className="text-lg font-medium font-ui" style={{ color: "var(--espresso)" }}>{step.title}</h3>
                <p className="font-ui mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WhatsApp Steps */}
      <section id="whatsapp" className="py-16 sm:py-24 scroll-mt-20" style={{ background: "var(--sand-2)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs tracking-[0.3em] uppercase font-ui mb-4" style={{ color: "var(--gold)" }}>{t("waOption")}</p>
            <h2 className="text-3xl sm:text-4xl leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{t("waTitle")}</h2>
            <p className="italic text-xl font-ui mt-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--text-secondary)" }}>{t("waSubtitle")}</p>
            <p className="mt-5 font-ui leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t("waDesc")}</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whatsappSteps.map((step) => (
              <div key={step.num} className="rounded-2xl p-6 bg-white" style={{ border: "1px solid rgba(42,33,27,.08)" }}>
                <span className="text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>{step.num}</span>
                <h3 className="font-medium font-ui mt-3" style={{ color: "var(--espresso)" }}>{step.title}</h3>
                <p className="text-sm font-ui mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.desc}</p>
              </div>
            ))}
          </div>
          <a href={getWhatsAppLink("Halo Admin SAMAQU, saya ingin bertanya soal pemesanan.")} target="_blank" rel="noopener"
            className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium font-ui text-white transition-colors hover:opacity-90"
            style={{ background: "var(--espresso)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5 0-2.4-.3-4.6-2.4-2.2-2.1-2.6-3.9-2.7-4.4-.1-.5.4-1.6 1-1.9.2-.1.5-.1.7 0l.9 1.7c.1.2 0 .5-.1.7l-.4.5c-.1.2-.2.4 0 .7.2.4.8 1.2 1.4 1.7.7.6 1.4.9 1.7 1 .2.1.4 0 .6-.2l.5-.6c.2-.2.4-.3.7-.2l1.6.8c.3.1.4.6.3 1.1Z" /></svg>
            {t("waCta")}
          </a>
        </div>
      </section>

      {/* Ukuran */}
      <section id="ukuran" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Image src="/images/45a87b19-8c07-4762-8169-11b4afb305f0.png" alt="Samaqu Size Guide" width={800} height={600} className="w-full h-72 sm:h-[24rem] object-cover rounded-2xl order-last lg:order-first" />
          <div>
            <h2 className="text-3xl sm:text-4xl leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{t("sizeTitle")}</h2>
            <p className="italic text-xl font-ui mt-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--text-secondary)" }}>{t("sizeSubtitle")}</p>
            <p className="mt-5 font-ui leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t("sizeDesc")}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/panduan-ukuran" className="text-center rounded-full px-7 py-3.5 text-sm font-medium font-ui text-white transition-colors hover:opacity-90" style={{ background: "var(--espresso)" }}>{t("sizeCtaGuide")}</Link>
              <a href={getWhatsAppLink("Halo Admin SAMAQU, saya butuh bantuan menentukan ukuran.")} target="_blank" rel="noopener" className="text-center rounded-full px-7 py-3.5 text-sm font-ui border transition-colors hover:bg-[var(--bg-tertiary, #e5d8cb)]" style={{ borderColor: "rgba(42,33,27,.25)", color: "var(--espresso)" }}>{t("sizeCtaAdmin")}</a>
            </div>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="py-16 sm:py-24 text-center" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <h2 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            {t("closingTitle")} <span className="italic" style={{ color: "var(--gold)" }}>{t("closingTitle").includes("Dibantu") ? "Dibantu" : "Help"}</span>.
          </h2>
          <p className="mt-6 font-ui leading-relaxed" style={{ color: "#d4c4b4" }}>{t("closingDesc")}</p>
          <p className="italic text-2xl mt-6" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>{t("closingTagline")}</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/katalog" className="rounded-full px-8 py-3.5 text-sm font-medium font-ui transition-colors hover:opacity-90" style={{ background: "var(--cream)", color: "var(--espresso)" }}>{t("closingCtaWeb")}</Link>
            <a href={getWhatsAppLink("Halo Admin SAMAQU, saya butuh bantuan.")} target="_blank" rel="noopener" className="rounded-full px-8 py-3.5 text-sm font-ui border transition-colors hover:bg-white/10" style={{ borderColor: "rgba(241,233,221,.4)" }}>{t("closingCtaWa")}</a>
          </div>
        </div>
      </section>
    </section>
  );
}
