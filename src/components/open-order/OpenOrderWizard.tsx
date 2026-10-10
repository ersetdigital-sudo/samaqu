"use client";

/**
 * Alur pesanan Open Order (/open-order) — 6 langkah dalam satu halaman:
 * daftar produk → detail produk → keranjang → data pemesan → review → pesanan berhasil.
 *
 * Harga/series/berat tetap dari `src/lib/open-order-config.ts`; foto dari katalog.
 * Submit ke /api/open-order (route yang sama dengan form sebelumnya) supaya pesanan tetap
 * masuk ke dashboard admin sebagai pesanan `CYO-`.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import { getProducts } from "@/lib/db";
import type { Product } from "@/lib/katalog-data";
import { findOpenOrderProduct, OPEN_ORDER_ADDON, OPEN_ORDER_PRODUCTS } from "@/lib/open-order-config";
import StepCart from "./StepCart";
import StepCatalog from "./StepCatalog";
import StepCustomer from "./StepCustomer";
import StepProduct from "./StepProduct";
import StepReview from "./StepReview";
import StepSuccess from "./StepSuccess";
import { EMPTY_CUSTOMER, type CartLine, type CustomerData, type DraftShipping, type ProductDraft } from "./types";
import { INK, LINE, MUTED } from "./ui";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_TITLES: Record<Step, string> = {
  1: "Open Order",
  2: "Detail Produk",
  3: "Pesanan Kamu",
  4: "Data Pemesanan",
  5: "Review Pesanan",
  6: "Order Berhasil",
};

/** Tombol kembali di header per langkah. */
const BACK_TO: Partial<Record<Step, Step>> = { 2: 1, 3: 1, 4: 3, 5: 4 };

function defaultDraft(productId: string, color: string): ProductDraft {
  const product = findOpenOrderProduct(productId) ?? OPEN_ORDER_PRODUCTS[0];
  const series = product.series[0];
  return {
    productId: product.id,
    color: product.colors.includes(color) ? color : product.colors[0],
    size: "M",
    series: series.name,
    quantity: 1,
    price: series.price,
  };
}

