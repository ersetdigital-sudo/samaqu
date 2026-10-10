"use client";

import { useState } from "react";
import Link from "next/link";
import { useSafeTranslations } from "@/lib/safe-i18n";
import {
  findOpenOrderProduct,
  OPEN_ORDER_ADDON,
  OPEN_ORDER_PRODUCTS,
  openOrderItemPrice,
} from "@/lib/open-order-config";

interface OrderLine {
  key: number;
  productId: string;
  series: string;
  color: string;
  quantity: number;
}

interface CustomerForm {
  name: string;
  instagram: string;
  whatsapp: string;
  city: string;
  address: string;
  notes: string;
}

const EMPTY_CUSTOMER: CustomerForm = {
  name: "",
  instagram: "",
  whatsapp: "",
  city: "",
  address: "",
  notes: "",
};

const money = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

const fieldStyle: React.CSSProperties = {
  border: "1px solid rgba(64,50,37,.15)",
  background: "white",
  color: "var(--espresso)",
};

const fieldClass = "w-full rounded-lg px-3 py-2.5 text-sm outline-none font-ui";

function createLine(key: number): OrderLine {
  const product = OPEN_ORDER_PRODUCTS[0];
  return {
    key,
    productId: product.id,
    series: product.series[0].name,
    color: product.colors[0],
    quantity: 1,
  };
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5 font-ui" style={{ color: "var(--text-muted)" }}>
        {label} {required && <span style={{ color: "var(--gold)" }}>*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] mt-1 font-ui" style={{ color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}

export default function OpenOrderForm() {
  const t = useSafeTranslations("openOrder");
  const [customer, setCustomer] = useState<CustomerForm>(EMPTY_CUSTOMER);
  const [lines, setLines] = useState<OrderLine[]>([createLine(1)]);
  const [extraCover, setExtraCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ orderNumber: string; total: number } | null>(null);

  const subtotal = lines.reduce(
    (sum, line) => sum + (openOrderItemPrice(line.productId, line.series) ?? 0) * line.quantity,
    0
  );
  const addonTotal = extraCover ? OPEN_ORDER_ADDON.price : 0;
  const total = subtotal + addonTotal;

  function setField(field: keyof CustomerForm, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function updateLine(key: number, patch: Partial<OrderLine>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (patch.productId && patch.productId !== line.productId) {
          const product = findOpenOrderProduct(patch.productId);
          if (product) {
            next.series = product.series[0].name;
            next.color = product.colors[0];
          }
        }
        return next;
      })
    );
  }

  function addLine() {
    setLines((prev) => [...prev, createLine(prev[prev.length - 1].key + 1)]);
  }

  function removeLine(key: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));
  }

  function resetForm() {
    setCustomer(EMPTY_CUSTOMER);
    setLines([createLine(1)]);
    setExtraCover(false);
    setError("");
    setResult(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !customer.name.trim() ||
      !customer.instagram.trim() ||
      !customer.whatsapp.trim() ||
      !customer.city.trim() ||
      !customer.address.trim()
    ) {
      setError(t("errorRequired"));
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/open-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          extraCover,
          items: lines.map((line) => ({
            productId: line.productId,
            series: line.series,
            color: line.color,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || t("errorGeneral"));
      } else {
        setResult({ orderNumber: data.orderNumber, total: data.total });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("[OPEN-ORDER] submit error:", err);
      setError(t("errorGeneral"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-3xl p-8 sm:p-10 text-center" style={{ background: "white", border: "1px solid rgba(64,50,37,.1)" }}>
        <div className="mx-auto w-14 h-14 rounded-full grid place-items-center" style={{ background: "var(--gold)" }}>
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-5 text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
          {t("successTitle")}
        </h3>
        <p className="mt-3 font-ui leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t("successDesc")}</p>

        <div className="mt-7 inline-flex flex-col items-center gap-1 rounded-2xl px-7 py-5" style={{ background: "var(--sand-2, #faf6f0)" }}>
          <span className="text-[11px] tracking-[0.2em] uppercase font-ui" style={{ color: "var(--text-muted)" }}>{t("successOrderNo")}</span>
          <span className="text-xl font-semibold font-ui" style={{ color: "var(--espresso)" }}>{result.orderNumber}</span>
          <span className="text-sm font-ui mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("successTotal")}: <strong style={{ color: "var(--espresso)" }}>{money(result.total)}</strong>
          </span>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={resetForm} className="rounded-full px-7 py-3.5 text-sm font-ui" style={{ border: "1px solid rgba(64,50,37,.25)", color: "var(--espresso)" }}>
            {t("successAgain")}
          </button>
          <Link href="/katalog" className="rounded-full px-7 py-3.5 text-sm font-ui text-white" style={{ background: "var(--espresso)" }}>
            {t("backToKatalog")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl p-5 sm:p-8" style={{ background: "white", border: "1px solid rgba(64,50,37,.1)" }}>
      {/* Data pemesan */}
      <h3 className="text-xl sm:text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
        {t("customerTitle")}
      </h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} required>
          <input value={customer.name} onChange={(e) => setField("name", e.target.value)} className={fieldClass} style={fieldStyle} />
        </Field>
        <Field label={t("instagram")} required>
          <input value={customer.instagram} onChange={(e) => setField("instagram", e.target.value)} className={fieldClass} style={fieldStyle} placeholder={t("instagramPlaceholder")} />
        </Field>
        <Field label={t("whatsapp")} required>
          <input value={customer.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} className={fieldClass} style={fieldStyle} inputMode="tel" placeholder="08xxxxxxxxxx" />
        </Field>
        <Field label={t("city")} required>
          <input value={customer.city} onChange={(e) => setField("city", e.target.value)} className={fieldClass} style={fieldStyle} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("address")} required hint={t("addressHint")}>
            <textarea value={customer.address} onChange={(e) => setField("address", e.target.value)} rows={3} className={fieldClass} style={fieldStyle} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t("notes")}>
            <textarea value={customer.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} className={fieldClass} style={fieldStyle} />
          </Field>
        </div>
      </div>

      {/* Pesanan */}
      <h3 className="mt-9 text-xl sm:text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
        {t("orderTitle")}
      </h3>
      <div className="mt-5 space-y-4">
        {lines.map((line, index) => {
          const product = findOpenOrderProduct(line.productId) ?? OPEN_ORDER_PRODUCTS[0];
          const unitPrice = openOrderItemPrice(line.productId, line.series) ?? 0;

          return (
            <div key={line.key} className="rounded-2xl p-4" style={{ background: "var(--sand-2, #faf6f0)", border: "1px solid rgba(64,50,37,.08)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-[0.15em] uppercase font-ui" style={{ color: "var(--text-muted)" }}>#{index + 1}</span>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(line.key)} className="text-xs font-ui px-3 py-1.5 rounded-lg" style={{ border: "1px solid rgba(231,76,60,.35)", color: "#e74c3c" }}>
                    {t("removeLine")}
                  </button>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={t("product")} required>
                  <select value={line.productId} onChange={(e) => updateLine(line.key, { productId: e.target.value })} className={fieldClass} style={fieldStyle}>
                    {OPEN_ORDER_PRODUCTS.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("series")} required>
                  <select value={line.series} onChange={(e) => updateLine(line.key, { series: e.target.value })} className={fieldClass} style={fieldStyle}>
                    {product.series.map((option) => (
                      <option key={option.name} value={option.name}>{option.name} — {money(option.price)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("color")} required>
                  <select value={line.color} onChange={(e) => updateLine(line.key, { color: e.target.value })} className={fieldClass} style={fieldStyle}>
                    {product.colors.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("quantity")} required>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })}
                    className={fieldClass}
                    style={fieldStyle}
                  />
                </Field>
              </div>

              <div className="mt-3 flex justify-between text-sm font-ui" style={{ color: "var(--text-secondary)" }}>
                <span>{t("unitPrice")}: {money(unitPrice)}</span>
                <span className="font-semibold" style={{ color: "var(--espresso)" }}>{money(unitPrice * line.quantity)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addLine} className="mt-4 rounded-full px-5 py-2.5 text-sm font-ui" style={{ border: "1px dashed rgba(64,50,37,.35)", color: "var(--espresso)" }}>
        + {t("addLine")}
      </button>

      {/* Cover & Hanger */}
      <h3 className="mt-9 text-xl sm:text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
        {t("addonTitle")}
      </h3>
      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ border: `1px solid ${extraCover ? "rgba(64,50,37,.12)" : "var(--gold)"}` }}>
          <input type="radio" name="cover-hanger" checked={!extraCover} onChange={() => setExtraCover(false)} />
          <span className="text-sm font-ui" style={{ color: "var(--espresso)" }}>{t("addonNone")}</span>
        </label>
        <label className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ border: `1px solid ${extraCover ? "var(--gold)" : "rgba(64,50,37,.12)"}` }}>
          <input type="radio" name="cover-hanger" checked={extraCover} onChange={() => setExtraCover(true)} />
          <span className="text-sm font-ui" style={{ color: "var(--espresso)" }}>{t("addonExtra")}</span>
        </label>
      </div>

      {/* Ringkasan */}
      <div className="mt-8 rounded-2xl p-5" style={{ background: "var(--sand-2, #faf6f0)" }}>
        <div className="flex justify-between text-sm font-ui" style={{ color: "var(--text-secondary)" }}>
          <span>{t("subtotal")}</span>
          <span>{money(subtotal)}</span>
        </div>
        {addonTotal > 0 && (
          <div className="flex justify-between text-sm font-ui mt-2" style={{ color: "var(--text-secondary)" }}>
            <span>{t("addon")}</span>
            <span>{money(addonTotal)}</span>
          </div>
        )}
        <div className="mt-3 pt-3 flex justify-between text-base font-semibold" style={{ borderTop: "1px solid rgba(64,50,37,.12)", color: "var(--espresso)" }}>
          <span>{t("total")}</span>
          <span>{money(total)}</span>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-ui" style={{ color: "#e74c3c" }}>{error}</p>}

      <button type="submit" disabled={submitting} className="mt-5 w-full rounded-full px-8 py-4 text-sm font-medium font-ui text-white transition-opacity disabled:opacity-60" style={{ background: "var(--espresso)" }}>
        {submitting ? t("submitting") : t("submit")}
      </button>

      <p className="mt-4 text-xs font-ui leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("shippingNote")}</p>
    </form>
  );
}
