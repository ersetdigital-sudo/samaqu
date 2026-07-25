"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle, MessageCircle, Play, ChevronDown, Loader2 } from "lucide-react";
import {
  testimoniData,
  testimoniCategories,
  type Testimoni,
  type TestimoniType,
  type TestimoniCat,
} from "./testimoni-data";

const PAGE = 6;

/* ── Helpers ── */
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill={i < n ? "#b89146" : "none"} stroke="#b89146" strokeWidth={1.4} />
      ))}
    </div>
  );
}

/* ── Testimoni Card ── */
function TestimoniCard({ t, index }: { t: Testimoni; index: number }) {
  const [ytPlaying, setYtPlaying] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (index % PAGE) * 0.06 }}
      className="break-inside-avoid mb-6"
    >
      <div
        className="bg-white rounded-2xl overflow-hidden transition-all duration-350"
        style={{
          border: "1px solid rgba(232,226,218,1)",
          boxShadow: "0 1px 2px rgba(45,33,27,.04)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-6px)";
          e.currentTarget.style.boxShadow = "0 22px 40px -18px rgba(45,33,27,.35)";
          e.currentTarget.style.borderColor = "var(--border, #d4ccc0)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "0 1px 2px rgba(45,33,27,.04)";
          e.currentTarget.style.borderColor = "rgba(232,226,218,1)";
        }}
      >
        {/* Media */}
        {t.type === "photo" && t.img && (
          <div className="relative">
            <img src={t.img} alt={`${t.name} mengenakan ${t.cat}`} loading="lazy" className="w-full object-cover" />
            {t.cap && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(45,33,27,.85)] to-transparent p-3 pt-8">
                <p className="text-[#f8f5f1] text-xs font-medium">{t.cap}</p>
              </div>
            )}
          </div>
        )}
        {t.type === "video" && t.img && (
          <div className="relative">
            {ytPlaying && t.yt ? (
              <div className="relative" style={{ aspectRatio: "16 / 11" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${t.yt}?autoplay=1&rel=0`}
                  title="Video testimoni SAMAQU"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative cursor-pointer group" onClick={() => setYtPlaying(true)}>
                <img src={t.img} alt={`${t.name} — ${t.cat}`} loading="lazy" className="w-full object-cover" />
                <div className="absolute inset-0 bg-[rgba(45,33,27,.25)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
                    style={{ background: "#b89146" }}
                  >
                    <Play size={22} fill="#fff" stroke="none" className="ml-0.5" />
                  </span>
                </div>
                {t.cap && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(45,33,27,.85)] to-transparent p-3 pt-8">
                    <p className="text-[#f8f5f1] text-xs font-medium">{t.cap}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-serif text-sm font-semibold shrink-0"
              style={{ background: "#2d211b", color: "#b89146" }}
            >
              {initials(t.name)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: "#2d211b" }}>{t.name}</p>
              <div className="mt-0.5"><Stars n={t.rating} /></div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] uppercase tracking-wide rounded-full px-2 py-0.5"
              style={{ color: "#b58c4a", background: "#f0ebe5" }}
            >
              {t.cat}
            </span>
            {t.verified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5" style={{ color: "#b58c4a", background: "#f0ebe5" }}>
                <CheckCircle size={11} strokeWidth={2.5} />
                Pembeli Terverifikasi
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "#5a4a3f" }}>{t.text}</p>
          <p className="mt-4 text-xs" style={{ color: "#8b7a6f" }}>{t.date}</p>
        </div>
      </div>
    </motion.article>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function TestimoniPage() {
  const [filterType, setFilterType] = useState<TestimoniType | "all">("all");
  const [filterCat, setFilterCat] = useState<TestimoniCat | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);

  const filtered = testimoniData.filter((t) => {
    const okType = filterType === "all" || t.type === filterType;
    const okCat = filterCat === "all" || t.cat === filterCat;
    return okType && okCat;
  });

  const visible = filtered.slice(0, shown);
  const hasMore = shown < filtered.length;

  const handleLoadMore = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setShown((s) => s + PAGE);
      setLoading(false);
    }, 350);
  }, []);

  useEffect(() => {
    setShown(PAGE);
  }, [filterType, filterCat]);

  return (
    <section className="min-h-screen" style={{ background: "#f8f5f1" }}>
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden" style={{ background: "#2d211b", color: "#f8f5f1" }}>
        <div
          className="absolute inset-0 opacity-[.12]"
          style={{
            background: "radial-gradient(circle at 30% 20%, #b89146 0, transparent 45%), radial-gradient(circle at 80% 90%, #9d7a3a 0, transparent 40%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
          <p className="text-xs sm:text-sm uppercase mb-5" style={{ letterSpacing: ".28em", color: "#b89146" }}>
            Testimoni Pelanggan
          </p>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-medium leading-[1.05]"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
          >
            Apa Kata Mereka
          </h1>
          <p className="mt-6 text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "#d4c5b5" }}>
            Kepercayaan dari pelanggan yang sudah merasakan kualitas SAMAQU.
          </p>

          <div
            className="mt-9 inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-5 rounded-2xl px-7 py-4"
            style={{ border: "1px solid #5a4a3f", background: "rgba(61,47,38,.5)" }}
          >
            <div className="flex items-center gap-2" aria-label="Rating 4.9 dari 5">
              <span className="text-4xl font-semibold leading-none" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#b89146" }}>4.9</span>
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={20} fill="#b89146" stroke="#b89146" />
                ))}
              </div>
            </div>
            <span className="hidden sm:block h-8 w-px" style={{ background: "#5a4a3f" }} />
            <p className="text-sm" style={{ color: "#d4c5b5" }}>
              dari <span className="font-semibold" style={{ color: "#f8f5f1" }}>500+ ulasan</span> pelanggan
            </p>
          </div>
        </div>
      </div>

      {/* ═══ FILTER / TABS ═══ */}
      <div
        className="sticky top-16 z-30 backdrop-blur"
        style={{ background: "rgba(248,245,241,.95)", borderBottom: "1px solid rgba(232,226,218,1)" }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Filter tipe testimoni" className="flex items-center gap-6 text-sm font-medium" style={{ color: "#8b7a6f" }}>
            {(["all", "photo", "video"] as const).map((type) => (
              <button
                key={type}
                role="tab"
                aria-selected={filterType === type}
                onClick={() => setFilterType(type)}
                className="relative py-1 transition-colors duration-250"
                style={{ color: filterType === type ? "#2d211b" : undefined }}
              >
                {type === "all" ? "Semua" : type === "photo" ? "Foto" : "Video"}
                {filterType === type && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-sm"
                    style={{ background: "linear-gradient(90deg, #b58c4a, #b89146)" }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="cat" className="text-xs uppercase tracking-wide" style={{ color: "#8b7a6f" }}>Kategori</label>
            <div className="relative">
              <select
                id="cat"
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value as TestimoniCat | "all")}
                className="appearance-none text-sm rounded-full pl-4 pr-9 py-2 focus:outline-none focus:ring-2 cursor-pointer"
                style={{
                  border: "1px solid #d4ccc0",
                  background: "white",
                  color: "#5a4a3f",
                  focusRingColor: "rgba(181,140,74,.4)",
                }}
              >
                <option value="all">Semua Produk</option>
                {testimoniCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8b7a6f" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MASONRY GRID ═══ */}
      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {visible.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "#f0ebe5" }}>
              <MessageCircle size={34} strokeWidth={1.4} style={{ color: "#b58c4a" }} />
            </div>
            <h3 className="text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#2d211b" }}>
              Belum ada testimoni untuk kategori ini
            </h3>
            <p className="mt-2 text-sm" style={{ color: "#8b7a6f" }}>Coba pilih filter atau kategori produk lain.</p>
          </div>
        ) : (
          <div
            className="gap-6"
            style={{
              columnCount: 1,
              columnGap: "1.5rem",
            }}
          >
            <style>{`
              @media (min-width: 640px) { .masonry-grid { column-count: 2 !important; } }
              @media (min-width: 1024px) { .masonry-grid { column-count: 3 !important; } }
              @media (min-width: 1440px) { .masonry-grid { column-count: 4 !important; } }
            `}</style>
            <div className="masonry-grid" style={{ columnCount: 1, columnGap: "1.5rem" }}>
              <AnimatePresence mode="popLayout">
                {visible.map((t, i) => (
                  <TestimoniCard key={`${t.name}-${t.date}`} t={t} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="group inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                border: "1px solid #d4ccc0",
                background: "white",
                color: "#5a4a3f",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memuat…
                </>
              ) : (
                "Muat Lebih Banyak"
              )}
            </button>
          </div>
        )}
      </main>

      {/* ═══ CTA ═══ */}
      <section style={{ background: "#f0ebe5", borderTop: "1px solid rgba(232,226,218,1)" }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 text-center">
          <div className="mx-auto mb-6 h-px w-16" style={{ background: "linear-gradient(to right, transparent, #b89146, transparent)" }} />
          <h2
            className="text-4xl sm:text-5xl font-medium"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#2d211b" }}
          >
            Punya Cerita dengan SAMAQU?
          </h2>
          <p className="mt-5 max-w-xl mx-auto" style={{ color: "#5a4a3f" }}>
            Bagikan pengalaman Anda — kirim foto, video, atau ulasan mengenakan busana SAMAQU.
            Setiap cerita Anda sangat berarti bagi kami.
          </p>
          <a
            href="https://wa.me/6281234567890?text=Halo%20SAMAQU%2C%20saya%20ingin%20mengirim%20testimoni%20saya"
            className="mt-8 inline-flex items-center gap-2.5 rounded-full px-8 py-4 font-medium transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: "#2d211b",
              color: "#f8f5f1",
              boxShadow: "0 8px 24px -6px rgba(45,33,27,.15)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
            </svg>
            Kirim Testimoni Anda
          </a>
        </div>
      </section>
    </section>
  );
}
