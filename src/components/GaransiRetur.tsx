"use client";

import { useSafeTranslations } from "@/lib/safe-i18n";
import { getWhatsAppLink } from "@/lib/store-settings";

/* ── Check Icon ── */
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12.5 10 17l9-9" />
    </svg>
  );
}

/* ── Warning Icon ── */
function WarningIcon() {
  return (
    <span className="shrink-0 w-7 h-7 rounded-full border border-gold text-gold grid place-items-center text-sm font-medium">
      !
    </span>
  );
}

/* ── Guarantee Card ── */
function GuaranteeCard({
  title,
  desc,
  note,
  isWarning,
}: {
  title: string;
  desc: string;
  note?: string;
  isWarning?: boolean;
}) {
  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-start gap-3">
        {isWarning ? (
          <WarningIcon />
        ) : (
          <span className="shrink-0 w-7 h-7 rounded-full bg-green text-white grid place-items-center">
            <CheckIcon />
          </span>
        )}
        <h3 className="font-medium text-lg text-espresso">{title}</h3>
      </div>
      <p className="mt-3 text-[14.5px] text-stone leading-relaxed">{desc}</p>
      {note && <p className="mt-3 text-[13px] text-gold">{note}</p>}
    </div>
  );
}

/* ── Return Policy Item ── */
function ReturnPolicyItem({ icon, desc }: { icon: React.ReactNode; desc: string }) {
  return (
    <div className="text-center bg-white/60 rounded-2xl p-5 border border-gold/20">
      <span className="mx-auto w-11 h-11 rounded-full bg-sand/70 text-gold grid place-items-center">
        {icon}
      </span>
      <p className="mt-3 text-[13.5px] text-stone">{desc}</p>
    </div>
  );
}

/* ── Step Item ── */
function StepItem({ num, desc }: { num: number; desc: string }) {
  return (
    <li className="flex gap-4 card rounded-2xl p-5">
      <span className="font-display text-2xl text-gold w-8 shrink-0">{num}</span>
      <p className="text-[15px] text-stone">{desc}</p>
    </li>
  );
}

/* ── Non-Returnable Item ── */
function NonReturnableItem({ icon, desc }: { icon: React.ReactNode; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/12 p-5 text-center">
      <span className="mx-auto mb-3 w-10 h-10 rounded-full border border-gold/40 text-gold grid place-items-center">
        {icon}
      </span>
      <p className="text-[13.5px] text-white/75">{desc}</p>
    </div>
  );
}

/* ── SVG Icons for Non-Returnable ── */
function ShirtIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0Z" />
    </svg>
  );
}

function ColorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="9.5" r="1.2" />
      <circle cx="14.5" cy="9.5" r="1.2" />
      <circle cx="16" cy="14" r="1.2" />
      <path d="M12 21a3 3 0 0 1 0-6 2 2 0 0 0 0-4" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="9" width="20" height="6" rx="1" />
      <path d="M6 9v3M10 9v4M14 9v3M18 9v4" />
    </svg>
  );
}

function UsedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16l-1 4h-2l-1 9H8L7 10H5L4 6Z" />
      <path d="M9 14c1.5 1.5 4.5 1.5 6 0" />
    </svg>
  );
}

function DamageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/* ── Policy Icons ── */
function PackageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h8l8.6 8.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3h16v18l-2.7-1.6L14.7 21 12 19.4 9.3 21l-2.6-1.6L4 21V3Z" />
      <path d="M8 8h8M8 12h8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9 2h6" />
    </svg>
  );
}

