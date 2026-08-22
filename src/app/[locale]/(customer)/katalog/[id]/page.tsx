"use client";

import { useState, use, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, ChevronLeft, ChevronRight, ChevronDown, Play, ShoppingCart } from "lucide-react";
import ImageZoom, { type ZoomMedia } from "@/components/ImageZoom";
import KainSeriesModal, { getKainSwatchColor } from "@/components/KainSeriesModal";
import Breadcrumb from "@/components/Breadcrumb";
import { colorMap, type Product, type MediaItem } from "@/lib/katalog-data";
import { getProductById, getAvailableSeries, getProducts, type SeriesOption } from "@/lib/db";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/components/Toast";
import { getWhatsAppLink, useStoreSettings } from "@/lib/store-settings";
import { supabase } from "@/lib/supabase";
import { useWishlist } from "@/lib/use-wishlist";
import { trackViewContent, trackAddToCart, trackWhatsAppClick, sendCAPIEvent } from "@/lib/meta-pixel";

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
type GalleryMedia = MediaItem & { poster?: string };

// Hapus media dengan URL yang sama (duplikat di data) — pertahankan urutan
function dedupeByUrl(list: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return list.filter((m) => (seen.has(m.src) ? false : (seen.add(m.src), true)));
}

function MediaDisplay({ item, poster, className, style, allMedia }: { item: GalleryMedia; poster?: string; className?: string; style?: React.CSSProperties; allMedia?: MediaItem[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // For video items, find a valid image poster
  function getVideoPoster(): string {
    if (poster && !poster.match(/\.(mp4|webm|ogg)$/i)) return poster;
    // Find first image in allMedia that isn't a video
    if (allMedia) {
      const img = allMedia.find((m) => m.type === "image" && !m.src.match(/\.(mp4|webm|ogg)$/i));
      if (img) return img.src;
    }
    return "";
  }

  if (item.type === "video") {
    const videoPoster = getVideoPoster();
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
            {videoPoster ? (
              <img src={videoPoster} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "#e8dfd1" }}>
                <Play size={32} style={{ color: "var(--gold)" }} />
              </div>
            )}
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
      <img src={item.src} alt="" className="w-full h-full object-contain" loading="lazy" />
    </div>
  );
}

/* ── Info accordion item (bahan/ukuran/pengiriman) ── */
function InfoAccordionItem({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "rgba(64,50,37,.03)", border: "1px solid rgba(201,183,156,.15)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-[13px] font-medium font-ui" style={{ color: "var(--espresso)" }}>{title}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className="shrink-0 transition-transform duration-300"
          style={{ color: "var(--stone)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      {open && (
        <div className="px-4 pb-3.5">
          <p className="text-[12.5px] leading-relaxed font-ui" style={{ color: "var(--stone)" }}>{children}</p>
        </div>
      )}
    </div>
  );
}

function InfoAccordionGroup() {
  return (
    <div className="space-y-2.5">
      <InfoAccordionItem title="Detail bahan & perawatan">
        Kain premium dengan sirkulasi udara baik, tidak menerawang, dan jatuh rapi. Cuci dengan air dingin, setrika suhu sedang, jangan gunakan pemutih.
      </InfoAccordionItem>
      <InfoAccordionItem title="Panduan ukuran">
        Tersedia ukuran S–XXL. Ukur lingkar dada dan panjang badan, lalu sesuaikan dengan tabel ukuran. Ragu? Chat kami via WhatsApp.
      </InfoAccordionItem>
      <InfoAccordionItem title="Pengiriman & pengembalian">
        Dikirim 1–2 hari kerja setelah pembayaran. Salah ukuran bisa ditukar maksimal 7 hari setelah barang diterima.
      </InfoAccordionItem>
    </div>
  );
}

