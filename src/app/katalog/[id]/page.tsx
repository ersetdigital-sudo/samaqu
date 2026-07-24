"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, MessageCircle } from "lucide-react";
import { getProductById, colorMap, type Product } from "@/lib/katalog-data";

const sizes = ["S", "M", "L", "XL", "XXL"];

const waBase = "https://wa.me/6281234567890?text=";

function waLink(product: Product, size: string, color: string, qty: number, notes: string) {
  const msg = `Halo Admin SAMAQU, saya ingin memesan:\n\nProduk: ${product.name}\nKain: ${product.kain || "-"}\nWarna: ${color}\nUkuran: ${size}\nJumlah: ${qty}\n${notes ? `Catatan: ${notes}\n` : ""}\nTotal: Rp ${(product.price * qty).toLocaleString("id-ID")}\n\nMohon konfirmasi ketersediaan. Terima kasih!`;
  return waBase + encodeURIComponent(msg);
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const product = getProductById(id);

  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || "");
  const [selectedSize, setSelectedSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

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

  return (
    <section className="min-h-screen pb-32" style={{ background: "var(--cream)" }}>
      {/* ── Hero Image ── */}
      <div className="relative w-full h-[280px] sm:h-[360px] lg:h-[440px] overflow-hidden" style={{ background: "#e8dfd1" }}>
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--cream), transparent 40%)" }}
        />

        {/* Color-tinted background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${colorMap[product.colors[0]] || "#e8dfd1"}33, ${colorMap[product.colors[1]] || "#d4c5a9"}33)`,
          }}
        />

        {/* Nav overlay */}
        <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 sm:px-6 pt-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
            style={{
              background: "rgba(248,246,242,.8)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 2px 8px rgba(0,0,0,.1)",
            }}
            aria-label="Kembali"
          >
            <ArrowLeft size={18} style={{ color: "var(--espresso)" }} />
          </button>
        </div>
      </div>

      {/* ── Content Card ── */}
      <motion.div
        className="relative -mt-6 mx-auto max-w-2xl px-5 sm:px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="rounded-t-3xl px-6 sm:px-8 pt-7 pb-6"
          style={{
            background: "var(--cream)",
            boxShadow: "0 -8px 32px -12px rgba(42,33,27,.08)",
          }}
        >
          {/* Category */}
          <p
            className="text-[11px] tracking-[0.14em] uppercase font-ui mb-2"
            style={{ color: "var(--stone)" }}
          >
            {product.category}
            {product.kain && ` — Kain ${product.kain}`}
            {product.series && ` — ${product.series}`}
          </p>

          {/* Title */}
          <h1
            className="text-[1.8rem] sm:text-[2.2rem] font-semibold leading-tight mb-2"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            {product.name}
          </h1>

          {/* Price */}
          <p
            className="text-xl sm:text-2xl font-ui font-semibold mb-5"
            style={{ color: "var(--gold)" }}
          >
            Rp {product.price.toLocaleString("id-ID")}
          </p>

          {/* Description */}
          <p
            className="text-sm leading-relaxed font-ui mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            {product.category === "Thobe"
              ? "Thobe premium dengan bahan pilihan yang adem dan nyaman. Potongan presisi, jahitan rapi, cocok untuk ibadah maupun acara istimewa."
              : product.category === "Kandora"
              ? "Kandora berkualitas dengan bahan ringan dan potongan yang elegan. Nyaman dipakai sehari-hari maupun untuk acara formal."
              : product.category === "Koko"
              ? "Baju Koko dengan desain modern dan bahan premium. Nyaman untuk shalat maupun kegiatan sehari-hari."
              : product.category === "Vest"
              ? "Vest elegan dengan potongan yang presisi. Cocok dipadukan dengan thobe atau koko untuk tampilan lebih berkelas."
              : product.category === "Kabak"
              ? "Kabak premium dengan kualitas terbaik. Tersedia dalam berbagai pilihan."
              : "Cover dan hanger premium untuk menjaga busana tetap rapi dan terlindungi."}
          </p>

          {/* Divider */}
          <div className="h-px mb-6" style={{ background: "rgba(201,183,156,.2)" }} />

          {/* Color Selection */}
          {product.colors.length > 0 && (
            <div className="mb-6">
              <p
                className="text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3"
                style={{ color: "var(--espresso)" }}
              >
                Warna
              </p>
              <div className="flex flex-wrap gap-2.5">
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
                      style={{
                        background: colorMap[c] || "#ccc",
                        border: "1px solid rgba(42,33,27,.1)",
                      }}
                    />
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="mb-6">
            <p
              className="text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3"
              style={{ color: "var(--espresso)" }}
            >
              Ukuran
            </p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className="w-12 h-12 flex items-center justify-center text-[13px] font-ui font-medium rounded-sm transition-all duration-200"
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
          <div className="mb-6">
            <p
              className="text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3"
              style={{ color: "var(--espresso)" }}
            >
              Catatan (Opsional)
            </p>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: minta packing khusus, tambah nama, dll."
              className="w-full px-4 py-3 text-sm font-ui rounded-lg outline-none transition-all duration-200 focus:ring-1"
              style={{
                background: "rgba(248,246,242,.8)",
                border: "1px solid rgba(201,183,156,.25)",
                color: "var(--espresso)",
                ["--tw-ring-color" as string]: "var(--gold)",
              }}
            />
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <p
              className="text-[12px] tracking-[0.12em] uppercase font-ui font-medium"
              style={{ color: "var(--espresso)" }}
            >
              Jumlah
            </p>
            <div
              className="flex items-center gap-1 rounded-full px-1.5 py-1.5"
              style={{
                background: "rgba(248,246,242,.8)",
                border: "1px solid rgba(201,183,156,.25)",
              }}
            >
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
                style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
                aria-label="Kurangi jumlah"
              >
                <Minus size={14} style={{ color: "var(--espresso)" }} />
              </button>
              <span
                className="w-8 text-center text-sm font-ui font-medium"
                style={{ color: "var(--espresso)" }}
              >
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
                style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
                aria-label="Tambah jumlah"
              >
                <Plus size={14} style={{ color: "var(--espresso)" }} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Sticky Footer CTA ── */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 px-5 sm:px-8 pb-6 pt-4"
        style={{
          background: "linear-gradient(to top, var(--cream) 60%, transparent)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <a
            href={waLink(product, selectedSize, selectedColor, qty, notes)}
            target="_blank"
            rel="noopener"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-[13px] tracking-[0.1em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
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
        </div>
      </div>
    </section>
  );
}
