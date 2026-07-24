"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown, ArrowRight } from "lucide-react";
import {
  products,
  allCategories,
  colorMap,
  getKainOptions,
  getSeriesOptions,
  getColorOptions,
  type Category,
  type Product,
} from "@/lib/katalog-data";

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

/* ── Color Swatch ── */
function Swatch({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full border shrink-0"
      style={{
        width: size,
        height: size,
        background: colorMap[color] || "#ccc",
        borderColor: "rgba(42,33,27,.12)",
      }}
      title={color}
    />
  );
}

/* ── Product Card ── */
function ProductCard({ product, index }: { product: Product; index: number }) {
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
        className="group relative block bg-white rounded-sm overflow-hidden cursor-pointer"
        style={{
          boxShadow: "0 2px 12px -4px rgba(43,38,32,.06)",
          border: "1px solid rgba(201,183,156,.12)",
        }}
      >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "#e8dfd1" }}>
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
          style={{
            background: `linear-gradient(135deg, ${colorMap[product.colors[0]] || "#e8dfd1"}44, ${colorMap[product.colors[1]] || "#d4c5a9"}44)`,
          }}
        />
        {/* Tag */}
        {product.tag && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase font-ui font-medium rounded-sm"
            style={{
              border: "1px solid var(--gold)",
              color: "var(--gold)",
              background: "rgba(248,246,242,.9)",
            }}
          >
            {product.tag}
          </span>
        )}
        {/* Quick View pill */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span
            className="px-4 py-2 text-[11px] tracking-[0.12em] uppercase font-ui font-medium rounded-full"
            style={{ background: "rgba(248,246,242,.95)", color: "var(--espresso)" }}
          >
            Quick View
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 sm:p-5">
        {/* Category + Kain */}
        <p
          className="text-[10px] sm:text-[11px] tracking-[0.14em] uppercase font-ui mb-1.5"
          style={{ color: "var(--stone)" }}
        >
          {product.category}
          {product.kain && ` — Kain ${product.kain}`}
          {product.series && ` — ${product.series}`}
        </p>

        {/* Name */}
        <h3
          className="text-[1rem] sm:text-[1.1rem] font-medium leading-snug mb-1"
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            color: "var(--espresso)",
          }}
        >
          {product.name}
        </h3>

        {/* Price */}
        <p
          className="text-[15px] sm:text-base font-ui font-medium mb-2"
          style={{ color: "var(--gold)" }}
        >
          Rp {product.price.toLocaleString("id-ID")}
        </p>

        {/* Color swatches */}
        {product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {product.colors.slice(0, 5).map((c) => (
              <Swatch key={c} color={c} />
            ))}
            {product.colors.length > 5 && (
              <span className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>
                +{product.colors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Note */}
        {product.note && (
          <p className="text-[11px] font-ui mb-3" style={{ color: "var(--stone)" }}>
            {product.note}
          </p>
        )}

        {/* Link */}
        <span className="inline-flex items-center gap-1.5 text-[12px] tracking-[0.08em] uppercase font-ui font-medium group-hover:gap-2.5 transition-all duration-300"
          style={{ color: "var(--gold)" }}
        >
          Lihat Detail
          <ArrowRight size={14} strokeWidth={1.5} />
        </span>
      </div>
      </Link>
    </motion.div>
  );
}

/* ── Filter Panel ── */
function FilterPanel({
  category,
  selectedKain,
  selectedColor,
  selectedSeries,
  onKainChange,
  onColorChange,
  onSeriesChange,
  onClose,
}: {
  category: Category;
  selectedKain: string | null;
  selectedColor: string | null;
  selectedSeries: string | null;
  onKainChange: (v: string | null) => void;
  onColorChange: (v: string | null) => void;
  onSeriesChange: (v: string | null) => void;
  onClose: () => void;
}) {
  const kainOptions = getKainOptions(category);
  const colorOptions = getColorOptions(category);
  const seriesOptions = getSeriesOptions(category);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="py-5 px-1 flex flex-wrap gap-6 sm:gap-8">
        {/* Kain */}
        {kainOptions.length > 1 && (
          <div>
            <p className="text-[11px] tracking-[0.14em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--stone)" }}>
              Jenis Kain
            </p>
            <div className="flex flex-wrap gap-2">
              {kainOptions.map((k) => (
                <button
                  key={k}
                  onClick={() => onKainChange(selectedKain === k ? null : k)}
                  className="px-3 py-1.5 text-[12px] font-ui rounded-sm transition-all duration-200"
                  style={{
                    background: selectedKain === k ? "var(--espresso)" : "transparent",
                    color: selectedKain === k ? "var(--cream)" : "var(--coffee)",
                    border: `1px solid ${selectedKain === k ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Colors */}
        {colorOptions.length > 0 && (
          <div>
            <p className="text-[11px] tracking-[0.14em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--stone)" }}>
              Warna
            </p>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => onColorChange(selectedColor === c ? null : c)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-ui rounded-sm transition-all duration-200"
                  style={{
                    background: selectedColor === c ? "var(--espresso)" : "transparent",
                    color: selectedColor === c ? "var(--cream)" : "var(--coffee)",
                    border: `1px solid ${selectedColor === c ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                  }}
                >
                  <Swatch color={c} size={12} />
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Series */}
        {seriesOptions.length > 0 && (
          <div>
            <p className="text-[11px] tracking-[0.14em] uppercase font-ui font-medium mb-2.5" style={{ color: "var(--stone)" }}>
              Series
            </p>
            <div className="flex flex-wrap gap-2">
              {seriesOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => onSeriesChange(selectedSeries === s ? null : s)}
                  className="px-3 py-1.5 text-[12px] font-ui rounded-sm transition-all duration-200"
                  style={{
                    background: selectedSeries === s ? "var(--espresso)" : "transparent",
                    color: selectedSeries === s ? "var(--cream)" : "var(--coffee)",
                    border: `1px solid ${selectedSeries === s ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function KatalogPage() {
  const [category, setCategory] = useState<Category | "Semua">("Semua");
  const [selectedKain, setSelectedKain] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "az" | "popular">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [searchQuery, setSearchQuery] = useState("");

  /* Reset sub-filters when category changes */
  useEffect(() => {
    setSelectedKain(null);
    setSelectedColor(null);
    setSelectedSeries(null);
  }, [category]);

  /* Filtered products */
  const filtered = useMemo(() => {
    let result = [...products];

    if (category !== "Semua") {
      result = result.filter((p) => p.category === category);
    }
    if (selectedKain) {
      result = result.filter((p) => p.kain === selectedKain);
    }
    if (selectedColor) {
      result = result.filter((p) => p.colors.includes(selectedColor));
    }
    if (selectedSeries) {
      result = result.filter((p) => p.series === selectedSeries);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.kain && p.kain.toLowerCase().includes(q)) ||
          (p.series && p.series.toLowerCase().includes(q))
      );
    }

    if (sort === "az") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [category, selectedKain, selectedColor, selectedSeries, sort, searchQuery]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const activeFilters = [
    searchQuery.trim() && { type: "search" as const, label: `"${searchQuery}"`, clear: () => { setSearchQuery(""); setVisibleCount(12); } },
    selectedKain && { type: "kain" as const, label: `Kain: ${selectedKain}`, clear: () => setSelectedKain(null) },
    selectedColor && { type: "color" as const, label: selectedColor, clear: () => setSelectedColor(null) },
    selectedSeries && { type: "series" as const, label: `Series: ${selectedSeries}`, clear: () => setSelectedSeries(null) },
  ].filter((f): f is { type: "search" | "kain" | "color" | "series"; label: string; clear: () => void } => Boolean(f));

  function resetAll() {
    setCategory("Semua");
    setSelectedKain(null);
    setSelectedColor(null);
    setSelectedSeries(null);
    setSearchQuery("");
    setVisibleCount(12);
  }

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ── Page Header ── */}
      <div className="pt-28 sm:pt-32 lg:pt-36 pb-10 sm:pb-14">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 sm:mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-[12px] font-ui" style={{ color: "var(--stone)" }}>
              <li><a href="/" className="hover:text-gold transition-colors">Home</a></li>
              <li>/</li>
              <li style={{ color: "var(--espresso)" }}>Katalog</li>
            </ol>
          </nav>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.p
              variants={headerVariants}
              className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 font-ui font-medium"
              style={{ color: "var(--gold)" }}
            >
              Koleksi Lengkap
            </motion.p>
            <motion.h1
              variants={headerVariants}
              className="text-[2rem] sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight mb-4"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                color: "var(--espresso)",
              }}
            >
              Katalog Samaqu
            </motion.h1>
            <motion.p
              variants={headerVariants}
              className="text-sm sm:text-base leading-relaxed max-w-lg font-ui"
              style={{ color: "var(--text-secondary)" }}
            >
              Temukan busana muslim premium yang sesuai dengan gaya dan kebutuhan Anda.
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 mb-6">
        <div className="max-w-md ml-auto relative">
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
            placeholder="Cari jubah, thobe, koko..."
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

      {/* ── Filter Bar (non-sticky) ── */}
      <div
        style={{
          background: "var(--cream)",
          borderBottom: "1px solid rgba(216,196,168,.2)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          {/* Category tabs + filter button */}
          <div className="flex items-center gap-3 py-6 sm:py-8 overflow-x-auto scrollbar-hide">
            {/* Category pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {(["Semua", ...allCategories] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setVisibleCount(12);
                  }}
                  className="relative px-3.5 sm:px-4 py-2 text-[12px] sm:text-[13px] tracking-[0.06em] font-ui font-medium rounded-full transition-all duration-300 whitespace-nowrap"
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

            {/* Spacer */}
            <div className="flex-1" />

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3.5 py-2 text-[12px] font-ui rounded-full transition-all duration-200 shrink-0"
              style={{
                border: `1px solid ${showFilters ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                background: showFilters ? "var(--espresso)" : "transparent",
                color: showFilters ? "var(--cream)" : "var(--coffee)",
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={1.5} />
              Filter
            </button>

            {/* Sort */}
            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="appearance-none px-3.5 py-2 pr-8 text-[12px] font-ui rounded-full cursor-pointer transition-all duration-200"
                style={{
                  border: "1px solid rgba(201,183,156,.3)",
                  background: "transparent",
                  color: "var(--coffee)",
                }}
              >
                <option value="newest">Terbaru</option>
                <option value="az">Nama A-Z</option>
                <option value="popular">Terpopuler</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--stone)" }} />
            </div>
          </div>

          {/* Sub-filter panel */}
          <AnimatePresence>
            {showFilters && category !== "Semua" && (
              <FilterPanel
                category={category}
                selectedKain={selectedKain}
                selectedColor={selectedColor}
                selectedSeries={selectedSeries}
                onKainChange={(v) => { setSelectedKain(v); setVisibleCount(12); }}
                onColorChange={(v) => { setSelectedColor(v); setVisibleCount(12); }}
                onSeriesChange={(v) => { setSelectedSeries(v); setVisibleCount(12); }}
                onClose={() => setShowFilters(false)}
              />
            )}
          </AnimatePresence>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 pb-3 flex-wrap">
              {activeFilters.map((f) => (
                <span
                  key={f!.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-ui rounded-full"
                  style={{
                    background: "var(--espresso)",
                    color: "var(--cream)",
                  }}
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
                Reset Filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {filtered.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <p className="text-lg font-medium mb-3" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Belum ada produk yang cocok dengan filter ini.
            </p>
            <button
              onClick={resetAll}
              className="mt-2 px-6 py-2.5 text-[12px] tracking-[0.08em] uppercase font-ui font-medium rounded-full transition-all duration-200 hover:opacity-80"
              style={{ background: "var(--espresso)", color: "var(--cream)" }}
            >
              Reset Filter
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
                  <ProductCard key={p.id} product={p} index={i} />
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
                  Muat Lebih Banyak
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
