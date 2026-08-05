"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown, ChevronRight } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import {
  allCategories,
  colorMap,
  getKainOptions,
  getSeriesOptions,
  getColorOptions,
  type Category,
  type Product,
} from "@/lib/katalog-data";
import { getProducts } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import FilterDrawer, { applyFilters, type FilterState } from "@/components/FilterDrawer";
import KainSeriesModal, { getKainGradient, getKainSwatchColor } from "@/components/KainSeriesModal";
import { SITE_URL } from "@/lib/site-config";
import { useWishlist } from "@/lib/use-wishlist";
import { useSafeTranslations } from "@/lib/safe-i18n";

/* ── Katalog grouping: 1 produk utama (name + category) = 1 kartu ──
   Row per series dikumpulkan ke group; representative = row terlama.
   Harga kartu = termurah di antara semua series; colors = union semua member. */
interface CatalogProduct extends Product {
  availableSeries?: string[];
}

function effectivePrice(p: Product): number {
  return p.create_your_price_enabled && p.minimum_price ? p.minimum_price : p.price;
}

function groupByMainProduct(raw: Product[]): { items: CatalogProduct[]; memberIdsByRep: Record<string, string[]> } {
  const groups = new Map<string, Product[]>();
  for (const p of raw) {
    const key = `${p.category}::${p.name}`;
    const list = groups.get(key) || [];
    list.push(p);
    groups.set(key, list);
  }

  const items: CatalogProduct[] = [];
  const memberIdsByRep: Record<string, string[]> = {};

  for (const group of groups.values()) {
    const rep: CatalogProduct = { ...group[0] };
    memberIdsByRep[rep.id] = group.map((m) => m.id);

    if (group.length > 1) {
      const colors = new Set<string>();
      let cheapest = group[0];
      let cheapestValue = effectivePrice(group[0]);
      for (const member of group) {
        member.colors.forEach((c) => colors.add(c));
        const value = effectivePrice(member);
        if (value < cheapestValue) {
          cheapestValue = value;
          cheapest = member;
        }
      }
      rep.colors = [...colors];
      rep.price = cheapestValue;
      rep.minimum_price = cheapest.minimum_price;
      rep.create_your_price_enabled = cheapest.create_your_price_enabled;
      rep.availableSeries = [...new Set(group.map((m) => m.series).filter((s): s is string => !!s))].sort();
    }

    items.push(rep);
  }

  return { items, memberIdsByRep };
}

/* ── Animation ── */
const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};



/* ── Info Link Button (katalog listing) — not wired up yet ── */
function InfoLinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 rounded-full transition-all duration-200 hover:bg-[rgba(181,140,74,.09)]"
      style={{
        border: "1px solid rgba(181,140,74,.35)",
        background: "rgba(181,140,74,.05)",
      }}
    >
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-ui font-bold"
        style={{ background: "rgba(181,140,74,.14)", color: "var(--gold)" }}
      >
        i
      </span>
      <span
        className="flex-1 text-left text-[13px] sm:text-sm font-ui font-medium"
        style={{ color: "var(--gold)" }}
      >
        {label}
      </span>
      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--gold)" }} />
    </button>
  );
}

