"use client";

import { useState, useMemo, useCallback } from "react";
import { Star, CheckCircle, MessageCircle, Play, ChevronDown, Loader2 } from "lucide-react";
import {
  testimoniData,
  testimoniCategories,
  type Testimoni,
  type TestimoniType,
  type TestimoniCat,
} from "./testimoni-data";

const PAGE = 6;

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function StarRating({ n }: { n: number }) {
  return (
    <div className="flex gap-px">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]" fill={i < n ? "#b89146" : "none"} stroke="#b89146" strokeWidth={1.5} />
      ))}
    </div>
  );
}

function TestimoniCard({ t }: { t: Testimoni }) {
  const [ytPlaying, setYtPlaying] = useState(false);

  return (
    <article className="tcard break-inside-avoid mb-3 sm:mb-5 lg:mb-6">
      <div className="tcard-inner bg-white overflow-hidden rounded-xl sm:rounded-2xl" style={{ border: "1px solid rgba(232,226,218,1)" }}>
        {/* ── Photo media ── */}
        {t.type === "photo" && t.img && (
          <div className="relative">
            <img src={t.img} alt={`${t.name} mengenakan ${t.cat}`} loading="lazy" decoding="async" className="w-full object-cover block" style={{ height: "auto" }} />
            {t.cap && (
              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 pt-7 sm:pt-8" style={{ background: "linear-gradient(to top, rgba(45,33,27,.85), transparent)" }}>
                <p className="text-[11px] sm:text-xs font-medium leading-snug text-white">{t.cap}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Video media ── */}
        {t.type === "video" && t.img && (
          <div className="relative">
            {ytPlaying && t.yt ? (
              <div className="relative aspect-video">
                <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${t.yt}?autoplay=1&rel=0`} title="Video testimoni" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            ) : (
              <button type="button" className="relative cursor-pointer block w-full border-0 p-0 bg-transparent text-left" onClick={() => setYtPlaying(true)} aria-label={`Putar video ${t.name}`}>
                <img src={t.img} alt={`${t.name} — ${t.cat}`} loading="lazy" decoding="async" className="w-full object-cover block" style={{ height: "auto" }} />
                <div className="absolute inset-0" style={{ background: "rgba(45,33,27,.25)" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="tplay w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center" style={{ background: "#b89146", boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>
                    <Play className="w-4 h-4 sm:w-[22px] sm:h-[22px] ml-0.5" fill="#fff" stroke="none" />
                  </span>
                </div>
                {t.cap && (
                  <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 pt-7 sm:pt-8" style={{ background: "linear-gradient(to top, rgba(45,33,27,.85), transparent)" }}>
                    <p className="text-[11px] sm:text-xs font-medium leading-snug text-white">{t.cap}</p>
                  </div>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Content ── */}
        <div className="p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Avatar: fixed 32px mobile, 40px desktop, overflow-hidden, proportional font */}
            <div
              className="w-8 h-8 min-w-[2rem] sm:w-10 sm:h-10 sm:min-w-[2.5rem] rounded-full flex items-center justify-center overflow-hidden shrink-0"
              style={{ background: "#2d211b", color: "#b89146", fontFamily: "Georgia, serif", fontSize: "0.625rem", fontWeight: 600, lineHeight: 1 }}
            >
              {getInitials(t.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-xs sm:text-sm truncate" style={{ color: "#2d211b" }}>{t.name}</p>
              <div className="mt-0.5"><StarRating n={t.rating} /></div>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="text-[9px] sm:text-[11px] uppercase tracking-wide rounded-full px-1.5 sm:px-2 py-0.5" style={{ color: "#b58c4a", background: "#f0ebe5" }}>{t.cat}</span>
            {t.verified && (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] font-medium rounded-full px-1.5 sm:px-2 py-0.5" style={{ color: "#b58c4a", background: "#f0ebe5" }}>
                <CheckCircle className="w-[9px] h-[9px] sm:w-[11px] sm:h-[11px]" strokeWidth={2.5} />
                Terverifikasi
              </span>
            )}
          </div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed" style={{ color: "#5a4a3f" }}>{t.text}</p>
          <p className="mt-2 sm:mt-4 text-[10px] sm:text-xs" style={{ color: "#8b7a6f" }}>{t.date}</p>
        </div>
      </div>
    </article>
  );
}

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
    setTimeout(() => { setShown((s) => s + PAGE); setLoading(false); }, 300);
  }, []);

  return (
    <>
      <style jsx global>{`
        .masonry-grid { column-count: 1; column-gap: 0.625rem; }
        @media (min-width: 640px) { .masonry-grid { column-count: 2; column-gap: 1.25rem; } }
        @media (min-width: 1024px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1440px) { .masonry-grid { column-count: 4; } }

        .tcard { animation: tcardIn 0.4s cubic-bezier(.22,1,.36,1) both; }
        .tcard:nth-child(2) { animation-delay: 0.05s; }
        .tcard:nth-child(3) { animation-delay: 0.10s; }
        .tcard:nth-child(4) { animation-delay: 0.15s; }
        .tcard:nth-child(5) { animation-delay: 0.20s; }
        .tcard:nth-child(6) { animation-delay: 0.25s; }
        @keyframes tcardIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

        .tcard-inner { transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease, border-color .3s ease; }
        @media (hover: hover) {
          .tcard-inner:hover { transform: translateY(-4px); box-shadow: 0 16px 32px -14px rgba(45,33,27,.28); border-color: #d4ccc0; }
        }
        .tplay { transition: transform .2s ease; }
        .tcard-inner:hover .tplay { transform: scale(1.08); }

        .ttab { position: relative; padding: 0.25rem 0; color: #8b7a6f; transition: color .2s ease; white-space: nowrap; border: none; background: none; cursor: pointer; font-weight: 500; }
        .ttab[aria-selected="true"] { color: #2d211b; font-weight: 600; }
        .ttab[aria-selected="true"]::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: 0;
          height: 2px; border-radius: 2px;
          background: linear-gradient(90deg, #b58c4a, #b89146);
        }

        .tsel {
          appearance: none; -webkit-appearance: none; outline: none; cursor: pointer;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238b7a6f' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
        }
        @media (min-width: 640px) {
          .tsel { background-position: right 0.75rem center; }
        }

        .tfilter-scroll { -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
        .tfilter-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <section className="min-h-screen" style={{ background: "#f8f5f1" }}>
        {/* ═══ HERO ═══ */}
        <div className="relative overflow-hidden" style={{ background: "#2d211b", color: "#f8f5f1" }}>
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 30% 20%, #b89146 0, transparent 45%), radial-gradient(circle at 80% 90%, #9d7a3a 0, transparent 40%)" }} />
          <div className="relative text-center px-4 py-10 sm:px-8 sm:py-20 lg:py-28 max-w-4xl mx-auto">
            <p className="uppercase font-medium mb-2.5 sm:mb-5 text-[9px] sm:text-sm" style={{ color: "#b89146", letterSpacing: "0.12em", wordBreak: "break-word" }}>Testimoni Pelanggan</p>
            <h1 className="font-medium text-[1.5rem] sm:text-6xl lg:text-7xl leading-tight sm:leading-[1.05]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
              Apa Kata Mereka
            </h1>
            <p className="mt-2.5 sm:mt-6 text-[13px] sm:text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: "#d4c5b5" }}>
              Kepercayaan dari pelanggan yang sudah merasakan kualitas SAMAQU.
            </p>
            {/* Rating card */}
            <div className="mt-4 sm:mt-9 inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-5 rounded-lg sm:rounded-2xl px-3 sm:px-7 py-2.5 sm:py-4" style={{ border: "1px solid #5a4a3f", background: "rgba(61,47,38,.5)", maxWidth: "calc(100vw - 2rem)" }}>
              <div className="flex items-center gap-1.5">
                <span className="text-[1.375rem] sm:text-4xl font-semibold leading-none" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#b89146" }}>4.9</span>
                <div className="flex gap-px">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="w-[13px] h-[13px] sm:w-5 sm:h-5" fill="#b89146" stroke="#b89146" />)}</div>
              </div>
              <span className="hidden sm:block h-7 w-px" style={{ background: "#5a4a3f" }} />
              <p className="text-[11px] sm:text-sm whitespace-nowrap" style={{ color: "#d4c5b5" }}>
                dari <span className="font-semibold" style={{ color: "#f8f5f1" }}>500+ ulasan</span> pelanggan
              </p>
            </div>
          </div>
        </div>

        {/* ═══ FILTER ═══ */}
        <div className="sticky z-30 tfilter-scroll top-[3.25rem] sm:top-16" style={{ background: "rgba(248,245,241,.97)", borderBottom: "1px solid rgba(232,226,218,1)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
          <div className="tfilter-scroll flex items-center max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-4 gap-2 sm:gap-3">
            <div role="tablist" aria-label="Filter tipe testimoni" className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium shrink-0">
              {(["all", "photo", "video"] as const).map((type) => (
                <button key={type} role="tab" aria-selected={filterType === type} onClick={() => { setFilterType(type); setShown(PAGE); }} className="ttab text-xs sm:text-sm">
                  {type === "all" ? "Semua" : type === "photo" ? "Foto" : "Video"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0">
              <label htmlFor="cat" className="hidden sm:block text-[10px] sm:text-xs uppercase tracking-wide" style={{ color: "#8b7a6f" }}>Kategori</label>
              <div className="relative">
                <select id="cat" value={filterCat} onChange={(e) => { setFilterCat(e.target.value as TestimoniCat | "all"); setShown(PAGE); }}
                  className="tsel text-xs sm:text-sm rounded-full pl-2.5 sm:pl-4 pr-6 sm:pr-9 py-1.5 sm:py-2"
                  style={{ border: "1px solid #d4ccc0", background: "white", color: "#5a4a3f" }}>
                  <option value="all">Semua</option>
                  {testimoniCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <ChevronDown className="w-2.5 h-2.5 sm:w-[13px] sm:h-[13px] absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8b7a6f" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ GRID ═══ */}
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-10 lg:py-16">
          {visible.length === 0 ? (
            <div className="text-center py-10 sm:py-20">
              <div className="mx-auto w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 sm:mb-6" style={{ background: "#f0ebe5" }}>
                <MessageCircle className="w-6 h-6 sm:w-[34px] sm:h-[34px]" strokeWidth={1.4} style={{ color: "#b58c4a" }} />
              </div>
              <h3 className="text-lg sm:text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#2d211b" }}>Belum ada testimoni untuk kategori ini</h3>
              <p className="mt-2 text-xs sm:text-sm" style={{ color: "#8b7a6f" }}>Coba pilih filter atau kategori produk lain.</p>
            </div>
          ) : (
            <div className="masonry-grid">
              {visible.map((t) => <TestimoniCard key={`${t.name}-${t.date}`} t={t} />)}
            </div>
          )}

          {hasMore && (
            <div className="mt-4 sm:mt-10 flex justify-center">
              <button onClick={handleLoadMore} disabled={loading}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-5 sm:px-8 py-2 sm:py-3.5 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95"
                style={{ border: "1px solid #d4ccc0", background: "white", color: "#5a4a3f" }}>
                {loading ? <><Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> Memuat…</> : "Muat Lebih Banyak"}
              </button>
            </div>
          )}
        </main>

        {/* ═══ CTA ═══ */}
        <section style={{ background: "#f0ebe5", borderTop: "1px solid rgba(232,226,218,1)" }}>
          <div className="text-center max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-20">
            <div className="mx-auto mb-4 sm:mb-6 h-px w-12 sm:w-16" style={{ background: "linear-gradient(to right, transparent, #b89146, transparent)" }} />
            <h2 className="text-[1.375rem] sm:text-4xl lg:text-5xl font-medium leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#2d211b" }}>
              Punya Cerita dengan SAMAQU?
            </h2>
            <p className="mt-3 sm:mt-5 text-[13px] sm:text-base leading-relaxed max-w-xl mx-auto" style={{ color: "#5a4a3f" }}>
              Bagikan pengalaman Anda — kirim foto, video, atau ulasan mengenakan busana SAMAQU.
            </p>
            <a href="https://wa.me/6281234567890?text=Halo%20SAMAQU%2C%20saya%20ingin%20mengirim%20testimoni%20saya"
              className="mt-4 sm:mt-8 inline-flex items-center gap-1.5 sm:gap-2.5 rounded-full px-5 sm:px-8 py-2.5 sm:py-4 text-xs sm:text-base font-medium transition-all duration-200 active:scale-95"
              style={{ background: "#2d211b", color: "#f8f5f1", boxShadow: "0 6px 20px -6px rgba(45,33,27,.15)" }}>
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
              Kirim Testimoni Anda
            </a>
          </div>
        </section>
      </section>
    </>
  );
}