/* ── Related product tile (produk lain dari kain yang sama) ── */
function RelatedProductCard({ p }: { p: Product }) {
  return (
    <a
      href={`/katalog/${p.id}`}
      className="group block rounded-2xl overflow-hidden"
      style={{ background: "white", border: "1px solid rgba(201,183,156,.12)" }}
    >
      <div className="relative aspect-[3/4] overflow-hidden" style={{ background: "#e8dfd1" }}>
        <img
          src={p.media.find((m) => m.type === "image")?.src || p.image}
          alt={p.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
        {p.colors[0] && (
          <span
            className="absolute bottom-3 right-3 w-4 h-4 rounded-full"
            style={{ background: colorMap[p.colors[0]] || "#ccc", boxShadow: "0 0 0 2px white" }}
          />
        )}
      </div>
      <div className="p-3.5">
        <h3 className="text-[14px] font-semibold font-ui line-clamp-1" style={{ color: "var(--espresso)" }}>{p.name}</h3>
        {p.kain && (
          <p className="mt-1 text-[11.5px] font-ui" style={{ color: "var(--gold)" }}>Kain {p.kain}</p>
        )}
        <p className="mt-1.5 text-[12.5px] font-ui" style={{ color: "var(--stone)" }}>
          Mulai <span style={{ color: "var(--espresso)", fontWeight: 500 }}>Rp {p.price.toLocaleString("id-ID")}</span>
        </p>
      </div>
    </a>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [colorHex, setColorHex] = useState<Record<string, string>>({});

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
  const [infoSheet, setInfoSheet] = useState<"kain" | "series" | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [availableSeries, setAvailableSeries] = useState<SeriesOption[]>([]);
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);
  // Series yang sedang dimuat datanya — dipakai untuk skip refetch ganda
  // (mount & klik series yang sama), TANPA menghalangi reload saat kembali
  // ke series dasar (id URL) yang state-nya sudah berganti.
  const loadedSeriesIdRef = useRef<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const mobileGalleryRef = useRef<HTMLDivElement>(null);
  const [galleryHighlight, setGalleryHighlight] = useState(false);
  const { addItem } = useCart();
  const toast = useToast();
  const storeSettings = useStoreSettings();
  const { isWishlisted, toggle: toggleWishlist, isLoggedIn } = useWishlist();
  const cypMicrocopy = product?.cyp_microcopy_override || storeSettings.cyp_microcopy || "Harga Minimum boleh dipilih. Itulah alasan kami membuat Create Your Price.";
  const isThobe = product?.category === "Thobe";
  // ID produk yang sedang ditampilkan (bisa beda dari URL slug saat ganti series)
  const displayId = activeSeriesId || id;

  // Supabase images per color
  const [supabaseMedia, setSupabaseMedia] = useState<MediaItem[]>([]);

  // Related products (same kain), for "Produk lain dari kain ini"
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (!product) return;
    getProducts().then((all) => {
      const sameKain = all.filter((p) => p.id !== product.id && product.kain && p.kain === product.kain);
      const others = all.filter((p) => p.id !== product.id && (!product.kain || p.kain !== product.kain));
      setRelatedProducts([...sameKain, ...others].slice(0, 4));
    });
  }, [product]);

  useEffect(() => {
    getProductById(id).then((p) => {
      setProduct(p);
      setActiveSeriesId(id);
      loadedSeriesIdRef.current = id;
      if (p) {
        // Warna hex tersimpan (hex bebas dari admin) → fallback colorMap
        supabase.from("product_variants").select("color, hex").eq("product_id", id).then(({ data }) => {
          const map: Record<string, string> = {};
          (data || []).forEach((v) => { if (v.hex) map[v.color] = v.hex; });
          setColorHex(map);
        });
        // Read color/size from URL params (preserved from series navigation)
        const urlColor = searchParams.get("color");
        const urlSize = searchParams.get("size");
        const initialColor = urlColor && p.colors.includes(urlColor) ? urlColor : (p.colors[0] || "");
        setSelectedColor(initialColor);
        if (urlSize) setSelectedSize(urlSize);
      }
      setLoading(false);
    });
  }, [id, searchParams]);

  // Meta Pixel: ViewContent
  useEffect(() => {
    if (product) {
      trackViewContent({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
      });
    }
  }, [product?.id]);

  // Fetch images from Supabase product_images table
  useEffect(() => {
    if (!id) return;
    supabase.from("product_images").select("url, color, is_video, display_order").eq("product_id", id).order("display_order").then(({ data }) => {
      if (data && data.length > 0) {
        const items: MediaItem[] = data.map((d) => ({
          src: d.url,
          type: d.is_video ? "video" as const : "image" as const,
          color: d.color,
        }));
        setSupabaseMedia(items);
      }
    });
  }, [id]);

  // Fetch new product data when activeSeriesId changes (without navigating)
  useEffect(() => {
    // Skip refetch hanya jika produk tersebut memang sudah dimuat (ref),
    // bukan karena id-nya sama dengan slug URL — kembalinya ke series dasar
    // TETAP harus me-refresh foto & data (fix bug: foto tidak berganti).
    if (!activeSeriesId || loadedSeriesIdRef.current === activeSeriesId) return;
    loadedSeriesIdRef.current = activeSeriesId;
    getProductById(activeSeriesId).then((p) => {
      if (p) {
        setProduct(p);
        // Fetch color hex for the new product
        supabase.from("product_variants").select("color, hex").eq("product_id", activeSeriesId).then(({ data }) => {
          const map: Record<string, string> = {};
          (data || []).forEach((v) => { if (v.hex) map[v.color] = v.hex; });
          setColorHex(map);
        });
        // Fetch gallery for the new product
        supabase.from("product_images").select("url, color, is_video, display_order").eq("product_id", activeSeriesId).order("display_order").then(({ data }) => {
          if (data && data.length > 0) {
            const items: MediaItem[] = data.map((d) => ({
              src: d.url,
              type: d.is_video ? "video" as const : "image" as const,
              color: d.color,
            }));
            setSupabaseMedia(items);
          } else {
            setSupabaseMedia([]);
          }
        });
        // Reset gallery index & color
        setActiveIndex(0);
        setSelectedColor(p.colors[0] || "");
      }
    });
  }, [activeSeriesId, id, isThobe]);

  // Reset variant state when switching series (avoid stale data from old product)
  useEffect(() => {
    setVariantPrice(null);
    setStock(null);
  }, [displayId]);

  // Reset gallery when color changes
  useEffect(() => {
    setActiveIndex(0);
    setCurrentSlide(0);
    if (carouselRef.current) carouselRef.current.scrollTo({ left: 0 });
  }, [selectedColor]);

  // Fetch available series when jenis_kain_id (atau series) / color changes
  useEffect(() => {
    if (!product?.jenis_kain_id && !product?.series) {
      setAvailableSeries([]);
      return;
    }
    // Thobe tidak pakai warna, jadi tetap fetch series meskipun selectedColor kosong
    if (!selectedColor && product.category !== "Thobe") {
      setAvailableSeries([]);
      return;
    }
    getAvailableSeries(product.jenis_kain_id, selectedColor || "", product.category, product.series || undefined, product.name || undefined).then(setAvailableSeries);
  }, [product?.jenis_kain_id, product?.series, selectedColor]);

  useEffect(() => {
    if (!displayId || !selectedColor) return;
    supabase.from("product_variants").select("size, price_override").eq("product_id", displayId).eq("color", selectedColor).order("display_order").then(({ data }) => {
      if (data && data.length > 0) {
        const sizes = data.map((d) => d.size);
        setAvailableSizes(sizes);
        if (!sizes.includes(selectedSize)) setSelectedSize(sizes[0]);
      } else {
        setAvailableSizes(FALLBACK_SIZES);
        setVariantPrice(null);
        setStock(null);
      }
    });
  }, [displayId, selectedColor]);

  useEffect(() => {
    if (!displayId || !selectedColor || !selectedSize) { setVariantPrice(null); setStock(null); return; }
    supabase.from("product_variants").select("price_override, stock").eq("product_id", displayId).eq("color", selectedColor).eq("size", selectedSize).maybeSingle().then(({ data, error }) => {
      if (error) { setVariantPrice(null); setStock(null); return; }
      setVariantPrice(data?.price_override ?? null);
      setStock(data?.stock ?? null);
    });
  }, [displayId, selectedColor, selectedSize]);

  const currentPrice = variantPrice ?? product?.price ?? 0;
  // Stok varian yang sedang dipilih (color + size). null = varian tidak dikelola stoknya
  const isOutOfStock = stock === 0;
  const stockExceeded = stock !== null && qty > stock;
  const isCYP = product?.create_your_price_enabled ?? false;
  const minimumPrice = product?.minimum_price ?? currentPrice;
  const recommendedPrice = product?.recommended_price ?? null;

  // Create Your Price state
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [customPriceInput, setCustomPriceInput] = useState("");
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [customPriceError, setCustomPriceError] = useState("");

  // Initialize selectedPrice when product loads (default to recommended, fallback to minimum)
  useEffect(() => {
    if (product && isCYP && minimumPrice > 0) {
      const initialPrice = recommendedPrice && recommendedPrice > minimumPrice ? recommendedPrice : minimumPrice;
      setSelectedPrice(initialPrice);
      console.log("[CYP] Initialized selectedPrice:", initialPrice, "(recommended:", recommendedPrice, "minimum:", minimumPrice, ")");
    }
  }, [product?.id, isCYP, minimumPrice, recommendedPrice]);

  // Price to use for cart/checkout — fallback to recommendedPrice, then minimumPrice
  const defaultCYPPrice = recommendedPrice && recommendedPrice > minimumPrice ? recommendedPrice : minimumPrice;
  const effectivePrice = isCYP ? (selectedPrice || defaultCYPPrice) : currentPrice;

  // Quick select options — 3 choices: Minimum, Recommended, Custom
  const quickPrices = isCYP && minimumPrice > 0 ? [
    { label: "Harga Minimum", value: minimumPrice, highlight: false },
    ...(recommendedPrice && recommendedPrice > minimumPrice
      ? [{ label: "Rekomendasi Samaqu", value: recommendedPrice, highlight: true }]
      : []),
  ] : [];

  function handleQuickPrice(value: number) {
    console.log("[CYP] Quick price selected:", value);
    setIsCustomPrice(false);
    setSelectedPrice(value);
    setCustomPriceInput("");
    setCustomPriceError("");
  }

  function handleCustomPriceToggle() {
    setIsCustomPrice(true);
    setSelectedPrice(minimumPrice);
    setCustomPriceInput("");
    setCustomPriceError("");
  }

  function handleCustomPriceChange(val: string) {
    setCustomPriceInput(val);
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || num === 0) {
      setSelectedPrice(minimumPrice);
      setCustomPriceError("");
      return;
    }
    setSelectedPrice(num);
    if (num < minimumPrice) {
      setCustomPriceError(`Harga minimum untuk produk ini adalah Rp ${minimumPrice.toLocaleString("id-ID")}. Silakan pilih harga tersebut atau lebih.`);
    } else {
      setCustomPriceError("");
    }
  }

  const isPriceValid = !isCYP || selectedPrice >= minimumPrice;

  function handleAddToCart() {
    if (!product) return;
    const finalCYPPrice = selectedPrice || defaultCYPPrice;
    if (isCYP && finalCYPPrice < minimumPrice) return;
    if (isOutOfStock) { toast.show("Stok habis — produk ini tidak dapat ditambahkan"); return; }
    if (stockExceeded) { toast.show(`Stok hanya tersisa ${stock} pcs untuk varian ini`); return; }

    // Find image for selected color, fallback to main product image
    const colorImage = media.find((m) => m.type === "image" && m.src?.toLowerCase().includes(selectedColor?.toLowerCase() || ""))?.src
      || media.find((m) => m.type === "image")?.src
      || product.image;

    console.log("[CYP] handleAddToCart:", { isCYP, selectedPrice, minimumPrice, finalCYPPrice, effectivePrice, colorImage });

    addItem({
      id: displayId,
      name: product.name,
      image: colorImage,
      price: isCYP ? minimumPrice : currentPrice,
      color: selectedColor || product.colors[0] || "-",
      size: selectedSize,
      series: availableSeries.find((s) => s.id === displayId)?.series || product.series || undefined,
      qty,
      notes: notes || undefined,
      // CYP fields
      customer_price: isCYP ? finalCYPPrice : undefined,
      minimum_price: isCYP ? minimumPrice : undefined,
      create_your_price_enabled: isCYP || undefined,
    });
    toast.show("Ditambahkan ke keranjang");

    // Meta Pixel: AddToCart
    trackAddToCart({
      id: displayId,
      name: product.name,
      price: isCYP ? minimumPrice : currentPrice,
      quantity: qty,
    });
  }

  function handleBuyNow() {
    if (!product) return;
    if (!selectedSize) { toast.show("Pilih ukuran terlebih dahulu"); return; }
    if (isOutOfStock) { toast.show("Stok habis — produk ini tidak dapat dipesan"); return; }
    if (stockExceeded) { toast.show(`Stok hanya tersisa ${stock} pcs untuk varian ini`); return; }
    const seriesName = availableSeries.find((s) => s.id === displayId)?.series || product.series || "";
    const color = selectedColor || product.colors[0] || "-";
    const variantParts = [seriesName, color !== "default" ? color : null].filter(Boolean).join(" - ");
    let msg = `Halo, saya mau pesan produk:\n${product.name}${variantParts ? " - " + variantParts : ""} - Ukuran ${selectedSize}\nHarga: Rp ${effectivePrice.toLocaleString("id-ID")}\nJumlah: ${qty}`;
    if (notes) msg += `\nCatatan: ${notes}`;
    trackWhatsAppClick("product_detail", displayId);
    window.open(getWhatsAppLink(msg), "_blank");
  }

  function handleSeriesSelect(seriesId: string) {
    if (seriesId === activeSeriesId) return;
    setActiveSeriesId(seriesId);
    scrollToGalleryOnMobile();
  }

  // Auto-scroll to gallery on mobile only (used saat ganti series maupun warna)
  function scrollToGalleryOnMobile() {
    if (typeof window === "undefined" || window.innerWidth >= 768 || !mobileGalleryRef.current) return;
    const galleryRect = mobileGalleryRef.current.getBoundingClientRect();
    const scrollDistanceFromGallery = galleryRect.top;

    // Only scroll if customer is more than 300px away from gallery
    if (scrollDistanceFromGallery < -300) {
      // Calculate target position: gallery top with some padding (80px for navbar)
      const targetScroll = window.scrollY + galleryRect.top - 80;

      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });

      // Add highlight effect after scroll completes
      setTimeout(() => {
        setGalleryHighlight(true);
        setTimeout(() => setGalleryHighlight(false), 500);
      }, 400);
    }
  }

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const itemWidth = carouselRef.current.scrollWidth / media.length;
    const index = Math.round(scrollLeft / itemWidth);
    setCurrentSlide(Math.min(index, media.length - 1));
  };

  const goToSlide = (i: number) => {
    if (!carouselRef.current) return;
    const clamped = Math.max(0, Math.min(media.length - 1, i));
    const itemWidth = carouselRef.current.scrollWidth / media.length;
    carouselRef.current.scrollTo({ left: clamped * itemWidth, behavior: "smooth" });
    setCurrentSlide(clamped);
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

  // Use Supabase images if available, otherwise fall back to static data
  const baseMedia = dedupeByUrl(
    supabaseMedia.length > 0
      ? supabaseMedia
      : (product.media.length > 0 ? product.media : [{ src: product.image, type: "image" as const }])
  );
  const media = selectedColor
    ? baseMedia.filter((m) => !m.color || m.color === selectedColor)
    : baseMedia;
  // Setiap video diberi poster foto yang BEDA (hindari foto utama muncul 3×:
  // poster utama + thumbnail video 1 + thumbnail video 2 semuanya foto pertama)
  const usedPosters = new Set<string>();
  const galleryMedia: GalleryMedia[] = media.map((m) => {
    if (m.type !== "video") return m;
    const poster = media.find((x) => x.type === "image" && !usedPosters.has(x.src))?.src || product.image;
    usedPosters.add(poster);
    return { ...m, poster };
  });
  const safeActiveIndex = Math.min(activeIndex, galleryMedia.length - 1);
  const activeMedia = galleryMedia[safeActiveIndex] ?? { src: product.image, type: "image" as const };
  // Thumbnail tidak memuat ulang item yang tampil sama dengan item aktif
  // (bandingkan visual yang benar-benar dirender: poster utk video, src utk foto)
  // supaya gambar utama tidak terduplikasi di strip thumbnail.
  const activeVisualSrc = activeMedia.type === "video" ? activeMedia.poster || product.image : activeMedia.src;
  const thumbnails = galleryMedia
    .map((item, i) => ({ item, index: i }))
    .filter(({ item }) => (item.type === "video" ? item.poster || product.image : item.src) !== activeVisualSrc);

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ═══════════════════════════════════════
          MOBILE LAYOUT (max-md)
      ═══════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Breadcrumb mobile */}
        <div className="max-w-7xl mx-auto px-4" style={{ paddingTop: "80px", marginBottom: "32px" }}>
          <Breadcrumb extra={[{ label: product.name }]} />
        </div>
        {/* Gallery */}
        <div ref={mobileGalleryRef} className={`relative px-4 pb-1 transition-all duration-300 ${galleryHighlight ? "ring-2 ring-[var(--gold)] ring-offset-2" : ""}`}>
          <div className="relative rounded-3xl overflow-hidden aspect-[3/4]" style={{ background: "#e8dfd1" }}>
            <div
              ref={carouselRef}
              className="h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              onScroll={handleCarouselScroll}
            >
              {galleryMedia.map((item, i) => (
                <div
                  key={i}
                  className="relative shrink-0 w-full h-full snap-center cursor-zoom-in"
                  onClick={() => { setZoomIndex(i); setZoomOpen(true); }}
                >
                  <MediaDisplay item={item} poster={item.poster || product.image} allMedia={galleryMedia} className="absolute inset-0" />
                  {product.tag && i === 0 && (
                    <span className="absolute top-4 left-4 px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase font-ui font-medium rounded-sm z-10"
                      style={{ border: "1px solid var(--gold)", color: "var(--gold)", background: "rgba(248,246,242,.9)" }}>
                      {product.tag}
                    </span>
                  )}
                  {item.type === "video" && (
                    <span className="absolute top-4 right-4 px-2 py-1 text-[9px] tracking-[0.1em] uppercase font-ui font-medium rounded-sm z-10"
                      style={{ background: "rgba(0,0,0,.5)", color: "white" }}>
                      Video
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Wishlist button - mobile */}
            {isLoggedIn && product && (
              <button onClick={async () => { const added = await toggleWishlist(displayId); toast.show(added ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist"); }} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110" style={{ background: "rgba(255,255,255,.9)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted(displayId) ? "#e74c3c" : "none"} stroke={isWishlisted(displayId) ? "#e74c3c" : "var(--espresso)"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              </button>
            )}
            {media.length > 1 && (
              <>
                <button onClick={() => goToSlide(currentSlide - 1)} aria-label="Sebelumnya" className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 z-10" style={{ background: "rgba(255,255,255,.85)" }}>
                  <ChevronLeft size={16} style={{ color: "var(--espresso)" }} />
                </button>
                <button onClick={() => goToSlide(currentSlide + 1)} aria-label="Berikutnya" className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 z-10" style={{ background: "rgba(255,255,255,.85)" }}>
                  <ChevronRight size={16} style={{ color: "var(--espresso)" }} />
                </button>
              </>
            )}
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

        {/* Info */}
        <div className="relative mt-5 px-5 pb-6">
          <p className="text-[10px] tracking-[0.28em] uppercase font-ui mb-2" style={{ color: "var(--gold)" }}>
            Detail Produk
          </p>
          <h1 className="text-[1.5rem] sm:text-[1.8rem] font-semibold leading-tight mb-1.5"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              {product.name}{product.category === "Koko" ? (selectedColor && selectedColor !== "default" ? <span style={{ color: "var(--gold)" }}> - {selectedColor}</span> : null) : product.jenis_kain?.name ? <span style={{ color: "var(--gold)" }}> — Kain {product.jenis_kain.name}</span> : product.kain ? <span style={{ color: "var(--gold)" }}> — Kain {product.kain}</span> : product.series ? <span style={{ color: "var(--gold)" }}> — {product.series}</span> : selectedColor && selectedColor !== "default" ? <span style={{ color: "var(--gold)" }}> — {selectedColor}</span> : null}
          </h1>
          <p className="text-[13px] font-ui mb-5" style={{ color: "var(--stone)" }}>
            {product.category !== "Koko" && product.jenis_kain?.name && <span>Jenis kain <span style={{ color: "var(--gold)" }}>{product.jenis_kain.name}</span></span>}
            {product.category !== "Koko" && !product.jenis_kain?.name && product.kain && <span>Jenis kain <span style={{ color: "var(--gold)" }}>{product.kain}</span></span>}
            {product.category !== "Koko" && (product.jenis_kain?.name || product.kain) && " · "}
            <span style={{ color: "var(--gold)" }}>{product.category}</span>
            {" · ready stock"}
          </p>

          {/* Series Selector — selalu tampilkan untuk Thobe */}
          {(availableSeries.length > 1 || isThobe) && (
            <div className="mb-5">
              <p className="text-[10px] tracking-[0.1em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--espresso)" }}>
                Pilih Series
              </p>
              <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-2.5">
                {availableSeries.map((s) => {
                  const isActive = isThobe ? s.id === activeSeriesId : s.id === displayId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSeriesSelect(s.id)}
                      className="inline-flex items-center justify-between gap-1.5 px-3 py-2.5 md:px-3.5 md:py-2 rounded-lg text-[11px] md:text-[12px] font-ui transition-all duration-200 cursor-pointer min-w-0"
                      style={{
                        background: isActive ? "var(--espresso)" : "var(--cream-bright)",
                        color: isActive ? "var(--cream)" : "var(--coffee)",
                        border: `1px solid ${isActive ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                      }}
                    >
                      <span className="font-medium truncate">{s.series}</span>
                      <span className="text-[10px] md:text-[11px] shrink-0" style={{ color: isActive ? "rgba(248,245,241,.75)" : "var(--gold)" }}>
                        {s.create_your_price_enabled && s.minimum_price
                          ? `mulai dari Rp ${s.minimum_price.toLocaleString("id-ID")}`
                          : `mulai dari Rp ${s.price.toLocaleString("id-ID")}`
                        }
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Colors — TAMPIL DI ATAS Pilih Ukuran (khusus produk dengan varian warna) */}
          {product.category !== "Thobe" && product.colors.length > 0 && !(product.colors.length === 1 && product.colors[0] === "default") && (
            <div className="mb-5">
              <p className="text-[10px] tracking-[0.1em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--espresso)" }}>
                Pilih Warna
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.colors.map((c) => (
                  <button key={c} onClick={() => { setSelectedColor(c); scrollToGalleryOnMobile(); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-ui rounded-sm transition-all duration-200"
                    style={{ background: selectedColor === c ? "var(--espresso)" : "transparent", color: selectedColor === c ? "var(--cream)" : "var(--coffee)", border: `1px solid ${selectedColor === c ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorHex[c] || colorMap[c] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.1em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--espresso)" }}>Pilih Ukuran</p>
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

          {/* Price card */}
          <div className="mb-5 rounded-2xl p-5" style={{ background: "var(--cream-bright)", border: "1px solid rgba(201,183,156,.25)" }}>
            {isCYP ? (
              <div>
                <p className="text-[10px] tracking-[0.1em] uppercase font-ui mb-1" style={{ color: "var(--stone)" }}>Harga Minimum</p>
                <p className="text-[1.3rem] font-ui font-semibold mb-1" style={{ color: "var(--gold)" }}>
                  Rp {minimumPrice.toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] font-ui mb-3" style={{ color: "var(--stone)" }}>Pilih harga terbaikmu</p>
                {/* Quick select buttons */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickPrices.map((qp) => {
                    const isActive = !isCustomPrice && selectedPrice === qp.value;
                    const isRecommended = qp.highlight;
                    return (
                      <button key={qp.value} onClick={() => handleQuickPrice(qp.value)}
                        className="px-3 py-1.5 text-[11px] font-ui rounded-sm transition-all"
                        style={{
                          background: isActive ? (isRecommended ? "var(--gold)" : "var(--espresso)") : "transparent",
                          color: isActive ? "white" : (isRecommended ? "var(--gold)" : "var(--coffee)"),
                          border: `1.5px solid ${isActive ? (isRecommended ? "var(--gold)" : "var(--espresso)") : (isRecommended ? "var(--gold)" : "rgba(201,183,156,.3)")}`,
                        }}>
                        {isRecommended && "★ "}{qp.label} — Rp {qp.value.toLocaleString("id-ID")}
                      </button>
                    );
                  })}
                  <button onClick={handleCustomPriceToggle}
                    className="px-3 py-1.5 text-[11px] font-ui rounded-sm transition-all"
                    style={{ background: isCustomPrice ? "var(--espresso)" : "transparent", color: isCustomPrice ? "var(--cream)" : "var(--coffee)", border: `1px solid ${isCustomPrice ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                    Pilih Harga Lainnya
                  </button>
                </div>
                {/* Custom price input */}
                {isCustomPrice && (
                  <div className="mt-2">
                    <input type="text" value={customPriceInput} onChange={(e) => handleCustomPriceChange(e.target.value)}
                      placeholder={`Min. Rp ${minimumPrice.toLocaleString("id-ID")}`}
                      className="w-full px-3 py-2.5 text-[13px] font-ui rounded-sm outline-none"
                      style={{ background: "transparent", border: `1px solid ${customPriceError ? "#e74c3c" : "rgba(201,183,156,.3)"}`, color: "var(--espresso)" }} />
                    {customPriceError && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{customPriceError}</p>}
                  </div>
                )}
                <p className="text-[10px] font-ui mt-3" style={{ color: "var(--stone)" }}>
                  {cypMicrocopy}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] tracking-[0.1em] uppercase font-ui mb-1" style={{ color: "var(--stone)" }}>Harga</p>
                <p className="text-[1.3rem] font-ui font-semibold mb-1" style={{ color: "var(--gold)" }}>
                  Rp {currentPrice.toLocaleString("id-ID")}
                </p>
              </div>
            )}
            <div className="mt-3">
              {stock === 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#fde8e8", color: "#c0392b" }}>Habis</span>
              ) : stock !== null && stock <= 5 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#fef3cd", color: "#856404" }}>Stok Menipis — Tersisa {stock}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#e7ecdf", color: "#5b6b45" }}>Tersedia</span>
              )}
            </div>
          </div>
          <p className="text-[13px] leading-relaxed font-ui mb-5" style={{ color: "rgba(42,33,27,.8)" }}>
            {getDescription(product)}
          </p>

          <div className="h-px mb-5" style={{ background: "rgba(201,183,156,.2)" }} />

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
              <button onClick={() => setQty((q) => q + 1)} disabled={stock !== null && qty >= stock}
                className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }} aria-label="Tambah jumlah">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Info tambahan — accordion */}
          <div className="mb-5">
            <InfoAccordionGroup />
          </div>

          {/* Bottom spacer for sticky bar */}
          <div className="h-32" />
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
                Rp {(effectivePrice * qty).toLocaleString("id-ID")}
              </p>
            </div>
            <p className="text-[10px] font-ui" style={{ color: "var(--stone)" }}>
              {selectedSize}{selectedColor !== "-" && ` / ${selectedColor}`}
              {qty > 1 && ` × ${qty}`}
            </p>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={handleAddToCart} disabled={(isCYP && !isPriceValid) || stockExceeded || isOutOfStock}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] tracking-[0.06em] uppercase font-ui font-semibold transition-all duration-300 active:scale-[0.98] disabled:opacity-40"
              style={{ background: "transparent", color: "var(--gold)", border: "1.5px solid var(--gold)" }}>
              <ShoppingCart size={15} strokeWidth={1.5} />
              <span>{isOutOfStock ? "Stok Habis" : "Keranjang"}</span>
            </button>
            <button onClick={handleBuyNow} disabled={stockExceeded || isOutOfStock}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] tracking-[0.06em] uppercase font-ui font-semibold transition-all duration-300 active:scale-[0.98] disabled:opacity-40"
              style={{ background: "var(--espresso)", color: "white" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              <span>{isOutOfStock ? "Stok Habis" : "Pesan via WA"}</span>
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
          <div className="lg:sticky lg:top-24">
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden cursor-zoom-in" style={{ background: "#e8dfd1" }} onClick={() => { setZoomIndex(activeIndex); setZoomOpen(true); }}>
              <AnimatePresence mode="wait">
                <motion.div key={activeIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                  <MediaDisplay item={activeMedia} poster={activeMedia.poster || product.image} allMedia={galleryMedia} className="w-full h-full" />
                </motion.div>
              </AnimatePresence>
              {/* Wishlist button - desktop */}
              {isLoggedIn && (
              <button onClick={(e) => { e.stopPropagation(); toggleWishlist(displayId).then((added) => toast.show(added ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist")); }} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110" style={{ background: "rgba(255,255,255,.9)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted(displayId) ? "#e74c3c" : "none"} stroke={isWishlisted(displayId) ? "#e74c3c" : "var(--espresso)"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              </button>
              )}
              {product.tag && (
                <span className="absolute top-4 left-4 px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase font-ui font-medium rounded-sm z-10"
                  style={{ border: "1px solid var(--gold)", color: "var(--gold)", background: "rgba(248,246,242,.9)" }}>
                  {product.tag}
                </span>
              )}
              {activeMedia.type === "video" && (
                <span className="absolute bottom-4 left-4 px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase font-ui font-medium rounded-sm z-10"
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
            {/* Dots */}
            {media.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {media.map((_, i) => (
                  <span key={i} className="rounded-full transition-all duration-300"
                    style={{ background: i === activeIndex ? "var(--gold)" : "rgba(201,183,156,.4)", width: i === activeIndex ? "16px" : "6px", height: "6px" }} />
                ))}
              </div>
            )}
            {/* Thumbnails — tanpa item yang sedang tampil (hindari gambar utama duplikat) */}
            {media.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {thumbnails.map(({ item, index }) => (
                  <button key={index} onClick={() => setActiveIndex(index)}
                    className="relative aspect-square rounded-lg overflow-hidden transition-all duration-200"
                    style={{ boxShadow: activeIndex === index ? "0 0 0 2px var(--espresso)" : "0 0 0 1px rgba(201,183,156,.3)" }}
                    aria-label={`${item.type === "video" ? "Video" : "Foto"} ${index + 1}`}>
                    {item.type === "video" ? (
                      <>
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(232,223,209,.7)" }}>
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
          </div>

          {/* Info */}
          <motion.div className="sticky top-24 h-fit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-[11px] tracking-[0.28em] uppercase font-ui mb-3" style={{ color: "var(--gold)" }}>
              Detail Produk
            </p>
            <h1 className="text-[2rem] sm:text-[2.5rem] lg:text-[2.8rem] font-semibold leading-tight mb-2"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            {product.name}{product.category === "Koko" ? (selectedColor && selectedColor !== "default" ? <span style={{ color: "var(--gold)" }}> - {selectedColor}</span> : null) : product.jenis_kain?.name ? <span style={{ color: "var(--gold)" }}> — Kain {product.jenis_kain.name}</span> : product.kain ? <span style={{ color: "var(--gold)" }}> — Kain {product.kain}</span> : product.series ? <span style={{ color: "var(--gold)" }}> — {product.series}</span> : selectedColor && selectedColor !== "default" ? <span style={{ color: "var(--gold)" }}> — {selectedColor}</span> : null}
            </h1>
            <p className="text-[13px] font-ui mb-6" style={{ color: "var(--stone)" }}>
              {product.category !== "Koko" && product.jenis_kain?.name && <span>Jenis kain <span style={{ color: "var(--gold)" }}>{product.jenis_kain.name}</span></span>}
              {product.category !== "Koko" && !product.jenis_kain?.name && product.kain && <span>Jenis kain <span style={{ color: "var(--gold)" }}>{product.kain}</span></span>}
              {product.category !== "Koko" && (product.jenis_kain?.name || product.kain) && " · "}
              <span style={{ color: "var(--gold)" }}>{product.category}</span>
              {" · ready stock"}
            </p>
            {/* Series Selector — desktop */}
            {(availableSeries.length > 1 || isThobe) && (
              <div className="mb-6">
                <p className="text-[10.5px] tracking-[0.18em] uppercase text-[var(--muted)] mb-2.5">Pilih Series</p>
                <div className="flex flex-wrap gap-2">
                  {availableSeries.map((s) => {
                    const isActive = isThobe ? s.id === activeSeriesId : s.id === displayId;
                    if (isThobe) {
                      return (
                        <button key={s.id} onClick={() => handleSeriesSelect(s.id)}
                          className="px-4 py-2 rounded-lg text-[12.5px] transition"
                          style={{ background: isActive ? "var(--espresso)" : "var(--cream-bright)", color: isActive ? "var(--cream)" : "var(--coffee)", border: `1px solid ${isActive ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                          <span className="font-medium">{s.series}</span>
                          <span className="ml-1.5" style={{ color: isActive ? "rgba(248,245,241,.75)" : "var(--gold)" }}>
                            {s.create_your_price_enabled && s.minimum_price
                              ? `mulai dari Rp ${s.minimum_price.toLocaleString("id-ID")}`
                              : `mulai dari Rp ${s.price.toLocaleString("id-ID")}`
                            }
                          </span>
                        </button>
                      );
                    }
                    return (
                      <button key={s.id} onClick={() => handleSeriesSelect(s.id)}
                        className="px-4 py-2 rounded-lg text-[12.5px] transition cursor-pointer"
                        style={{ background: isActive ? "var(--espresso)" : "var(--cream-bright)", color: isActive ? "var(--cream)" : "var(--coffee)", border: `1px solid ${isActive ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                        <span className="font-medium">{s.series}</span>
                        <span className="ml-1.5" style={{ color: isActive ? "rgba(248,245,241,.75)" : "var(--gold)" }}>
                          {s.create_your_price_enabled && s.minimum_price
                            ? `mulai dari Rp ${s.minimum_price.toLocaleString("id-ID")}`
                            : `mulai dari Rp ${s.price.toLocaleString("id-ID")}`
                          }
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Colors — TAMPIL DI ATAS Pilih Ukuran (khusus produk dengan varian warna) */}
            {product.category !== "Thobe" && product.colors.length > 0 && !(product.colors.length === 1 && product.colors[0] === "default") && (
              <div className="mb-6">
                <p className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3" style={{ color: "var(--espresso)" }}>
                  Pilih Warna
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button key={c} onClick={() => setSelectedColor(c)}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] font-ui rounded-sm transition-all duration-200"
                      style={{ background: selectedColor === c ? "var(--espresso)" : "transparent", color: selectedColor === c ? "var(--cream)" : "var(--coffee)", border: `1px solid ${selectedColor === c ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colorHex[c] || colorMap[c] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Sizes — desktop */}
            <div className="mb-6">
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-[var(--muted)] mb-2.5">Pilih Ukuran</p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((s) => (
                  <button key={s} onClick={() => setSelectedSize(s)}
                    className="px-4 py-2 rounded-lg text-[12.5px] transition"
                    style={{ background: selectedSize === s ? "var(--espresso)" : "var(--cream-bright)", color: selectedSize === s ? "var(--cream)" : "var(--coffee)", border: `1px solid ${selectedSize === s ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Price card */}
            <div className="mb-8 rounded-2xl p-6" style={{ background: "var(--cream-bright)", border: "1px solid rgba(201,183,156,.25)" }}>
              {isCYP ? (
                <div>
                  <p className="text-[11px] tracking-[0.1em] uppercase font-ui mb-1" style={{ color: "var(--stone)" }}>Harga Minimum</p>
                  <p className="text-[20px] sm:text-[22px] font-ui font-semibold mb-1" style={{ color: "var(--gold)" }}>
                    Rp {minimumPrice.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[12px] font-ui mb-3" style={{ color: "var(--stone)" }}>Pilih harga terbaikmu</p>
                  {/* Quick select buttons */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {quickPrices.map((qp) => {
                      const isActive = !isCustomPrice && selectedPrice === qp.value;
                      const isRecommended = qp.highlight;
                      return (
                        <button key={qp.value} onClick={() => handleQuickPrice(qp.value)}
                          className="px-4 py-2 text-[12px] font-ui rounded-sm transition-all"
                          style={{
                            background: isActive ? (isRecommended ? "var(--gold)" : "var(--espresso)") : "transparent",
                            color: isActive ? "white" : (isRecommended ? "var(--gold)" : "var(--coffee)"),
                            border: `1.5px solid ${isActive ? (isRecommended ? "var(--gold)" : "var(--espresso)") : (isRecommended ? "var(--gold)" : "rgba(201,183,156,.3)")}`,
                          }}>
                          {isRecommended && "★ "}{qp.label} — Rp {qp.value.toLocaleString("id-ID")}
                        </button>
                      );
                    })}
                    <button onClick={handleCustomPriceToggle}
                      className="px-4 py-2 text-[12px] font-ui rounded-sm transition-all"
                      style={{ background: isCustomPrice ? "var(--espresso)" : "transparent", color: isCustomPrice ? "var(--cream)" : "var(--coffee)", border: `1px solid ${isCustomPrice ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                      Pilih Harga Lainnya
                    </button>
                  </div>
                  {/* Custom price input */}
                  {isCustomPrice && (
                    <div className="mt-2">
                      <input type="text" value={customPriceInput} onChange={(e) => handleCustomPriceChange(e.target.value)}
                        placeholder={`Min. Rp ${minimumPrice.toLocaleString("id-ID")}`}
                        className="w-full px-3 py-2.5 text-[14px] font-ui rounded-sm outline-none"
                        style={{ background: "transparent", border: `1px solid ${customPriceError ? "#e74c3c" : "rgba(201,183,156,.3)"}`, color: "var(--espresso)" }} />
                      {customPriceError && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{customPriceError}</p>}
                    </div>
                  )}
                  <p className="text-[11px] font-ui mt-3" style={{ color: "var(--stone)" }}>
                    {cypMicrocopy}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] tracking-[0.1em] uppercase font-ui mb-1" style={{ color: "var(--stone)" }}>Harga</p>
                  <p className="text-[20px] sm:text-[22px] font-ui font-semibold mb-1" style={{ color: "var(--gold)" }}>
                    Rp {currentPrice.toLocaleString("id-ID")}
                  </p>
                </div>
              )}
              <div className="mt-3">
                {stock === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#fde8e8", color: "#c0392b" }}>Habis</span>
                ) : stock !== null && stock <= 5 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#fef3cd", color: "#856404" }}>Stok Menipis — Tersisa {stock}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-ui font-medium px-2.5 py-1 rounded-full" style={{ background: "#e7ecdf", color: "#5b6b45" }}>Tersedia</span>
                )}
              </div>
            </div>
            <p className="text-sm sm:text-[15px] leading-relaxed font-ui mb-8" style={{ color: "rgba(42,33,27,.8)" }}>
              {getDescription(product)}
            </p>
            <div className="h-px mb-7" style={{ background: "rgba(201,183,156,.2)" }} />

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
                <button onClick={() => setQty((q) => q + 1)} disabled={stock !== null && qty >= stock} className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed" style={{ border: "1px solid rgba(201,183,156,.3)", color: "var(--espresso)" }} aria-label="Tambah jumlah"><Plus size={14} /></button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAddToCart} disabled={(isCYP && !isPriceValid) || stockExceeded || isOutOfStock}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-sm text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01] disabled:opacity-40"
                style={{ background: "transparent", color: "var(--gold)", border: "1.5px solid var(--gold)" }}>
                <ShoppingCart size={16} strokeWidth={1.5} />
                <span>{isOutOfStock ? "Stok Habis" : "Keranjang"}</span>
              </button>
              <button onClick={handleBuyNow} disabled={stockExceeded || isOutOfStock}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-sm text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01] hover:shadow-lg disabled:opacity-40"
                style={{ background: "var(--espresso)", color: "white", boxShadow: "0 8px 28px -8px rgba(45,33,27,.35)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                <span>{isOutOfStock ? "Stok Habis" : "Pesan via WA"}</span>
              </button>
            </div>

            {/* Info tambahan — accordion */}
            <div className="mt-7">
              <InfoAccordionGroup />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PRODUK LAIN DARI KAIN INI
      ══════════════════════════════════════════ */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-40 md:pb-20">
          <div className="flex items-end justify-between border-t pt-6" style={{ borderColor: "rgba(201,183,156,.2)" }}>
            <h2 className="text-[1.4rem] sm:text-[1.7rem] font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Produk lain dari kain ini
            </h2>
            <a href="/katalog" className="text-[12.5px] font-ui font-medium shrink-0" style={{ color: "var(--gold)" }}>
              Lihat semua &rsaquo;
            </a>
          </div>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((p) => (
              <RelatedProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          IMAGE/VIDEO ZOOM LIGHTBOX
      ══════════════════════════════════════════ */}
      <ImageZoom
        media={galleryMedia}
        initialIndex={zoomIndex}
        alt={product.name}
        isOpen={zoomOpen}
        onClose={() => setZoomOpen(false)}
      />

      {/* Kain & Series Info Modal */}
      <KainSeriesModal type={infoSheet} onClose={() => setInfoSheet(null)} />
    </section>
  );
}