/* ── Jenis Kain swatch selector (katalog listing) ── */
function KainSwatchRow({ category, options, selected, onSelect }: { category: Category; options: string[]; selected: string | null; onSelect: (v: string | null) => void }) {
  const t = useSafeTranslations("katalog");
  if (options.length === 0) return null;
  return (
    <div>
      <p className="text-[13px] font-ui font-medium mb-3" style={{ color: "var(--espresso)" }}>
        Jenis Kain {category}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          onClick={() => onSelect(null)}
          className="flex items-center gap-3 rounded-lg px-3.5 py-3 text-[13px] font-ui transition-all duration-200"
          style={{
            background: selected === null ? "rgba(42,33,27,.06)" : "var(--cream-bright)",
            border: `1.5px solid ${selected === null ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
            color: "var(--coffee)",
          }}
        >
          <span className="w-6 h-6 rounded-full shrink-0" style={{ background: "linear-gradient(135deg,#141414,#CDBFB0)" }} />
          {t("all")}
        </button>
        {options.map((k) => (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className="flex items-center gap-3 rounded-lg px-3.5 py-3 text-[13px] font-ui transition-all duration-200"
            style={{
              background: selected === k ? "rgba(42,33,27,.06)" : "var(--cream-bright)",
              border: `1.5px solid ${selected === k ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
              color: "var(--coffee)",
            }}
          >
            <span className="w-6 h-6 rounded-full shrink-0" style={{ background: getKainGradient(k) || "#c9b79c" }} />
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Stock Threshold ── */
const LOW_STOCK_THRESHOLD = 3;

/* ── Badge Styles ── */
const BADGE_STYLES: Record<string, { label: string; bg: string; color: string; border?: string }> = {
  terlaris: { label: "Terlaris", bg: "var(--gold)", color: "white" },
  rekomendasi: { label: "Rekomendasi", bg: "rgba(248,246,242,.92)", color: "var(--espresso)", border: "1px solid rgba(201,183,156,.3)" },
  new: { label: "New", bg: "#e7ecdf", color: "#5b6b45" },
};

/* ── Product Card ── */
function ProductCard({ product, index, wishlist, colorHex, totalStock }: { product: CatalogProduct; index: number; wishlist: { isWishlisted: (id: string) => boolean; toggle: (id: string) => Promise<boolean | null>; isLoggedIn: boolean }; colorHex: Record<string, string>; totalStock: number | null }) {
  const t = useSafeTranslations("katalog");
  const toast = useToast();
  const kainName = product.jenis_kain?.name || product.kain;
  const c0 = colorHex[`${product.id}::${product.colors[0]}`] || colorMap[product.colors[0]];
  const c1 = colorHex[`${product.id}::${product.colors[1]}`] || colorMap[product.colors[1]];
  // Stock status
  const isSoldOut = totalStock === 0;
  const isLowStock = totalStock !== null && totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD;
  // Badge
  const badge = product.badge_type ? BADGE_STYLES[product.badge_type] : null;

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
    >
      <Link
        href={`/katalog/${product.id}`}
        className="group relative flex flex-col h-full rounded-2xl overflow-hidden cursor-pointer"
        style={{
          background: "var(--cream-bright)",
          border: "1px solid rgba(201,183,156,.2)",
        }}
      >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden" style={{ background: "#e8dfd1" }}>
        {/* Color gradient fallback (visible if image fails) */}
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
          style={{
            background: `linear-gradient(135deg, ${c0 || "#e8dfd1"}44, ${c1 || "#d4c5a9"}44)`,
          }}
        />
        {/* Actual product image */}
        <img
          src={product.media.find((m) => m.type === "image")?.src || product.image}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
          style={isSoldOut ? { filter: "grayscale(35%) brightness(.85)" } : undefined}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {/* Sold out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(42,33,27,.18)" }} />
        )}
        {/* Wishlist heart button */}
        {wishlist.isLoggedIn && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); wishlist.toggle(product.id).then((added) => { if (added !== null) toast.show(added ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist"); }); }}
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{ background: "rgba(255,255,255,.85)", backdropFilter: "blur(4px)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={wishlist.isWishlisted(product.id) ? "#e74c3c" : "none"} stroke={wishlist.isWishlisted(product.id) ? "#e74c3c" : "var(--espresso)"} strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
        </button>
        )}
        {/* Sold Out badge — top right */}
        {isSoldOut && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase font-ui font-semibold rounded-full z-10"
            style={{ background: "var(--espresso)", color: "white" }}
          >
            {t("soldOut")}
          </span>
        )}
        {/* Dynamic Badge — top right (below sold out if both) */}
        {!isSoldOut && badge && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase font-ui font-semibold rounded-full z-10"
            style={{ background: badge.bg, color: badge.color, border: badge.border || "none" }}
          >
            {product.badge_type === "terlaris" ? t("badgeTerlaris") : product.badge_type === "rekomendasi" ? t("badgeRekomendasi") : t("badgeNew")}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 md:p-4 flex flex-col flex-1">
        {/* Name */}
        <h3
          className="text-[14px] md:text-[16px] font-semibold leading-snug line-clamp-1"
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            color: "var(--espresso)",
          }}
        >
          {product.name}
        </h3>

        {/* Kain */}
        <p className="mt-1 text-[11.5px] font-ui" style={{ color: "var(--gold)" }}>
          {product.jenis_kain?.name ? `Kain ${product.jenis_kain.name}` : product.kain ? `Kain ${product.kain}` : product.category}
        </p>

        {/* Series — fixed height slot */}
        <div className="mt-1.5 min-h-[22px]">
          {product.availableSeries && product.availableSeries.length > 1 && (
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-ui" style={{ color: "var(--stone)" }}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(181,140,74,.08)", border: "1px solid rgba(181,140,74,.2)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: "var(--gold)" }}>
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
                {t("seriesAvail", { count: String(product.availableSeries.length) })}
              </span>
            </p>
          )}
        </div>

        {/* Stock status — microcopy above price */}
        {!isSoldOut && totalStock !== null && (
          <p className="mt-1 text-[10.5px] font-ui line-clamp-1" style={{ color: isLowStock ? "#b45309" : "#6b8a5e" }}>
            {isLowStock ? t("lowStock", { count: String(totalStock) }) : t("readyStock")}
          </p>
        )}

        {/* Price */}
        <p className="mt-1 text-[12.5px] font-ui" style={{ color: "var(--stone)" }}>
          {t("starting")}{" "}
          <span className="font-medium" style={{ color: "var(--espresso)" }}>
            Rp {(product.create_your_price_enabled && product.minimum_price ? product.minimum_price : product.price).toLocaleString("id-ID")}
          </span>
        </p>

        {/* Lihat Detail button */}
        <span className="mt-auto pt-3 w-full rounded-lg border border-[var(--espresso)] px-3 py-2.5 text-[12.5px] text-[var(--espresso)] font-ui font-medium flex items-center justify-center gap-1.5 transition-all duration-200 group-hover:bg-[var(--espresso)] group-hover:text-white">
          {isSoldOut ? t("viewDetail") : t("viewDetail")} <ChevronRight size={14} strokeWidth={2} />
        </span>
      </div>
      </Link>
    </motion.div>
  );
}

/* ── Filter Panel (legacy inline — kept for reference, replaced by FilterDrawer) ── */

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function KatalogPage() {
  const t = useSafeTranslations("katalog");
  const [category, setCategory] = useState<Category | "Semua">("Semua");
  const [selectedKain, setSelectedKain] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "az" | "popular">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [drawerFilters, setDrawerFilters] = useState<FilterState>({ sizes: [], colors: [], priceRange: null });
  const [infoSheet, setInfoSheet] = useState<"kain" | "series" | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [colorHex, setColorHex] = useState<Record<string, string>>({});
  const [stockByProduct, setStockByProduct] = useState<Record<string, number>>({});
  const wishlist = useWishlist();

  /* Fetch products from database */
  useEffect(() => {
    getProducts().then((data) => {
      setProducts(data);
      setLoading(false);
      // Warna hex tersimpan (hex bebas dari admin) → fallback colorMap
      if (data.length > 0) {
        supabase
          .from("product_variants")
          .select("product_id, color, hex, stock")
          .in("product_id", data.map((p) => p.id))
          .then(({ data: rows }) => {
            const map: Record<string, string> = {};
            const stockMap: Record<string, number> = {};
            (rows || []).forEach((v) => {
              if (v.hex) map[`${v.product_id}::${v.color}`] = v.hex;
              stockMap[v.product_id] = (stockMap[v.product_id] || 0) + (v.stock || 0);
            });
            setColorHex(map);
            setStockByProduct(stockMap);
          });
      }
    });
  }, []);

  /* Grouping: 1 kartu per produk utama (name + category), series digabung jadi 1 */
  const { items: catalogItems, memberIdsByRep } = useMemo(() => groupByMainProduct(products), [products]);

  /* Stok gabungan per group (sum semua series member) untuk badge stok kartu */
  const groupStock = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [repId, memberIds] of Object.entries(memberIdsByRep)) {
      map[repId] = memberIds.reduce((sum, id) => sum + (stockByProduct[id] || 0), 0);
    }
    return map;
  }, [stockByProduct, memberIdsByRep]);

  /* Reset sub-filters when category changes */
  useEffect(() => {
    setSelectedKain(null);
    setSelectedColor(null);
    setSelectedSeries(null);
  }, [category]);

  /* Jenis kain yang tersedia untuk kategori yang sedang aktif (dari data produk live) */
  const kainOptionsForCategory = useMemo(() => {
    if (category === "Semua") return [];
    return [...new Set(products.filter((p) => p.category === category && (p.jenis_kain?.name || p.kain)).map((p) => (p.jenis_kain?.name || p.kain) as string))];
  }, [products, category]);

  /* Filtered products (sudah di-group per produk utama) */
  const filtered = useMemo(() => {
    let result = [...catalogItems];

    if (category !== "Semua") {
      result = result.filter((p) => p.category === category);
    }
    if (selectedKain) {
      result = result.filter((p) => (p.jenis_kain?.name || p.kain) === selectedKain);
    }
    if (selectedColor) {
      result = result.filter((p) => p.colors.includes(selectedColor));
    }
    if (selectedSeries) {
      result = result.filter((p) => p.series === selectedSeries || (p.availableSeries && p.availableSeries.includes(selectedSeries)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          ((p.jenis_kain?.name || p.kain) && (p.jenis_kain?.name || p.kain)!.toLowerCase().includes(q)) ||
          (p.series && p.series.toLowerCase().includes(q)) ||
          (p.availableSeries && p.availableSeries.some((s) => s.toLowerCase().includes(q)))
      );
    }

    // Apply drawer filters
    result = applyFilters(result, drawerFilters);

    if (sort === "az") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [catalogItems, category, selectedKain, selectedColor, selectedSeries, sort, searchQuery, drawerFilters]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const activeFilters = [
    searchQuery.trim() && { type: "search" as const, label: `"${searchQuery}"`, clear: () => { setSearchQuery(""); setVisibleCount(12); } },
    selectedKain && { type: "kain" as const, label: `Kain: ${selectedKain}`, clear: () => setSelectedKain(null) },
    selectedColor && { type: "color" as const, label: selectedColor, clear: () => setSelectedColor(null) },
    selectedSeries && { type: "series" as const, label: `Series: ${selectedSeries}`, clear: () => setSelectedSeries(null) },
    ...drawerFilters.sizes.map((s) => ({ type: "size" as const, label: `UK ${s}`, clear: () => setDrawerFilters((f) => ({ ...f, sizes: f.sizes.filter((x) => x !== s) })) })),
    ...drawerFilters.colors.map((c) => ({ type: "dcolor" as const, label: c, clear: () => setDrawerFilters((f) => ({ ...f, colors: f.colors.filter((x) => x !== c) })) })),
    drawerFilters.priceRange && { type: "price" as const, label: drawerFilters.priceRange === "under300" ? "< 300rb" : drawerFilters.priceRange === "300to500" ? "300-500rb" : "> 500rb", clear: () => setDrawerFilters((f) => ({ ...f, priceRange: null })) },
  ].filter(Boolean) as { type: string; label: string; clear: () => void }[];

  const drawerFilterCount = drawerFilters.sizes.length + drawerFilters.colors.length + (drawerFilters.priceRange ? 1 : 0);

  function resetAll() {
    setCategory("Semua");
    setSelectedKain(null);
    setSelectedColor(null);
    setSelectedSeries(null);
    setSearchQuery("");
    setDrawerFilters({ sizes: [], colors: [], priceRange: null });
    setVisibleCount(12);
  }

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* CollectionPage JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Katalog Produk SAMAQU",
        description: "Koleksi busana pria muslim premium — Thobe, Kandora, Koko, Vest, Kabak, Cover Hanger.",
        url: `${SITE_URL}/katalog`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: catalogItems.length,
          itemListElement: catalogItems.slice(0, 50).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@type": "Product", name: p.name, sku: p.id, category: p.category, image: p.image, offers: { "@type": "Offer", priceCurrency: "IDR", price: p.price, availability: groupStock[p.id] === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" } },
          })),
        },
      }) }} />
      {/* ── Page Header ── */}
      <div className="pt-24 pb-6 sm:pt-32 sm:pb-16 lg:pt-36 lg:pb-16">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
          <div className="mb-3 sm:mb-8">
            <Breadcrumb />
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p
              variants={headerVariants}
              className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-2 sm:mb-4 font-ui font-medium"
              style={{ color: "var(--gold)" }}
            >
              {t("eyebrow")}
            </motion.p>
            <motion.h1
              variants={headerVariants}
              className="text-[1.5rem] sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight mb-2 sm:mb-4"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                color: "var(--espresso)",
              }}
            >
              {t("title")}
            </motion.h1>
            <motion.p
              variants={headerVariants}
              className="text-[13px] sm:text-base leading-relaxed max-w-lg font-ui"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("subtitle")}
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* ── Controls: Search + Filter + Sort (desktop unified, mobile 2-row) ── */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* Row 1: Search bar */}
        <div className="mb-3 sm:mb-6 lg:mb-8">
          <div className="lg:max-w-none lg:ml-0 max-w-md ml-auto relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={searchQuery ? "var(--gold)" : "var(--warm-sand)"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors duration-200"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(12);
              }}
              placeholder={t("search")}
              className="w-full pl-9 pr-4 py-3 text-[14px] font-ui outline-none transition-all duration-200"
              style={{
                background: "transparent",
                borderBottom: "1px solid rgba(216,196,168,.4)",
                color: "var(--espresso)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderBottomColor = "var(--gold)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderBottomColor = "rgba(216,196,168,.4)";
              }}
            />
          </div>
        </div>

        {/* Row 2 (mobile): Category chips scrollable + Filter/Sort — mobile only */}
        <div className="lg:hidden">
          <div className="py-2 sm:py-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2.5">
              {(["Semua", ...allCategories] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setVisibleCount(12); }}
                  className="relative px-4 py-2.5 text-[12px] tracking-[0.06em] font-ui font-medium rounded-full transition-all duration-300 whitespace-nowrap"
                  style={{
                    background: category === cat ? "var(--espresso)" : "transparent",
                    color: category === cat ? "var(--cream)" : "var(--coffee)",
                    border: `1px solid ${category === cat ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {(category === "Thobe" || category === "Kandora") && (
            <div className="pb-3 sm:pb-5">
              <KainSwatchRow category={category} options={kainOptionsForCategory} selected={selectedKain} onSelect={setSelectedKain} />
            </div>
          )}

          {/* Info link buttons — Jenis Kain & Series (mobile) */}
          {(category === "Thobe" || category === "Kandora") && (
            <div className="flex flex-col gap-3 pb-2 sm:pb-4">
              <InfoLinkButton
                label={`Perbedaan Jenis Kain ${category}`}
                onClick={() => setInfoSheet("kain")}
              />
              {category === "Thobe" && (
                <InfoLinkButton
                  label={`Perbedaan Series ${category}`}
                  onClick={() => setInfoSheet("series")}
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between pb-2 sm:pb-4">
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 text-[12px] font-ui rounded-full transition-all duration-200"
              style={{
                border: `1px solid ${drawerFilterCount > 0 ? "var(--gold)" : "rgba(201,183,156,.3)"}`,
                background: drawerFilterCount > 0 ? "rgba(181,140,74,.08)" : "transparent",
                color: drawerFilterCount > 0 ? "var(--gold)" : "var(--coffee)",
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={1.5} />
              {t("filter")}
              {drawerFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-ui font-bold"
                  style={{ background: "var(--gold)", color: "white" }}>
                  {drawerFilterCount}
                </span>
              )}
            </button>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="appearance-none px-4 py-2.5 pr-9 text-[12px] font-ui rounded-full cursor-pointer transition-all duration-200"
                style={{ border: "1px solid rgba(201,183,156,.3)", background: "transparent", color: "var(--coffee)" }}
              >
                <option value="newest">{t("sortNew")}</option>
                <option value="az">{t("sortAZ")}</option>
                <option value="popular">{t("sortPop")}</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--stone)" }} />
            </div>
          </div>
        </div>

        {/* Row 2 (desktop): Category chips left + Filter/Sort right — single line */}
        <div className="hidden lg:flex items-center justify-between py-5 border-b" style={{ borderColor: "rgba(216,196,168,.2)" }}>
          <div className="flex items-center gap-3">
            {(["Semua", ...allCategories] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setVisibleCount(12); }}
                className="relative px-5 py-2.5 text-[13px] tracking-[0.06em] font-ui font-medium rounded-full transition-all duration-300 whitespace-nowrap"
                style={{
                  background: category === cat ? "var(--espresso)" : "transparent",
                  color: category === cat ? "var(--cream)" : "var(--coffee)",
                  border: `1px solid ${category === cat ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 text-[12px] font-ui rounded-full transition-all duration-200"
              style={{
                border: `1px solid ${drawerFilterCount > 0 ? "var(--gold)" : "rgba(201,183,156,.3)"}`,
                background: drawerFilterCount > 0 ? "rgba(181,140,74,.08)" : "transparent",
                color: drawerFilterCount > 0 ? "var(--gold)" : "var(--coffee)",
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={1.5} />
              {t("filter")}
              {drawerFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-ui font-bold"
                  style={{ background: "var(--gold)", color: "white" }}>
                  {drawerFilterCount}
                </span>
              )}
            </button>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="appearance-none px-4 py-2.5 pr-9 text-[12px] font-ui rounded-full cursor-pointer transition-all duration-200"
                style={{ border: "1px solid rgba(201,183,156,.3)", background: "transparent", color: "var(--coffee)" }}
              >
                <option value="newest">{t("sortNew")}</option>
                <option value="az">{t("sortAZ")}</option>
                <option value="popular">{t("sortPop")}</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--stone)" }} />
            </div>
          </div>
        </div>

        {(category === "Thobe" || category === "Kandora") && (
          <div className="hidden lg:block pt-5">
            <KainSwatchRow category={category} options={kainOptionsForCategory} selected={selectedKain} onSelect={setSelectedKain} />
          </div>
        )}

        {/* Info link buttons — Jenis Kain & Series (desktop) */}
        {(category === "Thobe" || category === "Kandora") && (
          <div className="hidden lg:flex flex-col gap-3 py-5">
            <InfoLinkButton
              label={`Perbedaan Jenis Kain ${category}`}
              onClick={() => setInfoSheet("kain")}
            />
            {category === "Thobe" && (
              <InfoLinkButton
                label={`Perbedaan Series ${category}`}
                onClick={() => setInfoSheet("series")}
              />
            )}
          </div>
        )}

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 py-3 flex-wrap">
            {activeFilters.map((f) => (
              <span
                key={f!.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-ui rounded-full"
                style={{ background: "var(--espresso)", color: "var(--cream)" }}
              >
                {f!.label}
                <button onClick={f!.clear} className="hover:opacity-70 transition-opacity">
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              onClick={resetAll}
              className="text-[11px] font-ui underline transition-colors hover:text-gold"
              style={{ color: "var(--stone)" }}
            >
              {t("reset")}
            </button>
          </div>
        )}
      </div>

      {/* ── Product Grid ── */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 py-4 sm:py-12">
        {filtered.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <p className="text-lg font-medium mb-3" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              {t("emptyState")}
            </p>
            <button
              onClick={resetAll}
              className="mt-2 px-6 py-2.5 text-[12px] tracking-[0.08em] uppercase font-ui font-medium rounded-full transition-all duration-200 hover:opacity-80"
              style={{ background: "var(--espresso)", color: "var(--cream)" }}
            >
              {t("reset")}
            </button>
          </div>
        ) : (
          <>
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6"
            >
              <AnimatePresence mode="popLayout">
                {visible.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} wishlist={wishlist} colorHex={colorHex} totalStock={groupStock[p.id] ?? null} />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-10 sm:mt-12">
                <button
                  onClick={() => setVisibleCount((v) => v + 12)}
                  className="px-8 py-3.5 text-[12px] tracking-[0.1em] uppercase font-ui font-medium rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    background: "var(--espresso)",
                    color: "var(--cream)",
                    boxShadow: "0 4px 16px -4px rgba(42,33,27,.2)",
                  }}
                >
                  {t("loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        initial={drawerFilters}
        onApply={setDrawerFilters}
        activeCount={drawerFilterCount}
      />

      {/* Kain / Series info sheet */}
      <KainSeriesModal type={infoSheet} onClose={() => setInfoSheet(null)} />
    </section>
  );
}
