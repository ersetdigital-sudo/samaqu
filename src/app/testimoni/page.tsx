"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle, MessageCircle, Play, ChevronDown, Loader2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import {
  testimoniData,
  testimoniCategories,
  type Testimoni,
  type TestimoniType,
  type TestimoniCat,
} from "./testimoni-data";

const PAGE = 6;

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function StarRating({ n }: { n: number }) {
  return (
    <div className="flex gap-px">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]" fill={i < n ? "var(--gold)" : "none"} stroke="var(--gold)" strokeWidth={1.5} />
      ))}
    </div>
  );
}

function TestimoniCard({ t }: { t: Testimoni }) {
  const [ytPlaying, setYtPlaying] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="tcard break-inside-avoid mb-4 sm:mb-5 lg:mb-6"
    >
      <div
        className="group bg-white overflow-hidden transition-all duration-300"
        style={{ borderRadius: "0.125rem", boxShadow: "0 2px 12px -4px rgba(43,38,32,.06)", border: "1px solid rgba(201,183,156,.12)" }}
      >
        {/* ── Photo ── */}
        {t.type === "photo" && t.img && (
          <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "#e8dfd1" }}>
            <img src={t.img} alt={`${t.name} mengenakan ${t.cat}`} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            {t.cap && (
              <div className="absolute inset-x-0 bottom-0 p-3 pt-10" style={{ background: "linear-gradient(to top, rgba(45,33,27,.85), transparent)" }}>
                <p className="text-[11px] sm:text-xs font-ui font-medium" style={{ color: "var(--cream)" }}>{t.cap}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Video ── */}
        {t.type === "video" && t.img && (
          <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "#e8dfd1" }}>
            {ytPlaying && t.yt ? (
              <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${t.yt}?autoplay=1&rel=0`} title="Video testimoni" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : (
              <button type="button" className="absolute inset-0 cursor-pointer border-0 p-0 bg-transparent text-left w-full h-full" onClick={() => setYtPlaying(true)} aria-label={`Putar video ${t.name}`}>
                <img src={t.img} alt={`${t.name} — ${t.cat}`} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <div className="absolute inset-0" style={{ background: "rgba(45,33,27,.25)" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="tplay w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center" style={{ background: "var(--gold)", boxShadow: "0 4px 12px rgba(181,140,74,.4)" }}>
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" fill="white" stroke="none" />
                  </span>
                </div>
                {t.cap && (
                  <div className="absolute inset-x-0 bottom-0 p-3 pt-10" style={{ background: "linear-gradient(to top, rgba(45,33,27,.85), transparent)" }}>
                    <p className="text-[11px] sm:text-xs font-ui font-medium" style={{ color: "var(--cream)" }}>{t.cap}</p>
                  </div>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Content ── */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ background: "var(--espresso)", color: "var(--gold)", fontFamily: "Georgia, serif", fontSize: "0.625rem", fontWeight: 600, lineHeight: 1 }}>
              {getInitials(t.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] sm:text-sm font-ui font-medium truncate" style={{ color: "var(--espresso)" }}>{t.name}</p>
              <div className="mt-0.5"><StarRating n={t.rating} /></div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] tracking-[0.06em] uppercase font-ui font-medium rounded-full px-2 py-0.5" style={{ background: "rgba(181,140,74,.08)", color: "var(--gold)" }}>{t.cat}</span>
            {t.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-ui font-medium rounded-full px-2 py-0.5" style={{ background: "rgba(181,140,74,.08)", color: "var(--gold)" }}>
                <CheckCircle className="w-[10px] h-[10px] sm:w-[11px] sm:h-[11px]" strokeWidth={2.5} />
                Terverifikasi
              </span>
            )}
          </div>
          <p className="mt-3 text-[13px] sm:text-sm font-ui leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t.text}</p>
          <p className="mt-3 text-[11px] sm:text-xs font-ui" style={{ color: "var(--stone)" }}>{t.date}</p>
        </div>
      </div>
    </motion.article>
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
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ═══ HERO / HEADER ═══ */}
      <div className="relative overflow-hidden" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="absolute inset-0 opacity-[.12]" style={{ background: "radial-gradient(circle at 30% 20%, var(--gold) 0, transparent 45%), radial-gradient(circle at 80% 90%, #9d7a3a 0, transparent 40%)" }} />
        <div className="relative pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 text-center">
            <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
              <motion.p variants={headerVariants} className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 font-ui font-medium" style={{ color: "var(--gold)" }}>
                Testimoni Pelanggan
              </motion.p>
              <motion.h1 variants={headerVariants} className="text-[2rem] sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
                Apa Kata Mereka
              </motion.h1>
              <motion.p variants={headerVariants} className="text-sm sm:text-base leading-relaxed max-w-lg mx-auto font-ui" style={{ color: "rgba(212,197,181,.8)" }}>
                Kepercayaan dari pelanggan yang sudah merasakan kualitas busana muslim premium kami.
              </motion.p>
            </motion.div>

            {/* Rating card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-8 sm:mt-10 inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 rounded-xl px-6 sm:px-8 py-4 sm:py-5"
              style={{ border: "1px solid rgba(90,74,63,.5)", background: "rgba(61,47,38,.4)", backdropFilter: "blur(8px)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[1.6rem] sm:text-4xl font-semibold leading-none" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>4.9</span>
                <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5" fill="var(--gold)" stroke="var(--gold)" />)}</div>
              </div>
              <span className="hidden sm:block h-8 w-px" style={{ background: "rgba(90,74,63,.5)" }} />
              <p className="text-[13px] sm:text-sm font-ui" style={{ color: "rgba(212,197,181,.8)" }}>
                dari <span className="font-semibold" style={{ color: "var(--cream)" }}>500+ ulasan</span> pelanggan
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══ BREADCRUMB ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 pt-6 sm:pt-8">
        <Breadcrumb />
      </div>

      {/* ═══ FILTER TABS ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* Mobile: scrollable chips + dropdown */}
        <div className="lg:hidden">
          <div className="py-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2.5">
              {(["all", "photo", "video"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setShown(PAGE); }}
                  className="relative px-4 py-2.5 text-[12px] tracking-[0.06em] font-ui font-medium rounded-full transition-all duration-300 whitespace-nowrap"
                  style={{
                    background: filterType === type ? "var(--espresso)" : "transparent",
                    color: filterType === type ? "var(--cream)" : "var(--coffee)",
                    border: `1px solid ${filterType === type ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                  }}
                >
                  {type === "all" ? "Semua" : type === "photo" ? "Foto" : "Video"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pb-4">
            <div className="relative">
              <select
                value={filterCat}
                onChange={(e) => { setFilterCat(e.target.value as TestimoniCat | "all"); setShown(PAGE); }}
                className="appearance-none text-[12px] font-ui rounded-full pl-4 pr-9 py-2.5 cursor-pointer outline-none transition-all duration-200"
                style={{ border: "1px solid rgba(201,183,156,.3)", background: "transparent", color: "var(--coffee)" }}
              >
                <option value="all">Semua Produk</option>
                {testimoniCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--stone)" }} />
            </div>
          </div>
        </div>

        {/* Desktop: inline tabs + dropdown */}
        <div className="hidden lg:flex items-center justify-between py-5 border-b" style={{ borderColor: "rgba(216,196,168,.2)" }}>
          <div className="flex items-center gap-6 text-sm font-ui font-medium" style={{ color: "var(--stone)" }}>
            {(["all", "photo", "video"] as const).map((type) => (
              <button
                key={type}
                onClick={() => { setFilterType(type); setShown(PAGE); }}
                className="relative py-1 transition-colors duration-200"
                style={{ color: filterType === type ? "var(--espresso)" : undefined }}
              >
                {type === "all" ? "Semua" : type === "photo" ? "Foto" : "Video"}
                {filterType === type && (
                  <motion.div layoutId="dt-tab" className="absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-sm" style={{ background: "var(--gold)" }} />
                )}
              </button>
            ))}
          </div>
          <div className="relative">
            <select
              value={filterCat}
              onChange={(e) => { setFilterCat(e.target.value as TestimoniCat | "all"); setShown(PAGE); }}
              className="appearance-none text-[13px] font-ui rounded-full pl-4 pr-9 py-2 cursor-pointer outline-none transition-all duration-200"
              style={{ border: "1px solid rgba(201,183,156,.3)", background: "transparent", color: "var(--coffee)" }}
            >
              <option value="all">Semua Produk</option>
              {testimoniCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--stone)" }} />
          </div>
        </div>
      </div>

      {/* ═══ MASONRY GRID ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 py-8 sm:py-12">
        {visible.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--bg-secondary, #f0ebe5)" }}>
              <MessageCircle size={34} strokeWidth={1.4} style={{ color: "var(--gold)" }} />
            </div>
            <h3 className="text-2xl font-ui" style={{ color: "var(--espresso)" }}>Belum ada testimoni untuk kategori ini</h3>
            <p className="mt-2 text-sm font-ui" style={{ color: "var(--stone)" }}>Coba pilih filter atau kategori produk lain.</p>
          </div>
        ) : (
          <div className="masonry-grid">
            {visible.map((t) => <TestimoniCard key={`${t.name}-${t.date}`} t={t} />)}
          </div>
        )}

        {hasMore && (
          <div className="mt-10 sm:mt-12 flex justify-center">
            <button onClick={handleLoadMore} disabled={loading}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[12px] tracking-[0.1em] uppercase font-ui font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: "var(--espresso)", color: "var(--cream)", boxShadow: "0 4px 16px -4px rgba(42,33,27,.2)" }}>
              {loading ? <><Loader2 size={14} className="animate-spin" /> Memuat…</> : "Muat Lebih Banyak"}
            </button>
          </div>
        )}
      </div>

      {/* ═══ CTA ═══ */}
      <section style={{ background: "var(--bg-secondary, #efe8e0)", borderTop: "1px solid rgba(201,183,156,.15)" }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
          <div className="mx-auto mb-6 h-px w-16" style={{ background: "linear-gradient(to right, transparent, var(--gold), transparent)" }} />
          <h2 className="text-[1.6rem] sm:text-4xl lg:text-5xl font-semibold leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            Punya Cerita dengan SAMAQU?
          </h2>
          <p className="mt-5 text-sm sm:text-base font-ui leading-relaxed max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Bagikan pengalaman Anda — kirim foto, video, atau ulasan mengenakan busana SAMAQU. Setiap cerita Anda sangat berarti bagi kami.
          </p>
          <a href="https://wa.me/6281234567890?text=Halo%20SAMAQU%2C%20saya%20ingin%20mengirim%20testimoni%20saya"
            className="mt-8 inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: "var(--espresso)", color: "var(--cream)", boxShadow: "0 8px 28px -8px rgba(45,33,27,.35)" }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
            Kirim Testimoni Anda
          </a>
        </div>
      </section>

      <style jsx global>{`
        .masonry-grid { column-count: 1; column-gap: 1rem; }
        @media (min-width: 640px) { .masonry-grid { column-count: 2; column-gap: 1.25rem; } }
        @media (min-width: 1024px) { .masonry-grid { column-count: 3; column-gap: 1.5rem; } }
        @media (min-width: 1440px) { .masonry-grid { column-count: 4; } }

        .tplay { transition: transform .25s ease; }
        .group:hover .tplay { transform: scale(1.08); }
      `}</style>
    </section>
  );
}
