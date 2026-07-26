"use client";

import { useState, use, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, ChevronLeft, ChevronRight, Play, ShoppingCart } from "lucide-react";
import ImageZoom from "@/components/ImageZoom";
import Breadcrumb from "@/components/Breadcrumb";
import { colorMap, type Product, type MediaItem } from "@/lib/katalog-data";
import { getProductById } from "@/lib/db";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/components/Toast";
import { getWhatsAppLink } from "@/lib/store-settings";
import { SITE_URL } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";

const FALLBACK_SIZES = ["S", "M", "L", "XL", "XXL"];

function waLink(product: Product, size: string, color: string, qty: number, notes: string, price: number) {
  const msg = `Halo Admin SAMAQU, saya ingin memesan:\n\nProduk: ${product.name}\nKain: ${product.kain || "-"}\nWarna: ${color}\nUkuran: ${size}\nJumlah: ${qty}\n${notes ? `Catatan: ${notes}\n` : ""}\nTotal: Rp ${(price * qty).toLocaleString("id-ID")}\n\nMohon konfirmasi ketersediaan. Terima kasih!`;
  return getWhatsAppLink(msg);
}

function getDescription(product: Product): string {
  if (product.description) return product.description;
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
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("M");
  const [availableSizes, setAvailableSizes] = useState<string[]>(FALLBACK_SIZES);
  const [variantPrice, setVariantPrice] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const toast = useToast();

  useEffect(() => {
    getProductById(id).then((p) => {
      setProduct(p);
      if (p) setSelectedColor(p.colors[0] || "");
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id || !selectedColor) return;
    supabase.from("product_variants").select("size, price_override").eq("product_id", id).eq("color", selectedColor).order("size").then(({ data }) => {
      if (data && data.length > 0) {
        const sizes = data.map((d) => d.size);
        setAvailableSizes(sizes);
        if (!sizes.includes(selectedSize)) setSelectedSize(sizes[0]);
      } else {
        setAvailableSizes(FALLBACK_SIZES);
      }
    });
  }, [id, selectedColor]);

  useEffect(() => {
    if (!id || !selectedColor || !selectedSize) { setVariantPrice(null); setStock(null); return; }
    supabase.from("product_variants").select("price_override, stock").eq("product_id", id).eq("color", selectedColor).eq("size", selectedSize).single().then(({ data }) => {
      setVariantPrice(data?.price_override ?? null);
      setStock(data?.stock ?? null);
    });
  }, [id, selectedColor, selectedSize]);

  const currentPrice = variantPrice ?? product?.price ?? 0;

  function handleAddToCart() {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      image: product.image,
      price: currentPrice,
      color: selectedColor || product.colors[0] || "-",
      size: selectedSize,
      qty,
      notes: notes || undefined,
    });
    toast.show("Ditambahkan ke keranjang");
  }

  function handleBuyNow() {
    if (!product) return;
    if (!selectedSize) { toast.show("Pilih ukuran terlebih dahulu"); return; }
    const color = selectedColor || product.colors[0] || "-";
    let msg = `Halo, saya mau pesan produk:\n${product.name} - ${color} - Ukuran ${selectedSize}\nHarga: Rp ${currentPrice.toLocaleString("id-ID")}\nJumlah: ${qty}`;
    if (notes) msg += `\nCatatan: ${notes}`;
    window.open(getWhatsAppLink(msg), "_blank");
  }

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const itemWidth = carouselRef.current.scrollWidth / media.length;
    const index = Math.round(scrollLeft / itemWidth);
    setCurrentSlide(Math.min(index, media.length - 1));
  };

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,183,156,.3)", borderTopColor: "var(--gold)" }} />
      </section>
    );
  }

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
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: getDescription(product),
        image: product.image,
        sku: product.id,
        brand: { "@type": "Brand", name: "SAMAQU" },
        category: product.category,
        color: product.colors.join(", "),
        offers: {
          "@type": "Offer",
          url: `${SITE_URL}/katalog/${product.id}`,
          priceCurrency: "IDR",
          price: currentPrice,
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "SAMAQU" },
          itemCondition: "https://schema.org/NewCondition",
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingDestination: { "@type": "DefinedRegion", addressCountry: "ID" },
            shippingRate: { "@type": "MonetaryAmount", value: "25000", currency: "IDR" },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
              transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
            },
          },
        },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Katalog", item: `${SITE_URL}/katalog` },
            { "@type": "ListItem", position: 3, name: product.name },
          ],
        },
      }) }} />
      {/* ═══════════════════════════════════════
          MOBILE LAYOUT (max-md)
      ═══════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Breadcrumb mobile */}
        <div className="max-w-7xl mx-auto px-4" style={{ paddingTop: "80px", marginBottom: "32px" }}>
          <Breadcrumb extra={[{ label: product.name }]} />
        </div>
        {/* Gallery carousel */}
        <div className="relative pb-4">
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
            Rp {currentPrice.toLocaleString("id-ID")}
          </p>
          {stock !== null && (
            <div className="mb-4">
              {stock === 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#fde8e8", color: "#c0392b" }}>Habis</span>
              ) : stock <= 5 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#fef3cd", color: "#856404" }}>Stok Menipis — Tersisa {stock}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#e7ecdf", color: "#5b6b45" }}>Tersedia</span>
              )}
            </div>
          )}
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
              {availableSizes.map((s) => (
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
                Rp {(currentPrice * qty).toLocaleString("id-ID")}
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
            <button onClick={handleBuyNow}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] tracking-[0.06em] uppercase font-ui font-semibold transition-all duration-300 active:scale-[0.98]"
              style={{ background: "var(--espresso)", color: "white" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              <span>Pesan via WA</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          DESKTOP LAYOUT (md+)
      ═══════════════════════════════════════ */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 lg:px-8 pb-20" style={{ paddingTop: "100px" }}>
        <div style={{ marginBottom: "32px" }}>
          <Breadcrumb extra={[{ label: product.name }]} />
        </div>
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
            <p className="text-[20px] sm:text-[22px] font-ui font-semibold mb-4" style={{ color: "var(--gold)" }}>
              Rp {currentPrice.toLocaleString("id-ID")}
            </p>
            {stock !== null && (
              <div className="mb-5">
                {stock === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#fde8e8", color: "#c0392b" }}>Habis</span>
                ) : stock <= 5 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#fef3cd", color: "#856404" }}>Stok Menipis — Tersisa {stock}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#e7ecdf", color: "#5b6b45" }}>Tersedia</span>
                )}
              </div>
            )}
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
                {availableSizes.map((s) => (
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
              <button onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-sm text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01] hover:shadow-lg"
                style={{ background: "var(--espresso)", color: "white", boxShadow: "0 8px 28px -8px rgba(45,33,27,.35)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                <span>Pesan via WA</span>
              </button>
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
