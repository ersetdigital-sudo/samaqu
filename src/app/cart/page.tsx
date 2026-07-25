"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Minus, Plus, Trash2, Tag, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { colorMap } from "@/lib/katalog-data";

const shippingCost = 15000;

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQty, subtotal } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount + (items.length > 0 ? shippingCost : 0);

  function applyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (code === "SAMAQU10" || code === "DISC10") {
      setPromoApplied(true);
      setPromoError("");
    } else {
      setPromoApplied(false);
      setPromoError("Kode promo tidak valid");
    }
  }

  function removePromo() {
    setPromoCode("");
    setPromoApplied(false);
    setPromoError("");
  }

  function checkoutAll() {
    if (items.length === 0) return;
    const first = items[0];
    const params = new URLSearchParams({
      id: first.id,
      color: first.color,
      size: first.size,
      qty: String(first.qty),
    });
    if (first.notes) params.set("notes", first.notes);
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ background: "rgba(248,245,241,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(201,183,156,.15)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shrink-0"
            style={{ border: "1px solid rgba(201,183,156,.25)" }}
            aria-label="Kembali">
            <ArrowLeft size={16} style={{ color: "var(--espresso)" }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-ui font-semibold truncate" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Keranjang
            </h1>
            <p className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>{items.length} item</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-28">
        {items.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(181,140,74,.08)" }}>
              <ShoppingBag size={28} style={{ color: "var(--clay)" }} />
            </div>
            <p className="text-[15px] font-ui font-medium mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Keranjang kosong
            </p>
            <p className="text-[12px] font-ui mb-5" style={{ color: "var(--stone)" }}>
              Mulai belanja dan tambahkan produk ke keranjang.
            </p>
            <button onClick={() => router.push("/katalog")}
              className="px-6 py-3 rounded-xl text-[12px] tracking-[0.06em] uppercase font-ui font-semibold transition-all duration-200 hover:scale-105"
              style={{ background: "var(--gold)", color: "white" }}>
              Lihat Katalog
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items List */}
            <div className="space-y-3 mb-5">
              <AnimatePresence>
                {items.map((item, i) => (
                  <motion.div
                    key={`${item.id}-${item.color}-${item.size}`}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.25 }}
                    className="p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,.65)", border: "1px solid rgba(201,183,156,.15)", boxShadow: "0 1px 3px rgba(42,33,27,.04)" }}>
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0" style={{ background: "#e8dfd1" }}>
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-ui font-semibold leading-tight truncate" style={{ color: "var(--espresso)" }}>
                            {item.name}
                          </p>
                          <button onClick={() => removeItem(i)}
                            className="shrink-0 p-1 rounded transition-all hover:scale-110" style={{ color: "var(--stone)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.color !== "-" && (
                            <span className="flex items-center gap-1 text-[11px] font-ui" style={{ color: "var(--coffee)" }}>
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorMap[item.color] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                              {item.color}
                            </span>
                          )}
                          {item.color !== "-" && <span className="text-[10px]" style={{ color: "var(--clay)" }}>|</span>}
                          <span className="text-[11px] font-ui" style={{ color: "var(--coffee)" }}>UK {item.size}</span>
                        </div>
                        <p className="text-[11px] font-ui mt-0.5" style={{ color: "var(--stone)" }}>
                          Rp {item.price.toLocaleString("id-ID")} / pcs
                        </p>
                        {/* Qty + subtotal */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="inline-flex items-center gap-0 rounded-full"
                            style={{ background: "var(--cream)", border: "1px solid rgba(201,183,156,.2)", padding: "2px 4px" }}>
                            <button onClick={() => updateQty(i, item.qty - 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                              style={{ color: "var(--espresso)" }}>
                              <Minus size={13} />
                            </button>
                            <span className="w-7 text-center text-[13px] font-ui font-semibold" style={{ color: "var(--espresso)" }}>
                              {item.qty}
                            </span>
                            <button onClick={() => updateQty(i, item.qty + 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                              style={{ color: "var(--espresso)" }}>
                              <Plus size={13} />
                            </button>
                          </div>
                          <p className="text-[14px] font-ui font-bold" style={{ color: "var(--gold)" }}>
                            Rp {(item.price * item.qty).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Promo Code */}
            <div className="p-4 rounded-xl mb-5"
              style={{ background: "rgba(255,255,255,.65)", border: "1px solid rgba(201,183,156,.15)" }}>
              {promoApplied ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(181,140,74,.1)" }}>
                      <Tag size={16} style={{ color: "var(--gold)" }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>Kode Promo</p>
                      <p className="text-[13px] font-ui font-semibold" style={{ color: "var(--gold)" }}>{promoCode.toUpperCase()}</p>
                    </div>
                  </div>
                  <button onClick={removePromo}
                    className="text-[12px] font-ui font-medium px-3 py-1.5 rounded-full transition-all hover:scale-105"
                    style={{ color: "var(--gold)", border: "1px solid rgba(181,140,74,.3)" }}>
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{ border: `1px solid ${promoError ? "#e74c3c" : "rgba(201,183,156,.25)"}`, background: "rgba(248,245,241,.5)" }}>
                    <Tag size={15} style={{ color: "var(--clay)" }} />
                    <input type="text" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }}
                      placeholder="Masukkan kode promo"
                      className="flex-1 text-[13px] font-ui bg-transparent outline-none"
                      style={{ color: "var(--espresso)" }} />
                  </div>
                  <button onClick={applyPromo}
                    className="px-4 py-2.5 rounded-lg text-[12px] font-ui font-semibold transition-all duration-200 hover:scale-105 shrink-0"
                    style={{ background: "var(--espresso)", color: "white" }}>
                    Pakai
                  </button>
                </div>
              )}
              {promoError && (
                <p className="text-[11px] font-ui mt-1.5 ml-1" style={{ color: "#e74c3c" }}>{promoError}</p>
              )}
            </div>

            {/* Order Summary */}
            <div className="rounded-xl p-4 sm:p-5"
              style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(201,183,156,.12)" }}>
              <div className="space-y-2.5">
                <SummaryLine label="Subtotal" value={`Rp ${subtotal.toLocaleString("id-ID")}`} />
                {promoApplied && (
                  <SummaryLine label={`Diskon (${promoCode.toUpperCase()})`} value={`- Rp ${discount.toLocaleString("id-ID")}`} valueColor="var(--gold)" />
                )}
                <SummaryLine label="Pengiriman Reguler" value={`Rp ${shippingCost.toLocaleString("id-ID")}`} />
              </div>
              <div className="h-px my-3.5" style={{ background: "rgba(201,183,156,.2)" }} />
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>Total Pembayaran</span>
                <span className="text-[18px] sm:text-[20px] font-ui font-bold" style={{ color: "var(--gold)" }}>
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed Bottom Checkout Button */}
      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-3" style={{ background: "linear-gradient(to top, var(--cream) 70%, transparent)" }}>
          <button onClick={checkoutAll}
            className="w-full py-3.5 rounded-xl text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 active:scale-[0.98]"
            style={{ background: "var(--gold)", color: "white", boxShadow: "0 6px 20px -6px rgba(184,145,74,.4)" }}>
            Checkout — Rp {total.toLocaleString("id-ID")}
          </button>
        </div>
      )}
    </section>
  );
}

function SummaryLine({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[12px] font-ui" style={{ color: "var(--coffee)" }}>{label}</span>
      <span className="text-[12px] font-ui font-medium" style={{ color: valueColor || "var(--espresso)" }}>{value}</span>
    </div>
  );
}
