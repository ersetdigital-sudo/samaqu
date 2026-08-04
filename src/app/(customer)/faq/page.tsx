"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronRight, Package, Truck, Tag, RotateCcw, MessageCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/lib/supabase";
import { getWhatsAppLink } from "@/lib/store-settings";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
}

interface FaqCategory {
  name: string;
  icon: React.ReactNode;
  emoji: string;
}

const FAQ_CATEGORIES: FaqCategory[] = [
  { name: "Order & Pembayaran", icon: <Package size={20} strokeWidth={1.5} />, emoji: "📦" },
  { name: "Pengiriman", icon: <Truck size={20} strokeWidth={1.5} />, emoji: "🚚" },
  { name: "Produk, Kain & Size", icon: <Tag size={20} strokeWidth={1.5} />, emoji: "👕" },
  { name: "Retur & Garansi", icon: <RotateCcw size={20} strokeWidth={1.5} />, emoji: "🔄" },
  { name: "Lainnya", icon: <MessageCircle size={20} strokeWidth={1.5} />, emoji: "💬" },
];

const POPULAR_QUESTIONS = [
  "Apa itu Create Your Price?",
  "Apakah saya boleh memilih Harga Minimum?",
  "Apakah kualitas produk tetap sama jika memilih Harga Minimum?",
  "Bagaimana cara memilih ukuran yang tepat?",
  "Bagaimana cara mengetahui stok produk?",
  "Bagaimana cara menghubungi Samaqu?",
];

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function FaqAccordionItem({ item, index, isOpen, onToggle }: { item: FaqItem; index: number; isOpen: boolean; onToggle: () => void }) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div className="border-b" style={{ borderColor: "rgba(201,183,156,.2)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 py-5 text-left transition-colors"
        aria-expanded={isOpen}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-ui font-bold shrink-0"
          style={{
            background: isOpen ? "var(--espresso)" : "rgba(42,33,27,.06)",
            color: isOpen ? "var(--cream)" : "var(--espresso)",
          }}
        >
          {num}
        </span>
        <span className="flex-1 text-[15px] sm:text-base font-ui font-medium leading-snug" style={{ color: "var(--espresso)" }}>
          {item.question}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          className="shrink-0 transition-transform duration-300"
          style={{ color: "var(--stone)", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 pl-12 pr-4 text-sm font-ui leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const { data } = await supabase.from("faq_items").select("*").eq("is_active", true).order("display_order");
        if (data) {
          // Handle missing category column — default to "Lainnya"
          const mapped = (data as FaqItem[]).map((f) => ({
            ...f,
            category: f.category || "Lainnya",
          }));
          setFaqs(mapped);
        }
      } catch { /* use defaults */ }
      setLoading(false);
    }
    fetchFaqs();
  }, []);

  const popularFaqs = useMemo(() => {
    return faqs.filter((f) => POPULAR_QUESTIONS.includes(f.question)).slice(0, 6);
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [faqs, searchQuery]);

  const faqsByCategory = useMemo(() => {
    const map: Record<string, FaqItem[]> = {};
    for (const cat of FAQ_CATEGORIES) {
      map[cat.name] = filteredFaqs.filter((f) => f.category === cat.name);
    }
    return map;
  }, [filteredFaqs]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of FAQ_CATEGORIES) {
      counts[cat.name] = faqs.filter((f) => f.category === cat.name).length;
    }
    return counts;
  }, [faqs]);

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="absolute inset-0 opacity-[.12]" style={{ background: "radial-gradient(circle at 30% 20%, var(--gold) 0, transparent 45%), radial-gradient(circle at 80% 90%, #9d7a3a 0, transparent 40%)" }} />
        <div className="relative pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
            <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
              <motion.p variants={headerVariants} className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 font-ui font-medium" style={{ color: "var(--gold)" }}>
                Pusat Bantuan
              </motion.p>
              <motion.h1 variants={headerVariants} className="text-[2rem] sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
                FAQ Samaqu
              </motion.h1>
              <motion.p variants={headerVariants} className="text-sm sm:text-base leading-relaxed max-w-lg font-ui" style={{ color: "rgba(212,197,181,.8)" }}>
                Temukan jawaban dari pertanyaan yang paling sering ditanyakan seputar produk, pemesanan, pengiriman hingga retur.
              </motion.p>

              {/* Search Bar */}
              <motion.div variants={headerVariants} className="mt-8 max-w-lg">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(212,197,181,.5)" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pertanyaan..."
                    className="w-full pl-12 pr-4 py-4 text-sm font-ui outline-none rounded-xl"
                    style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "var(--cream)" }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══ BREADCRUMB ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14" style={{ paddingTop: "40px", paddingBottom: "24px" }}>
        <Breadcrumb />
      </div>

      {/* ═══ PERTANYAAN POPULER ═══ */}
      {!searchQuery.trim() && popularFaqs.length > 0 && (
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 pb-16">
          <h2 className="text-xl sm:text-2xl font-semibold mb-8" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            Pertanyaan Populer
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularFaqs.map((faq, i) => (
              <motion.button
                key={faq.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setOpenItem(faq.id);
                  setExpandedCategory(faq.category);
                  document.getElementById(`faq-category-${faq.category}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="text-left p-5 rounded-xl transition-all duration-200 hover:shadow-md group"
                style={{ background: "white", border: "1px solid rgba(201,183,156,.12)" }}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-ui font-bold shrink-0"
                    style={{ background: "rgba(181,140,74,.08)", color: "var(--gold)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] sm:text-sm font-ui font-medium leading-snug line-clamp-2" style={{ color: "var(--espresso)" }}>
                      {faq.question}
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--stone)" }} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SEMUA KATEGORI ═══ */}
      {!searchQuery.trim() && (
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 pb-12">
          <h2 className="text-xl sm:text-2xl font-semibold mb-6" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            Semua Kategori
          </h2>
          <div className="space-y-3">
            {FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                style={{ background: "white", border: "1px solid rgba(201,183,156,.12)" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(181,140,74,.08)", color: "var(--gold)" }}>
                  {cat.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>{cat.name}</p>
                </div>
                <span className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>{categoryCounts[cat.name] || 0} Pertanyaan</span>
                <ChevronRight
                  size={16}
                  className="shrink-0 transition-transform duration-200"
                  style={{ color: "var(--stone)", transform: expandedCategory === cat.name ? "rotate(90deg)" : "rotate(0)" }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ FAQ DETAIL PER KATEGORI ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 pb-16">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "rgba(201,183,156,.3)", borderTopColor: "var(--gold)" }} />
          </div>
        ) : searchQuery.trim() ? (
          /* Search Results */
          <div>
            <p className="text-sm font-ui mb-6" style={{ color: "var(--stone)" }}>
              {filteredFaqs.length} hasil untuk &quot;{searchQuery}&quot;
            </p>
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm font-ui" style={{ color: "var(--stone)" }}>Tidak ada pertanyaan yang cocok.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFaqs.map((faq, i) => (
                  <FaqAccordionItem
                    key={faq.id}
                    item={faq}
                    index={i}
                    isOpen={openItem === faq.id}
                    onToggle={() => setOpenItem(openItem === faq.id ? null : faq.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Category Sections */
          FAQ_CATEGORIES.map((cat) => {
            const catFaqs = faqsByCategory[cat.name] || [];
            if (catFaqs.length === 0) return null;
            const isExpanded = expandedCategory === cat.name;

            return (
              <div key={cat.name} id={`faq-category-${cat.name}`} className="mb-12 scroll-mt-28">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <div>
                    <p className="text-[11px] tracking-[0.15em] uppercase font-ui font-medium" style={{ color: "var(--gold)" }}>{cat.name}</p>
                    <h3 className="text-xl sm:text-2xl font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{cat.name}</h3>
                  </div>
                </div>
                <p className="text-sm font-ui mb-5" style={{ color: "var(--stone)" }}>{catFaqs.length} Pertanyaan</p>

                <div>
                  {catFaqs.map((faq, i) => (
                    <FaqAccordionItem
                      key={faq.id}
                      item={faq}
                      index={i}
                      isOpen={openItem === faq.id}
                      onToggle={() => setOpenItem(openItem === faq.id ? null : faq.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══ CTA ═══ */}
      <section style={{ background: "var(--espresso)" }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(181,140,74,.15)", border: "1px solid rgba(181,140,74,.3)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gold)" }}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <path d="M12 17h.01"/>
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
            Masih belum menemukan jawaban?
          </h2>
          <p className="text-sm font-ui mb-6" style={{ color: "rgba(212,197,181,.7)" }}>
            Tim Samaqu siap membantu kamu.
          </p>
          <a
            href={getWhatsAppLink("Halo SAMAQU, saya ingin bertanya seputar produk")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, var(--gold), #96742f)", color: "white", boxShadow: "0 8px 28px -8px rgba(181,140,74,.4)" }}
          >
            Hubungi Kami
            <ChevronRight size={16} />
          </a>
          <div className="mt-8 flex items-center justify-center gap-6">
            <a href="https://wa.me/6285212150100" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 transition-opacity hover:opacity-80">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.08)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--cream)" }}><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
              </div>
              <span className="text-[11px] font-ui" style={{ color: "rgba(212,197,181,.6)" }}>WhatsApp</span>
            </a>
            <a href="https://instagram.com/samaqu.id" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 transition-opacity hover:opacity-80">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.08)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--cream)" }}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </div>
              <span className="text-[11px] font-ui" style={{ color: "rgba(212,197,181,.6)" }}>Instagram</span>
            </a>
            <a href="mailto:halo@samaqu.id" className="flex flex-col items-center gap-2 transition-opacity hover:opacity-80">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.08)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--cream)" }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <span className="text-[11px] font-ui" style={{ color: "rgba(212,197,181,.6)" }}>Email</span>
            </a>
          </div>
        </div>
      </section>
    </section>
  );
}
