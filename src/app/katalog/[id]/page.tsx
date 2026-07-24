"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Minus, Plus, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getProductById, colorMap, type Product } from "@/lib/katalog-data";

const sizes = ["S", "M", "L", "XL", "XXL"];

const waBase = "https://wa.me/6281234567890?text=";

function waLink(product: Product, size: string, color: string, qty: number, notes: string) {
  const msg = `Halo Admin SAMAQU, saya ingin memesan:\n\nProduk: ${product.name}\nKain: ${product.kain || "-"}\nWarna: ${color}\nUkuran: ${size}\nJumlah: ${qty}\n${notes ? `Catatan: ${notes}\n` : ""}\nTotal: Rp ${(product.price * qty).toLocaleString("id-ID")}\n\nMohon konfirmasi ketersediaan. Terima kasih!`;
  return waBase + encodeURIComponent(msg);
}

function getDescription(product: Product): string {
  const map: Record<string, string> = {
    Thobe: "Thobe premium dengan bahan pilihan yang adem dan nyaman. Potongan presisi, jahitan rapi, cocok untuk ibadah maupun acara istimewa. Tersedia dalam berbagai pilihan kain dan warna.",
    Kandora: "Kandora berkualitas dengan bahan ringan dan potongan yang elegan. Nyaman dipakai sehari-hari maupun untuk acara formal.",
    Koko: "Baju Koko dengan desain modern dan bahan premium. Nyaman untuk shalat maupun kegiatan sehari-hari.",
    Vest: "Vest elegan dengan potongan yang presisi. Cocok dipadukan dengan thobe atau koko untuk tampilan lebih berkelas.",
    Kabak: "Kabak premium dengan kualitas terbaik. Tersedia dalam berbagai pilihan.",
    "Cover & Hanger": "Cover dan hanger premium untuk menjaga busana tetap rapi dan terlindungi.",
  };
  return map[product.category] || "";
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const product = getProductById(id);

  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || "");
  const [selectedSize, setSelectedSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  if (!product) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="text-center">
          <p className="text-lg font-medium mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            Produk tidak ditemukan
          </p>
          <a href="/katalog" className="text-sm font-ui underline" style={{ color: "var(--gold)" }}>
            Kembali ke Katalog
          </a>
        </div>
      </section>
    );
  }

  const images = product.images.length > 0 ? product.images : [product.image];

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ── Back button (always visible) ── */}
      <div className="fixed top-20 left-4 sm:left-6 z-30">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            background: "rgba(248,246,242,.85)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            border: "1px solid rgba(201,183,156,.2)",
          }}
          aria-label="Kembali"
        >
          <ArrowLeft size={18} style={{ color: "var(--espresso)" }} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14">

          {/* ═══════════════════════════════════════
              LEFT: Gallery (mobile: full width, desktop: sticky-ish)
          ═══════════════════════════════════════ */}
          <div>
            {/* Mobile: horizontal swipeable carousel */}
            <div className="md:hidden relative">
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 scrollbar-hide -mx-4 px-4">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="relative shrink-0 w-[85vw] aspect-[3/4] rounded-xl overflow-hidden snap-center"
                    style={{ background: "#e8dfd1" }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${colorMap[product.colors[0]] || "#e8dfd1"}22, ${colorMap[product.colors[1]] || "#d4c5a9"}22)`,
                      }}
                    />
                    {/* Tag */}
                    {product.tag && i === 0 && (
                      <span
                        className="absolute top-3 left-3 px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase font-ui font-medium rounded-sm z-10"
                        style={{ border: "1px solid var(--gold)", color: "var(--gold)", background: "rgba(248,246,242,.9)" }}
                      >
                        {product.tag}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {/* Dots */}
              {images.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        background: i === 0 ? "var(--gold)" : "rgba(201,183,156,.4)",
                        width: i === 0 ? "16px" : "6px",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: main image + thumbnails */}
            <div className="hidden md:flex gap-4">
              {/* Thumbnails (vertical) */}
              {images.length > 1 && (
                <div className="flex flex-col gap-2.5 shrink-0">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className="relative w-[72px] aspect-[3/4] rounded-lg overflow-hidden transition-all duration-200"
                      style={{
                        border: activeImage === i ? "2px solid var(--gold)" : "1px solid rgba(201,183,156,.25)",
                        opacity: activeImage === i ? 1 : 0.6,
                      }}
                      aria-label={`Foto ${i + 1}`}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, ${colorMap[product.colors[0]] || "#e8dfd1"}22, ${colorMap[product.colors[1]] || "#d4c5a9"}22)`,
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden" style={{ background: "#e8dfd1" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${colorMap[product.colors[0]] || "#e8dfd1"}33, ${colorMap[product.colors[1]] || "#d4c5a9"}33)`,
                    }}
                  />
                </AnimatePresence>

                {/* Tag */}
                {product.tag && (
                  <span
                    className="absolute top-4 left-4 px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase font-ui font-medium rounded-sm z-10"
                    style={{ border: "1px solid var(--gold)", color: "var(--gold)", background: "rgba(248,246,242,.9)" }}
                  >
                    {product.tag}
                  </span>
                )}

                {/* Nav arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 z-10"
                      style={{ background: "rgba(248,246,242,.85)", backdropFilter: "blur(6px)" }}
                      aria-label="Foto sebelumnya"
                    >
                      <ChevronLeft size={18} style={{ color: "var(--espresso)" }} />
                    </button>
                    <button
                      onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 z-10"
                      style={{ background: "rgba(248,246,242,.85)", backdropFilter: "blur(6px)" }}
                      aria-label="Foto berikutnya"
                    >
                      <ChevronRight size={18} style={{ color: "var(--espresso)" }} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              RIGHT: Product Info (sticky on desktop)
          ═══════════════════════════════════════ */}
          <motion.div
            className="md:sticky md:top-24 h-fit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Category */}
            <p
              className="text-[11px] tracking-[0.14em] uppercase font-ui mb-3"
              style={{ color: "var(--stone)" }}
            >
              {product.category}
              {product.kain && ` — Kain ${product.kain}`}
              {product.series && ` — ${product.series}`}
            </p>

            {/* Title */}
            <h1
              className="text-[2rem] sm:text-[2.5rem] lg:text-[2.8rem] font-semibold leading-tight mb-3"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                color: "var(--espresso)",
              }}
            >
              {product.name}
            </h1>

            {/* Price */}
            <p
              className="text-[20px] sm:text-[22px] font-ui font-semibold mb-6"
              style={{ color: "var(--gold)" }}
            >
              Rp {product.price.toLocaleString("id-ID")}
            </p>

            {/* Description */}
            <p
              className="text-sm sm:text-[15px] leading-relaxed font-ui mb-8"
              style={{ color: "rgba(42,33,27,.8)" }}
            >
              {getDescription(product)}
            </p>

            {/* Divider */}
            <div className="h-px mb-7" style={{ background: "rgba(201,183,156,.2)" }} />

            {/* Color Selection */}
            {product.colors.length > 0 && (
              <div className="mb-7">
                <p
                  className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3"
                  style={{ color: "var(--espresso)" }}
                >
                  Warna — <span style={{ color: "var(--gold)" }}>{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] font-ui rounded-sm transition-all duration-200"
                      style={{
                        background: selectedColor === c ? "var(--espresso)" : "transparent",
                        color: selectedColor === c ? "var(--cream)" : "var(--coffee)",
                        border: `1px solid ${selectedColor === c ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: colorMap[c] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }}
                      />
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div className="mb-7">
              <p
                className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3"
                style={{ color: "var(--espresso)" }}
              >
                Ukuran
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-[13px] font-ui font-medium rounded-sm transition-all duration-200"
                    style={{
                      background: selectedSize === s ? "var(--espresso)" : "transparent",
                      color: selectedSize === s ? "var(--cream)" : "var(--coffee)",
                      border: `1px solid ${selectedSize === s ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-7">
              <p
                className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3"
                style={{ color: "var(--espresso)" }}
              >
                Catatan (Opsional)
              </p>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: minta packing khusus, tambah nama, dll."
                className="w-full px-4 py-3 text-sm font-ui rounded-sm outline-none transition-all duration-200 focus:border-[var(--gold)]"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(201,183,156,.3)",
                  color: "var(--espresso)",
                }}
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between mb-8">
              <p
                className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium"
                style={{ color: "var(--espresso)" }}
              >
                Jumlah
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-105"
                  style={{ border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }}
                  aria-label="Kurangi jumlah"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-105"
                  style={{ border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }}
                  aria-label="Tambah jumlah"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* CTA Button (inline on desktop, replaces sticky footer) */}
            <a
              href={waLink(product, selectedSize, selectedColor, qty, notes)}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-sm text-[13px] tracking-[0.1em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01] hover:shadow-lg"
              style={{
                background: "var(--gold)",
                color: "white",
                boxShadow: "0 8px 28px -8px rgba(184,145,70,.45)",
              }}
            >
              <MessageCircle size={18} strokeWidth={1.5} />
              <span>Pesan via WhatsApp</span>
              <span className="mx-2 w-px h-4" style={{ background: "rgba(255,255,255,.3)" }} />
              <span>Rp {(product.price * qty).toLocaleString("id-ID")}</span>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
