"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ruler, Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useSafeTranslations } from "@/lib/safe-i18n";
import { supabase } from "@/lib/supabase";
import { getWhatsAppLink } from "@/lib/store-settings";

interface SizeGuideImage {
  id: string;
  category: string;
  image_url: string;
  updated_at: string;
}

const CATEGORY_TABS = [
  "Semua",
  "Thobe",
  "Kandora",
  "Koko",
  "Vest",
  "Kabak",
  "Rekomendasi Size",
];

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const tabVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function PanduanUkuranPage() {
  const t = useSafeTranslations("sizeGuide");
  const [sizeGuides, setSizeGuides] = useState<SizeGuideImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Semua");

  useEffect(() => {
    async function loadSizeGuides() {
      const { data } = await supabase
        .from("size_guide_images")
        .select("*")
        .order("category");
      if (data) setSizeGuides(data);
      setLoading(false);
    }
    loadSizeGuides();
  }, []);

  const filteredGuides =
    activeTab === "Semua"
      ? sizeGuides.filter((g) => g.image_url)
      : sizeGuides.filter((g) => g.category === activeTab && g.image_url);

  const hasImages = sizeGuides.some((g) => g.image_url);

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(/hero-size.jpg)", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(23,20,15,.85), rgba(23,20,15,.95))" }} />
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "rgba(190,139,60,.12)" }} />

        <div className="relative pt-28 sm:pt-32 lg:pt-36 pb-10 sm:pb-14">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
            <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
              <motion.p variants={headerVariants} className="flex items-center gap-2 text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 font-ui font-medium" style={{ color: "var(--gold)" }}>
                <Ruler size={14} strokeWidth={2} /> {t("eyebrow")}
              </motion.p>
              <motion.h1 variants={headerVariants} className="text-[2rem] sm:text-5xl lg:text-[3.7rem] font-semibold leading-[1.05] tracking-tight mb-3" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
                {t("title")}
              </motion.h1>
              <motion.p variants={headerVariants} className="text-sm sm:text-base leading-relaxed max-w-lg font-ui" style={{ color: "rgba(212,197,181,.7)" }}>
                {t("pageDesc")}
              </motion.p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-7 flex flex-wrap gap-3">
              <a href={getWhatsAppLink("Halo SAMAQU, saya ingin konsultasi ukuran")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[12px] tracking-[0.06em] uppercase font-ui font-semibold transition-all duration-200" style={{ background: "var(--gold)", color: "white", boxShadow: "0 10px 24px -14px rgba(190,139,60,.9)" }}>
                <MessageCircle size={16} strokeWidth={1.5} /> {t("consultWA")}
              </a>
              <a href="/" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[12px] tracking-[0.06em] uppercase font-ui font-semibold transition-all duration-200" style={{ border: "1px solid rgba(244,240,233,.14)", color: "var(--cream)" }}>
                <ArrowLeft size={16} strokeWidth={1.5} /> {t("backToHome")}
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══ BREADCRUMB ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14" style={{ paddingTop: "40px", paddingBottom: "24px" }}>
        <Breadcrumb />
      </div>

      {/* ═══ TABS + CONTENT ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 pb-16">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {CATEGORY_TABS.map((tab) => {
            const guideForTab = sizeGuides.find((g) => g.category === tab);
            const isSemua = tab === "Semua";
            const hasTabImage = isSemua ? hasImages : guideForTab?.image_url;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 text-[12px] font-ui font-medium rounded-full whitespace-nowrap transition-all duration-200"
                style={{
                  background: activeTab === tab ? "var(--espresso)" : "transparent",
                  color: activeTab === tab ? "var(--cream)" : "var(--coffee)",
                  border: `1px solid ${activeTab === tab ? "var(--espresso)" : "rgba(201,183,156,.3)"}`,
                  opacity: !hasTabImage && !isSemua ? 0.5 : 1,
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
              <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--gold)" }} />
              <p className="text-sm font-ui" style={{ color: "var(--stone)" }}>Memuat panduan ukuran...</p>
            </motion.div>
          ) : filteredGuides.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-20 rounded-2xl" style={{ background: "white", border: "1px solid rgba(201,183,156,.2)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--sand-2)" }}>
                <Ruler size={28} strokeWidth={1.4} style={{ color: "var(--gold)" }} />
              </div>
              <p className="text-sm font-semibold font-ui mb-1" style={{ color: "var(--espresso)" }}>{t("emptyTitle")}</p>
              <p className="text-xs font-ui" style={{ color: "var(--stone)" }}>{t("emptyDesc")}</p>
            </motion.div>
          ) : activeTab === "Semua" ? (
            <motion.div key="all" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGuides.map((guide) => (
                <div key={guide.id} className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 2px 12px rgba(43,38,32,.06)", border: "1px solid rgba(201,183,156,.15)" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(201,183,156,.12)" }}>
                    <Ruler size={14} strokeWidth={1.8} style={{ color: "var(--gold)" }} />
                    <p className="text-[12px] font-semibold font-ui tracking-wide uppercase" style={{ color: "var(--espresso)" }}>{guide.category}</p>
                  </div>
                  <div className="p-2">
                    <img src={guide.image_url} alt={`Panduan Ukuran ${guide.category}`} className="w-full h-auto rounded-lg" loading="lazy" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div key={activeTab} variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto">
              {filteredGuides.map((guide) => (
                <div key={guide.id} className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 8px 40px -16px rgba(43,38,32,.15)" }}>
                  <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(201,183,156,.12)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--sand-2)" }}>
                      <Ruler size={16} strokeWidth={1.8} style={{ color: "var(--gold)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold font-ui" style={{ color: "var(--espresso)" }}>{guide.category}</p>
                      <p className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>{t("imageNote")}</p>
                    </div>
                  </div>
                  <div className="p-3">
                    <img src={guide.image_url} alt={`Panduan Ukuran ${guide.category}`} className="w-full h-auto rounded-xl" loading="lazy" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        {!loading && (
          <div className="text-center mt-12">
            <p className="text-sm font-ui mb-4" style={{ color: "var(--stone)" }}>
              Masih ragu soal ukuran?
            </p>
            <a
              href={getWhatsAppLink("Halo SAMAQU, saya ingin konsultasi ukuran")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[12px] tracking-[0.18em] uppercase font-ui font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--espresso)" }}
            >
              <MessageCircle size={16} strokeWidth={1.5} /> {t("consultWA")}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