export default function OpenOrderWizard() {
  const [step, setStep] = useState<Step>(1);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [customer, setCustomer] = useState<CustomerData>(EMPTY_CUSTOMER);
  const [extraCover, setExtraCover] = useState(false);
  const [shipping, setShipping] = useState<DraftShipping | null>(null);
  const [loadingOngkir, setLoadingOngkir] = useState(false);
  const [ongkirError, setOngkirError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ orderNumber: string; total: number } | null>(null);

  // Foto produk diambil dari katalog (harga tetap dari config).
  useEffect(() => {
    let active = true;
    getProducts()
      .then((products) => {
        if (active) setCatalog(products);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const total = subtotal + (extraCover ? OPEN_ORDER_ADDON.price : 0) + (shipping?.cost ?? 0);

  // Berat kirim = berat produk (gram) × jumlah + Cover & Hanger kalau dipilih, minimum 300 g.
  const totalWeight = Math.max(
    300,
    lines.reduce((sum, line) => sum + (findOpenOrderProduct(line.productId)?.weight ?? 1200) * line.quantity, 0) +
      (extraCover ? OPEN_ORDER_ADDON.weight : 0)
  );

  // Ongkir J&T dihitung otomatis begitu kecamatan tujuan diisi (perilaku form sebelumnya).
  useEffect(() => {
    const district = customer.district.trim();
    if (district.length < 3) {
      setShipping(null);
      setOngkirError(false);
      setLoadingOngkir(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingOngkir(true);
      setOngkirError(false);
      try {
        const res = await fetch("/api/shipping/jnt-cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: customer.city.trim(), district, weight: totalWeight }),
          signal: controller.signal,
        });
        const json = await res.json();
        // J&T belum dikonfigurasi (kredensial belum diisi): bukan error, cukup tampilkan
        // pesan fallback tanpa console.error.
        if (json.configured === false) {
          setShipping(null);
          setOngkirError(true);
          return;
        }
        if (!res.ok || !Array.isArray(json.data) || json.data.length === 0) {
          throw new Error(json.error || "ongkir gagal dihitung");
        }
        // Route J&T sudah mengurutkan opsi dari yang termurah.
        const cheapest = json.data[0];
        setShipping({ service: cheapest.service || "J&T", cost: cheapest.cost || 0 });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[OPEN-ORDER] hitung ongkir gagal:", err);
        setShipping(null);
        setOngkirError(true);
      } finally {
        setLoadingOngkir(false);
      }
    }, 1000);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [customer.district, customer.city, totalWeight]);

  function openDetail(productId: string, color: string) {
    setDraft(defaultDraft(productId, color));
    setStep(2);
  }

  function addDraftToCart(line: ProductDraft) {
    setLines((prev) => [...prev, { ...line, key: nextKey }]);
    setNextKey((key) => key + 1);
    setDraft(null);
    setStep(3);
  }

  function updateQuantity(key: number, quantity: number) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, quantity } : line)));
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }

  function setCustomerField(field: keyof CustomerData, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  async function submitOrder() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/open-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: customer.name,
            whatsapp: customer.whatsapp,
            address: customer.address,
            district: customer.district,
            city: customer.city,
            postalCode: customer.postalCode,
            notes: customer.notes,
          },
          extraCover,
          shipping: shipping ? { method: `J&T - ${shipping.service}`, cost: shipping.cost } : null,
          items: lines.map((line) => ({
            productId: line.productId,
            series: line.series,
            color: line.color,
            size: line.size,
            quantity: line.quantity,
            price: line.price,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Pesanan gagal dikirim. Coba lagi ya.");
        return;
      }
      setResult({ orderNumber: data.orderNumber, total: data.total });
      setStep(6);
    } catch (err) {
      console.error("[OPEN-ORDER] submit error:", err);
      setError("Pesanan gagal dikirim. Coba lagi ya.");
    } finally {
      setSubmitting(false);
    }
  }

  const backTo = BACK_TO[step];

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)", color: INK, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Header + progres langkah */}
      <header
        className="sticky top-0 z-30"
        style={{ borderBottom: "1px solid rgba(216,196,168,.28)", background: "rgba(248,245,241,.95)", backdropFilter: "blur(8px)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 pt-3.5 pb-3 sm:px-8">
          {backTo ? (
            <button
              type="button"
              onClick={() => setStep(backTo)}
              aria-label="Kembali"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-200 hover:bg-[rgba(181,140,74,.09)]"
              style={{ border: `1px solid ${LINE}` }}
            >
              <ChevronLeft size={16} />
            </button>
          ) : (
            <Link
              href="/"
              aria-label="Tutup"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-200 hover:bg-[rgba(181,140,74,.09)]"
              style={{ border: `1px solid ${LINE}` }}
            >
              <X size={16} />
            </Link>
          )}

          <p className="flex-1 text-center text-[12px] font-medium uppercase tracking-[0.2em]">{STEP_TITLES[step]}</p>

          <span className="w-9 shrink-0 text-right text-[11.5px] font-medium" style={{ color: MUTED }}>
            {step}/6
          </span>
        </div>
        <div className="mx-auto max-w-5xl px-5 pb-3 sm:px-8">
          <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(201,183,156,.28)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ background: INK, width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        {step === 1 && (
          <StepCatalog
            catalog={catalog}
            cartCount={lines.reduce((sum, line) => sum + line.quantity, 0)}
            onOpen={(product, color) => openDetail(product.id, color)}
            onViewCart={() => setStep(3)}
          />
        )}

        {(step === 2 || step === 3 || step === 4 || step === 5) && (
          <div className="mx-auto max-w-2xl">
            {step === 2 && draft && (
              <StepProduct
                draft={draft}
                catalog={catalog}
                onChange={(patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
                onAdd={addDraftToCart}
              />
            )}

            {step === 3 && (
              <StepCart
                lines={lines}
                catalog={catalog}
                subtotal={subtotal}
                extraCover={extraCover}
                onToggleExtra={setExtraCover}
                onQuantity={updateQuantity}
                onRemove={removeLine}
                onContinue={() => setStep(4)}
                onShopMore={() => setStep(1)}
              />
            )}

            {step === 4 && <StepCustomer customer={customer} onChange={setCustomerField} onContinue={() => setStep(5)} />}

            {step === 5 && (
              <StepReview
                lines={lines}
                catalog={catalog}
                subtotal={subtotal}
                extraCover={extraCover}
                shipping={shipping}
                loadingOngkir={loadingOngkir}
                ongkirError={ongkirError}
                notes={customer.notes}
                onNotes={(value) => setCustomerField("notes", value)}
                onSubmit={submitOrder}
                submitting={submitting}
                error={error}
              />
            )}
          </div>
        )}

        {step === 6 && result && (
          <div className="mx-auto max-w-xl">
            <StepSuccess orderNumber={result.orderNumber} />
          </div>
        )}
      </main>
    </section>
  );
}
