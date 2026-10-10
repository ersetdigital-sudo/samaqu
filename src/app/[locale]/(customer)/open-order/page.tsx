"use client";

import { useSafeTranslations } from "@/lib/safe-i18n";
import OpenOrderForm from "@/components/OpenOrderForm";
import { OPEN_ORDER_ADDON, OPEN_ORDER_PRODUCTS } from "@/lib/open-order-config";

const money = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

/** Gabungkan series dengan harga sama supaya tampil seperti daftar harga form lama. */
function priceTiers(product: (typeof OPEN_ORDER_PRODUCTS)[number]) {
  return product.series.reduce<{ price: number; names: string[] }[]>((tiers, series) => {
    const last = tiers[tiers.length - 1];
    if (last && last.price === series.price) last.names.push(series.name);
    else tiers.push({ price: series.price, names: [series.name] });
    return tiers;
  }, []);
}

export default function OpenOrderPage() {
  const t = useSafeTranslations("openOrder");

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Hero */}
      <div style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="mx-auto max-w-4xl px-5 py-20 sm:py-24 text-center">
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

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {OPEN_ORDER_PRODUCTS.map((product) => (
              <div key={product.id} className="rounded-2xl p-6 bg-white" style={{ border: "1px solid rgba(42,33,27,.08)" }}>
                <h3 className="text-xl font-medium font-ui" style={{ color: "var(--espresso)" }}>{product.name}</h3>
                <p className="mt-1 text-xs font-ui" style={{ color: "var(--text-muted)" }}>{t("priceColors")}: {product.colors.join(", ")}</p>
                <div className="mt-4 space-y-2">
                  {priceTiers(product).map((tier) => (
                    <div key={tier.price} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-ui" style={{ color: "var(--text-secondary)" }}>Series {tier.names.join(" & ")}</span>
                      <span className="text-base font-semibold font-ui whitespace-nowrap" style={{ color: "var(--gold)" }}>{money(tier.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl p-5 bg-white flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8" style={{ border: "1px solid rgba(42,33,27,.08)" }}>
            <span className="text-sm font-ui" style={{ color: "var(--text-secondary)" }}>{t("priceNone")}</span>
            <span className="text-sm font-ui" style={{ color: "var(--espresso)" }}>
              {t("priceExtra")} <strong style={{ color: "var(--gold)" }}>+{money(OPEN_ORDER_ADDON.price)}</strong>
            </span>
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
              <div key={index} className="rounded-2xl p-6 bg-white" style={{ border: "1px solid rgba(42,33,27,.08)" }}>
                <span className="text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-3 text-sm font-ui leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
