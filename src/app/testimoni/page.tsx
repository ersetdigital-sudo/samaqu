"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
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
function TestimoniCard({ t }: { t: Testimoni }) {
  const [ytPlaying, setYtPlaying] = useState(false);

  return (
    <article className="tcard break-inside-avoid mb-5 sm:mb-6">
      <div className="tcard-inner bg-white rounded-2xl overflow-hidden">
        {/* Media */}
        {t.type === "photo" && t.img && (
          <div className="relative">
            <img
              src={t.img}
              alt={`${t.name} mengenakan ${t.cat}`}
              loading="lazy"
              decoding="async"
              className="w-full object-cover"
              style={{ aspectRatio: "4/5" }}
            />
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
              <div className="relative" style={{ aspectRatio: "16/11" }}>
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
              <button
                type="button"
                className="relative cursor-pointer w-full text-left"
                onClick={() => setYtPlaying(true)}
                aria-label={`Putar video ${t.name}`}
              >
                <img
                  src={t.img}
                  alt={`${t.name} — ${t.cat}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full object-cover"
                  style={{ aspectRatio: "4/5" }}
                />
                <div className="absolute inset-0 bg-[rgba(45,33,27,.25)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="tplay w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: "#b89146" }}>
                    <Play size={20} fill="#fff" stroke="none" className="ml-0.5" />
                  </span>
                </div>
                {t.cap && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(45,33,27,.85)] to-transparent p-3 pt-8">
                    <p className="text-[#f8f5f1] text-xs font-medium">{t.cap}</p>
                  </div>
                )}
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-serif text-xs sm:text-sm font-semibold shrink-0" style={{ background: "#2d211b", color: "#b89146" }}>
              {initials(t.name)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-[13px] sm:text-sm truncate" style={{ color: "#2d211b" }}>{t.name}</p>
              <div className="mt-0.5"><Stars n={t.rating} size={13} /></div>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wide rounded-full px-2 py-0.5" style={{ color: "#b58c4a", background: "#f0ebe5" }}>
              {t.cat}
            </span>
            {t.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium rounded-full px-2 py-0.5" style={{ color: "#b58c4a", background: "#f0ebe5" }}>
                <CheckCircle size={10} strokeWidth={2.5} />
                Terverifikasi
              </span>
            )}
          </div>
          <p className="mt-2.5 sm:mt-3 text-[13px] sm:text-sm leading-relaxed" style={{ color: "#5a4a3f" }}>{t.text}</p>
          <p className="mt-3 sm:mt-4 text-[11px] sm:text-xs" style={{ color: "#8b7a6f" }}>{t.date}</p>
        </div>
      </div>
    </article>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function TestimoniPage() {
  const [filterType, setFilterType] = useState<TestimoniType | "all">("all");
  const [filterCat, setFilterCat] = useState<TestimoniCat | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => testimoniData.filter((t) => {
    const okType = filterType === "all" || t.type === filterType;
    const okCat = filterCat === "all" || t.cat === filterCat;
    return okType && okCat;
  }), [filterType, filterCat]);

  const visible = useMemo(() => filtered.slice(0, shown), [filtered, shown]);
  const hasMore = shown < filtered.length;

  const handleLoadMore = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setShown((s) => s + PAGE);
      setLoading(false);
    }, 300);
  }, []);

  const handleTypeChange = useCallback((type: TestimoniType | "all") => {
    setFilterType(type);
    setShown(PAGE);
  }, []);

  const handleCatChange = useCallback((cat: TestimoniCat | "all") => {
    setFilterCat(cat);
    setShown(PAGE);
  }, []);

  return (
    <>
      {/* Masonry + Card CSS */}
      <style jsx global>{`
        .masonry-grid { column-count: 1; column-gap: 1.25rem; }
        @media (min-width: 640px) { .masonry-grid { column-count: 2; } }
        @media (min-width: 1024px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1440px) { .masonry-grid { column-count: 4; } }

        .tcard { animation: tcardIn 0.5s cubic-bezier(.22,1,.36,1) both; }
        .tcard:nth-child(2) { animation-delay: 0.06s; }
        .tcard:nth-child(3) { animation-delay: 0.12s; }
        .tcard:nth-child(4) { animation-delay: 0.18s; }
        .tcard:nth-child(5) { animation-delay: 0.24s; }
        .tcard:nth-child(6) { animation-delay: 0.30s; }

        @keyframes tcardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }

        .tcard-inner {
          border: 1px solid rgba(232,226,218,1);
          box-shadow: 0 1px 2px rgba(45,33,27,.04);
          transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease, border-color .3s ease;
          will-change: transform;
        }
        @media (hover: hover) {
          .tcard-inner:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 32px -14px rgba(45,33,27,.28);
            border-color: #d4ccc0;
          }
        }

        .tplay { transition: transform .25s ease; }
        .tcard-inner:hover .tplay { transform: scale(1.08); }

        .tab-btn {
          position: relative; padding: 0.25rem 0;
          color: #8b7a6f; transition: color .2s ease;
        }
        .tab-btn[aria-selected="true"] { color: #2d211b; }
        .tab-btn[aria-selected="true"]::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -2px;
          height: 2px; border-radius: 2px;
          background: linear-gradient(90deg, #b58c4a, #b89146);
        }

        .filter-sel {
          appearance: none; -webkit-appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b7a6f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
        }
      `}</style>

      <section className="min-h-screen" style={{ background: "#f8f5f1" }}>
        {/* ═══ HERO ═══ */}
        <div className="relative overflow-hidden" style={{ background: "#2d211b", color: "#f8f5f1" }}>
          <div className="absolute inset-0 opacity-[.12]" style={{ background: "radial-gradient(circle at 30% 20%, #b89146 0, transparent 45%), radial-gradient(circle at 80% 90%, #9d7a3a 0, transparent 40%)" }} />
          <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-24 lg:py-28 text-center">
            <p className="text-[11px] sm:text-sm uppercase mb-4 sm:mb-5" style={{ letterSpacing: ".28em", color: "#b89146" }}>Testimoni Pelanggan</p>
            <h1 className="text-[2.2rem] sm:text-6xl lg:text-7xl font-medium leading-[1.05]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
              Apa Kata Mereka
            </h1>
            <p className="mt-4 sm:mt-6 text-[15px] sm:text-lg max-w-2xl mx-auto" style={{ color: "#d4c5b5" }}>
              Kepercayaan dari pelanggan yang sudah merasakan kualitas SAMAQU.
            </p>
            <div className="mt-7 sm:mt-9 inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-5 rounded-2xl px-5 sm:px-7 py-3.5 sm:py-4" style={{ border: "1px solid #5a4a3f", background: "rgba(61,47,38,.5)" }}>
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-semibold leading-none" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#b89146" }}>4.9</span>
                <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={18} fill="#b89146" stroke="#b89146" />)}</div>
              </div>
              <span className="hidden sm:block h-8 w-px" style={{ background: "#5a4a3f" }} />
              <p className="text-[13px] sm:text-sm" style={{ color: "#d4c5b5" }}>
                dari <span className="font-semibold" style={{ color: "#f8f5f1" }}>500+ ulasan</span> pelanggan
              </p>
            </div>
          </div>
        </div>

        {/* ═══ FILTER / TABS ═══ */}
        <div className="sticky top-16 z-30" style={{ background: "rgba(248,245,241,.97)", borderBottom: "1px solid rgba(232,226,218,1)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3 overflow-x-auto scrollbar-hide">
            <div role="tablist" aria-label="Filter tipe testimoni" className="flex items-center gap-5 sm:gap-6 text-[13px] sm:text-sm font-medium shrink-0">
              {(["all", "photo", "video"] as const).map((type) => (
                <button key={type} role="tab" aria-selected={filterType === type} onClick={() => handleTypeChange(type)} className="tab-btn">
                  {type === "all" ? "Semua" : type === "photo" ? "Foto" : "Video"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <label htmlFor="cat" className="text-[11px] sm:text-xs uppercase tracking-wide hidden sm:block" style={{ color: "#8b7a6f" }}>Kategori</label>
              <div className="relative">
                <select
                  id="cat"
                  value={filterCat}
                  onChange={(e) => handleCatChange(e.target.value as TestimoniCat | "all")}
                  className="filter-sel text-[13px] sm:text-sm rounded-full pl-3 sm:pl-4 pr-8 sm:pr-9 py-1.5 sm:py-2 focus:outline-none cursor-pointer"
                  style={{ border: "1px solid #d4ccc0", background: "white", color: "#5a4a3f" }}
                >
                  <option value="all">Semua Produk</option>
                  {testimoniCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8b7a6f" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MASONRY GRID ═══ */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          {visible.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-5 sm:mb-6" style={{ background: "#f0ebe5" }}>
                <MessageCircle size={28} strokeWidth={1.4} style={{ color: "#b58c4a" }} />
              </div>
              <h3 className="text-xl sm:text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#2d211b" }}>
                Belum ada testimoni untuk kategori ini
              </h3>
              <p className="mt-2 text-[13px] sm:text-sm" style={{ color: "#8b7a6f" }}>Coba pilih filter atau kategori produk lain.</p>
            </div>
          ) : (
            <div className="masonry-grid">
              {visible.map((t) => (
                <TestimoniCard key={`${t.name}-${t.date}`} t={t} />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="mt-8 sm:mt-10 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full px-6 sm:px-8 py-2.5 sm:py-3.5 text-[13px] sm:text-sm font-medium transition-all duration-200 active:scale-[0.97]"
                style={{ border: "1px solid #d4ccc0", background: "white", color: "#5a4a3f" }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Memuat…</> : "Muat Lebih Banyak"}
              </button>
            </div>
          )}
        </main>

        {/* ═══ CTA ═══ */}
        <section style={{ background: "#f0ebe5", borderTop: "1px solid rgba(232,226,218,1)" }}>
          <div className="max-w-4xl mx-auto px-5 sm:px-8 py-14 sm:py-20 text-center">
            <div className="mx-auto mb-5 sm:mb-6 h-px w-16" style={{ background: "linear-gradient(to right, transparent, #b89146, transparent)" }} />
            <h2 className="text-3xl sm:text-5xl font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#2d211b" }}>
              Punya Cerita dengan SAMAQU?
            </h2>
            <p className="mt-4 sm:mt-5 text-[14px] sm:text-base max-w-xl mx-auto" style={{ color: "#5a4a3f" }}>
              Bagikan pengalaman Anda — kirim foto, video, atau ulasan mengenakan busana SAMAQU. Setiap cerita Anda sangat berarti bagi kami.
            </p>
            <a
              href="https://wa.me/6281234567890?text=Halo%20SAMAQU%2C%20saya%20ingin%20mengirim%20testimoni%20saya"
              className="mt-6 sm:mt-8 inline-flex items-center gap-2 sm:gap-2.5 rounded-full px-6 sm:px-8 py-3 sm:py-4 text-[13px] sm:text-base font-medium transition-all duration-200 active:scale-[0.97]"
              style={{ background: "#2d211b", color: "#f8f5f1", boxShadow: "0 8px 24px -6px rgba(45,33,27,.15)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
              Kirim Testimoni Anda
            </a>
          </div>
        </section>
      </section>
    </>
  );
}