export default function GaransiRetur() {
  const t = useSafeTranslations("garansiRetur");

  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-10 md:py-20 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] font-semibold text-espresso">
              {t("heroTitle")}
            </h1>
            <p className="tracking-[.28em] uppercase text-[.68rem] mt-4 text-gold">{t("heroKicker")}</p>
            <p className="mt-5 text-[15px] md:text-base text-stone leading-relaxed max-w-md">
              {t("heroDesc")}
            </p>
            <ul className="mt-6 space-y-3 max-w-md">
              <li className="flex gap-3 items-start">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span className="text-[15px] text-stone">{t("heroBullet1")}</span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span className="text-[15px] text-stone">{t("heroBullet2")}</span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span className="text-[15px] text-stone">{t("heroBullet3")}</span>
              </li>
            </ul>
            <p className="mt-6 text-[15px] text-stone leading-relaxed max-w-md">
              {t("heroClosing")}
            </p>
            <a
              href="#retur"
              className="inline-flex mt-8 items-center gap-2 bg-espresso text-cream px-7 py-3 rounded-full text-sm tracking-wide hover:bg-coffee transition"
            >
              {t("heroCta")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-sand/50 -z-10" />
            <img
              src="/garansi/11d82eb0-b3c6-4435-bb98-4c699c73408a.png"
              alt="Produk SAMAQU"
              className="w-full rounded-[1.5rem] object-cover aspect-[4/3] md:aspect-[5/4] shadow-[0_20px_60px_-20px_rgba(28,26,23,.35)]"
            />
          </div>
        </div>
      </section>

      {/* ── GARANSI ── */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div>
          <h2 className="font-display text-2xl md:text-4xl text-gold">{t("garansiTitle")}</h2>
          <div className="rule mt-3" />
          <p className="mt-4 text-[15px] text-stone max-w-2xl">{t("garansiDesc")}</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <GuaranteeCard
            title={t("garansi1Title")}
            desc={t("garansi1Desc")}
          />
          <GuaranteeCard
            title={t("garansi2Title")}
            desc={t("garansi2Desc")}
            note={t("garansi2Note")}
          />
          <GuaranteeCard
            title={t("garansi3Title")}
            desc={t("garansi3Desc")}
            note={t("garansi3Note")}
            isWarning
          />
        </div>
      </section>

      {/* ── KEBIJAKAN RETUR ── */}
      <section id="retur" className="py-12 md:py-16" style={{ background: "rgba(233,220,203,.45)" }}>
        <div className="mx-auto max-w-6xl px-5">
          <div>
            <h2 className="font-display text-2xl md:text-4xl text-gold">{t("returTitle")}</h2>
            <div className="rule mt-3" />
            <p className="mt-4 text-[15px] text-stone max-w-2xl">{t("returDesc")}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <ReturnPolicyItem icon={<PackageIcon />} desc={t("retur1")} />
            <ReturnPolicyItem icon={<TagIcon />} desc={t("retur2")} />
            <ReturnPolicyItem icon={<BoxIcon />} desc={t("retur3")} />
            <ReturnPolicyItem icon={<ClockIcon />} desc={t("retur4")} />
          </div>
        </div>
      </section>

      {/* ── CARA MENGAJUKAN ── */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div>
          <h2 className="font-display text-2xl md:text-4xl text-gold">{t("caraTitle")}</h2>
          <div className="rule mt-3" />
        </div>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 list-none p-0">
          <StepItem num={1} desc={t("cara1")} />
          <StepItem num={2} desc={t("cara2")} />
          <StepItem num={3} desc={t("cara3")} />
          <StepItem num={4} desc={t("cara4")} />
        </ol>
      </section>

      {/* ── TIDAK DAPAT DIRETUR ── */}
      <section className="py-12 md:py-16" style={{ background: "#1C1A17" }}>
        <div className="mx-auto max-w-6xl px-5">
          <div>
            <h2 className="font-display text-2xl md:text-4xl text-gold-light">{t("noReturTitle")}</h2>
            <p className="mt-4 text-[15px] text-white/65 max-w-2xl">{t("noReturDesc")}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            <NonReturnableItem icon={<ShirtIcon />} desc={t("noRetur1")} />
            <NonReturnableItem icon={<ColorIcon />} desc={t("noRetur2")} />
            <NonReturnableItem icon={<RulerIcon />} desc={t("noRetur3")} />
            <NonReturnableItem icon={<UsedIcon />} desc={t("noRetur4")} />
            <NonReturnableItem icon={<DamageIcon />} desc={t("noRetur5")} />
          </div>
        </div>
      </section>

      {/* ── BANTUAN CTA ── */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="order-2 md:order-1">
          <h2 className="font-display text-2xl md:text-4xl text-gold">{t("ctaTitle")}</h2>
          <div className="rule mt-3" />
          <p className="mt-5 text-[15px] text-stone leading-relaxed max-w-md">
            {t("ctaDesc1")}
          </p>
          <p className="mt-4 text-[15px] text-stone leading-relaxed max-w-md">
            {t("ctaDesc2")}
          </p>
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya ingin bertanya soal garansi atau retur.")}
            target="_blank"
            rel="noopener"
            className="inline-flex mt-7 items-center gap-2 bg-espresso text-cream px-8 py-3.5 rounded-full text-sm tracking-[.15em] uppercase hover:bg-coffee transition"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 3.9A10 10 0 0 0 3.5 15.6L2 22l6.6-1.7A10 10 0 1 0 20 3.9Zm-8 16.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.9 1 1-3.8-.2-.3A8.2 8.2 0 1 1 12 20.1Zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5 0a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2a.6.6 0 0 0 0-.6c0-.2-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 6.4 10c0 1.3.9 2.5 1 2.7s1.8 3 4.5 4.1a5.1 5.1 0 0 0 3.1.5 2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
            </svg>
            {t("ctaButton")}
          </a>
        </div>
        <div className="order-1 md:order-2 relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-sand/50 -z-10" />
          <img
            src="/garansi/aa47e170-1dc5-4c93-88b2-32e49931472c.png"
            alt="Customer SAMAQU"
            className="w-full rounded-[1.5rem] object-cover aspect-[4/5] max-h-[520px] shadow-[0_20px_60px_-20px_rgba(28,26,23,.35)]"
          />
        </div>
      </section>
    </main>
  );
}
