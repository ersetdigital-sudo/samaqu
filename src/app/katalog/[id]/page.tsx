"use client";

import { useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Minus, Plus, ChevronLeft, ChevronRight, Play, ShoppingBag, ShoppingCart } from "lucide-react";
import ImageZoom from "@/components/ImageZoom";
import Breadcrumb from "@/components/Breadcrumb";
import { getProductById, colorMap, type Product, type MediaItem } from "@/lib/katalog-data";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/components/Toast";

const sizes = ["S", "M", "L", "XL", "XXL"];
const waBase = "https://wa.me/6281234567890?text=";

function checkoutLink(product: Product, size: string, color: string, qty: number, notes: string) {
  const params = new URLSearchParams({ id: product.id, color, size, qty: String(qty) });
  if (notes) params.set("notes", notes);
  return `/checkout?${params.toString()}`;
}

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

/* ── Media renderer ── */
function MediaDisplay({ item, poster, className, style }: { item: MediaItem; poster?: string; className?: string; style?: React.CSSProperties }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  if (item.type === "video") {
    return (
      <div className={`relative ${className || ""}`} style={style}>
        {playing ? (
          <video
            ref={videoRef}
            src={item.src}
            className="w-full h-full object-cover"
            loop
            playsInline
            preload="auto"
            autoPlay
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.pause();
                setPlaying(false);
              }
            }}
          />
        ) : (
          <>
            <img src={poster || item.src} alt="" className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); setPlaying(true); }}
              className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer"
              style={{ background: "rgba(0,0,0,.08)" }}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: "rgba(184,145,70,.85)", backdropFilter: "blur(8px)" }}>
                <Play size={24} fill="white" stroke="none" className="ml-1" />
              </div>
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className || ""}`} style={{ background: "#e8dfd1", ...style }}>
      <img src={item.src} alt="" className="w-full h-full object-cover" loading="lazy" />
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const product = getProductById(id);

  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || "");
  const [selectedSize, setSelectedSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const toast = useToast();

  function handleAddToCart() {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      color: selectedColor || product.colors[0] || "-",
      size: selectedSize,
      qty,
      notes: notes || undefined,
    });
    toast.show("Ditambahkan ke keranjang");
  }

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const itemWidth = carouselRef.current.scrollWidth / media.length;
    const index = Math.round(scrollLeft / itemWidth);
    setCurrentSlide(Math.min(index, media.length - 1));
  };

  if (!product) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="text-center px-6">
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

  const media = product.media.length > 0 ? product.media : [{ src: product.image, type: "image" as const }];
  const activeMedia = media[activeIndex];

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ═══════════════════════════════════════
          BACK BUTTON
      ═══════════════════════════════════════ */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 sm:top-20 sm:left-6 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
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

      {/* ═══ BREADCRUMB (mobile + desktop) ═══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 sm:pt-6 sm:pb-3 lg:pt-8 lg:pb-4">
        <Breadcrumb extra={[{ label: product.name }]} />
      </div>

      {/* ═══════════════════════════════════════
          MOBILE LAYOUT (max-md)
      ═══════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Gallery carousel */}
        <div className="relative pt-2 pb-4">
          <div
            ref={carouselRef}
            className="flex overflow-x-auto gap-3 scrollbar-hide px-4 scroll-smooth"
            onScroll={handleCarouselScroll}
          >
            {media.map((item, i) => (
              <div
                key={i}
                className="relative shrink-0 w-[80vw] aspect-[3/4] rounded-xl overflow-hidden cursor-zoom-in"
                style={{ background: "#e8dfd1" }}
                onClick={() => { setZoomIndex(i); setZoomOpen(true); }}
              >
                <MediaDisplay item={item} poster={product.image} className="absolute inset-0" />
                {product.tag && i === 0 && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase font-ui font-medium rounded-sm z-10"
                    style={{ border: "1px solid var(--gold)", color: "var(--gold)", background: "rgba(248,246,242,.9)" }}>
                    {product.tag}
                  </span>
                )}
                {item.type === "video" && (
                  <span className="absolute top-3 right-3 px-2 py-1 text-[9px] tracking-[0.1em] uppercase font-ui font-medium rounded-sm z-10"
                    style={{ background: "rgba(0,0,0,.5)", color: "white" }}>
                    Video
                  </span>
                )}
              </div>
            ))}
          </div>
          {/* Dots */}
          {media.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {media.map((_, i) => (
                <span key={i} className="rounded-full transition-all duration-300"
                  style={{ background: i === currentSlide ? "var(--gold)" : "rgba(201,183,156,.4)", width: i === currentSlide ? "16px" : "6px", height: "6px" }} />
              ))}
            </div>
          )}
        </div>

        {/* Content card */}
        <div className="relative -mt-4 mx-4 px-5 py-6 rounded-t-2xl" style={{ background: "var(--cream)", boxShadow: "0 -4px 20px -8px rgba(42,33,27,.08)" }}>
          <p className="text-[10px] tracking-[0.12em] uppercase font-ui mb-1.5" style={{ color: "var(--stone)" }}>
            {product.category}{product.kain && ` — Kain ${product.kain}`}{product.series && ` — ${product.series}`}
          </p>
          <h1 className="text-[1.5rem] sm:text-[1.8rem] font-semibold leading-tight mb-2"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            {product.name}
          </h1>
          <p className="text-[1.3rem] font-ui font-semibold mb-4" style={{ color: "var(--gold)" }}>
            Rp {product.price.toLocaleString("id-ID")}
          </p>
          <p className="text-[13px] leading-relaxed font-ui mb-5" style={{ color: "rgba(42,33,27,.8)" }}>
            {getDescription(product)}
          </p>

          <div className="h-px mb-5" style={{ background: "rgba(201,183,156,.2)" }} />

          {/* Colors */}
          {product.colors.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] tracking-[0.1em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--espresso)" }}>
                Warna — <span style={{ color: "var(--gold)" }}>{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.colors.map((c) => (
                  <button key={c} onClick={() => setSelectedColor(c)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-ui rounded-sm transition-all duration-200"
                    style={{ background: selectedColor === c ? "var(--espresso)" : "transparent", color: selectedColor === c ? "var(--cream)" : "var(--coffee)", border: `1px solid ${selectedColor === c ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorMap[c] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.1em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--espresso)" }}>Ukuran</p>
            <div className="flex gap-1.5">
              {sizes.map((s) => (
                <button key={s} onClick={() => setSelectedSize(s)}
                  className="w-10 h-10 flex items-center justify-center text-[12px] font-ui font-medium rounded-sm transition-all duration-200"
                  style={{ background: selectedSize === s ? "var(--espresso)" : "transparent", color: selectedSize === s ? "var(--cream)" : "var(--coffee)", border: `1px solid ${selectedSize === s ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.1em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--espresso)" }}>Catatan (Opsional)</p>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Minta packing khusus, tambah nama, dll."
              className="w-full px-3 py-2.5 text-[13px] font-ui rounded-sm outline-none transition-all duration-200 focus:border-[var(--gold)]"
              style={{ background: "transparent", border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }} />
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[0.1em] uppercase font-ui font-medium" style={{ color: "var(--espresso)" }}>Jumlah</p>
            <div className="flex items-center gap-2.5">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 active:scale-95" style={{ border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }} aria-label="Kurangi jumlah">
                <Minus size={14} />
              </button>
              <span className="w-7 text-center text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 active:scale-95" style={{ border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }} aria-label="Tambah jumlah">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          MOBILE STICKY BOTTOM BAR
      ═══════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40"
        style={{ background: "var(--cream)", borderTop: "1px solid rgba(201,183,156,.18)", boxShadow: "0 -6px 24px -6px rgba(42,33,27,.1)" }}>
        <div className="px-4 pt-3 pb-4">
          {/* Price row */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[10px] font-ui tracking-wide uppercase" style={{ color: "var(--stone)" }}>Total</p>
              <p className="text-[1.4rem] font-ui font-semibold leading-tight"
                style={{ color: "var(--gold)" }}>
                Rp {(product.price * qty).toLocaleString("id-ID")}
              </p>
            </div>
            <p className="text-[10px] font-ui" style={{ color: "var(--stone)" }}>
              {selectedSize}{selectedColor !== "-" && ` / ${selectedColor}`}
              {qty > 1 && ` × ${qty}`}
            </p>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] tracking-[0.06em] uppercase font-ui font-semibold transition-all duration-300 active:scale-[0.98]"
              style={{ background: "transparent", color: "var(--gold)", border: "1.5px solid var(--gold)" }}>
              <ShoppingCart size={15} strokeWidth={1.5} />
              <span>Keranjang</span>
            </button>
            <a href={checkoutLink(product, selectedSize, selectedColor, qty, notes)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] tracking-[0.06em] uppercase font-ui font-semibold transition-all duration-300 active:scale-[0.98]"
              style={{ background: "var(--espresso)", color: "white" }}>
              <ShoppingBag size={15} strokeWidth={1.5} />
              <span>Beli Sekarang</span>
            </a>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          DESKTOP LAYOUT (md+)
      ═══════════════════════════════════════ */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 lg:px-8 pt-8 pb-20">
        <div className="grid grid-cols-2 gap-10 lg:gap-14">
          {/* Gallery */}
          <div className="flex gap-3">
            {media.length > 1 && (
              <div className="flex flex-col gap-2 shrink-0">
                {media.map((item, i) => (
                  <button key={i} onClick={() => setActiveIndex(i)}
                    className="relative w-[68px] aspect-[3/4] rounded-lg overflow-hidden transition-all duration-200 shrink-0"
                    style={{ border: activeIndex === i ? "2px solid var(--gold)" : "1px solid rgba(201,183,156,.25)", opacity: activeIndex === i ? 1 : 0.55 }}
                    aria-label={`${item.type === "video" ? "Video" : "Foto"} ${i + 1}`}>
                    {item.type === "video" ? (
                      <>
                        <img src={product.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.15)" }}>
                          <Play size={14} fill="var(--gold)" stroke="none" />
                        </div>
                      </>
                    ) : (
                      <img src={item.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden cursor-zoom-in" style={{ background: "#e8dfd1" }} onClick={() => { setZoomIndex(activeIndex); setZoomOpen(true); }}>
              <AnimatePresence mode="wait">
                <motion.div key={activeIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                  <MediaDisplay item={activeMedia} poster={product.image} className="w-full h-full" />
                </motion.div>
              </AnimatePresence>
              {product.tag && (
                <span className="absolute top-4 left-4 px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase font-ui font-medium rounded-sm z-10"
                  style={{ border: "1px solid var(--gold)", color: "var(--gold)", background: "rgba(248,246,242,.9)" }}>
                  {product.tag}
                </span>
              )}
              {activeMedia.type === "video" && (
                <span className="absolute top-4 right-4 px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase font-ui font-medium rounded-sm z-10"
                  style={{ background: "rgba(0,0,0,.5)", color: "white" }}>Video</span>
              )}
              {media.length > 1 && (
                <>
                  <button onClick={() => setActiveIndex((i) => (i - 1 + media.length) % media.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 z-10"
                    style={{ background: "rgba(248,246,242,.85)", backdropFilter: "blur(6px)" }} aria-label="Sebelumnya">
                    <ChevronLeft size={18} style={{ color: "var(--espresso)" }} />
                  </button>
                  <button onClick={() => setActiveIndex((i) => (i + 1) % media.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 z-10"
                    style={{ background: "rgba(248,246,242,.85)", backdropFilter: "blur(6px)" }} aria-label="Berikutnya">
                    <ChevronRight size={18} style={{ color: "var(--espresso)" }} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info */}
          <motion.div className="sticky top-24 h-fit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-[11px] tracking-[0.14em] uppercase font-ui mb-3" style={{ color: "var(--stone)" }}>
              {product.category}{product.kain && ` — Kain ${product.kain}`}{product.series && ` — ${product.series}`}
            </p>
            <h1 className="text-[2rem] sm:text-[2.5rem] lg:text-[2.8rem] font-semibold leading-tight mb-3"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              {product.name}
            </h1>
            <p className="text-[20px] sm:text-[22px] font-ui font-semibold mb-6" style={{ color: "var(--gold)" }}>
              Rp {product.price.toLocaleString("id-ID")}
            </p>
            <p className="text-sm sm:text-[15px] leading-relaxed font-ui mb-8" style={{ color: "rgba(42,33,27,.8)" }}>
              {getDescription(product)}
            </p>
            <div className="h-px mb-7" style={{ background: "rgba(201,183,156,.2)" }} />

            {product.colors.length > 0 && (
              <div className="mb-7">
                <p className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3" style={{ color: "var(--espresso)" }}>
                  Warna — <span style={{ color: "var(--gold)" }}>{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button key={c} onClick={() => setSelectedColor(c)}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] font-ui rounded-sm transition-all duration-200"
                      style={{ background: selectedColor === c ? "var(--espresso)" : "transparent", color: selectedColor === c ? "var(--cream)" : "var(--coffee)", border: `1px solid ${selectedColor === c ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colorMap[c] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-7">
              <p className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3" style={{ color: "var(--espresso)" }}>Ukuran</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} onClick={() => setSelectedSize(s)}
                    className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-[13px] font-ui font-medium rounded-sm transition-all duration-200"
                    style={{ background: selectedSize === s ? "var(--espresso)" : "transparent", color: selectedSize === s ? "var(--cream)" : "var(--coffee)", border: `1px solid ${selectedSize === s ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <p className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3" style={{ color: "var(--espresso)" }}>Catatan (Opsional)</p>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: minta packing khusus, tambah nama, dll."
                className="w-full px-4 py-3 text-sm font-ui rounded-sm outline-none transition-all duration-200 focus:border-[var(--gold)]"
                style={{ background: "transparent", border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }} />
            </div>

            <div className="flex items-center justify-between mb-8">
              <p className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium" style={{ color: "var(--espresso)" }}>Jumlah</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-105" style={{ border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }} aria-label="Kurangi jumlah"><Minus size={14} /></button>
                <span className="w-8 text-center text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-105" style={{ border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }} aria-label="Tambah jumlah"><Plus size={14} /></button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-sm text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01]"
                style={{ background: "transparent", color: "var(--gold)", border: "1.5px solid var(--gold)" }}>
                <ShoppingCart size={16} strokeWidth={1.5} />
                <span>Keranjang</span>
              </button>
              <a href={checkoutLink(product, selectedSize, selectedColor, qty, notes)}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-sm text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01] hover:shadow-lg"
                style={{ background: "var(--espresso)", color: "white", boxShadow: "0 8px 28px -8px rgba(45,33,27,.35)" }}>
                <ShoppingBag size={16} strokeWidth={1.5} />
                <span>Beli Sekarang</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          IMAGE/VIDEO ZOOM LIGHTBOX
      ═══════════════════════════════════════ */}
      <ImageZoom
        src={media[zoomIndex]?.src || activeMedia.src}
        alt={product.name}
        isOpen={zoomOpen}
        onClose={() => setZoomOpen(false)}
        type={media[zoomIndex]?.type || "image"}
      />
    </section>
  );
}
