"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ruler, ImageIcon, Loader2 } from "lucide-react";
import { useSafeTranslations } from "@/lib/safe-i18n";
import { supabase } from "@/lib/supabase";

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

const tabVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function PanduanSize() {
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
    <section
      id="size"
      className="py-14 sm:py-24 lg:py-32"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
          <p
            className="text-[12px] tracking-[0.32em] uppercase mb-4"
            style={{ color: "var(--gold)" }}
          >
            {t("eyebrow")}
          </p>
          <h2
            className="text-3xl sm:text-5xl font-medium mb-6"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            {t("title")}
          </h2>
          <p
            className="leading-[1.75] text-sm sm:text-base"
            style={{ color: "var(--coffee)" }}
          >
            {t("desc")}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 justify-start sm:justify-center">
          {CATEGORY_TABS.map((tab) => {
            const guideForTab = sizeGuides.find((g) => g.category === tab);
            const isSemua = tab === "Semua";
            const hasTabImage = isSemua
              ? hasImages
              : guideForTab?.image_url;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 text-[12px] font-medium rounded-full whitespace-nowrap transition-all duration-200"
                style={{
                  background:
                    activeTab === tab ? "var(--espresso)" : "transparent",
                  color:
                    activeTab === tab ? "var(--cream)" : "var(--coffee)",
                  border: `1px solid ${
                    activeTab === tab
                      ? "var(--espresso)"
                      : "rgba(201,183,156,.3)"
                  }`,
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
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <Loader2
                size={24}
                className="animate-spin mx-auto mb-3"
                style={{ color: "var(--gold)" }}
              />
              <p className="text-sm" style={{ color: "var(--stone)" }}>
                Memuat panduan ukuran...
              </p>
            </motion.div>
          ) : filteredGuides.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 rounded-2xl"
              style={{
                background: "white",
                border: "1px solid rgba(201,183,156,.2)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--sand-2)" }}
              >
                <Ruler size={28} strokeWidth={1.4} style={{ color: "var(--gold)" }} />
              </div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--espresso)" }}
              >
                {t("emptyTitle")}
              </p>
              <p className="text-xs" style={{ color: "var(--stone)" }}>
                {t("emptyDesc")}
              </p>
            </motion.div>
          ) : activeTab === "Semua" ? (
            <motion.div
              key="all"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="rounded-2xl overflow-hidden bg-white"
                  style={{
                    boxShadow: "0 2px 12px rgba(43,38,32,.06)",
                    border: "1px solid rgba(201,183,156,.15)",
                  }}
                >
                  <div
                    className="px-4 py-3 flex items-center gap-2"
                    style={{ borderBottom: "1px solid rgba(201,183,156,.12)" }}
                  >
                    <Ruler
                      size={14}
                      strokeWidth={1.8}
                      style={{ color: "var(--gold)" }}
                    />
                    <p
                      className="text-[12px] font-semibold tracking-wide uppercase"
                      style={{ color: "var(--espresso)" }}
                    >
                      {guide.category}
                    </p>
                  </div>
                  <div className="p-2">
                    <img
                      src={guide.image_url}
                      alt={`Panduan Ukuran ${guide.category}`}
                      className="w-full h-auto rounded-lg"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-3xl mx-auto"
            >
              {filteredGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="rounded-2xl overflow-hidden bg-white"
                  style={{
                    boxShadow: "0 8px 40px -16px rgba(43,38,32,.15)",
                  }}
                >
                  <div
                    className="px-6 py-4 flex items-center gap-3"
                    style={{ borderBottom: "1px solid rgba(201,183,156,.12)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--sand-2)" }}
                    >
                      <Ruler
                        size={16}
                        strokeWidth={1.8}
                        style={{ color: "var(--gold)" }}
                      />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--espresso)" }}
                      >
                        {guide.category}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--stone)" }}
                      >
                        {t("imageNote")}
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    <img
                      src={guide.image_url}
                      alt={`Panduan Ukuran ${guide.category}`}
                      className="w-full h-auto rounded-xl"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA WhatsApp */}
        {!loading && hasImages && (
          <div className="text-center mt-10">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:opacity-90"
              style={{ background: "var(--espresso)" }}
            >
              {t("cta")}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
