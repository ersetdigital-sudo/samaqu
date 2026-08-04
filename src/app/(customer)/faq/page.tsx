"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronRight, Package, Truck, Tag, RotateCcw, MessageCircle, Sparkles, CheckCircle } from "lucide-react";
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
  desc: string;
  key: string;
}

const FAQ_CATEGORIES: FaqCategory[] = [
  { name: "Order & Pembayaran", icon: <Package size={18} strokeWidth={1.5} />, desc: "Cara pesan, metode bayar, Harga Minimum", key: "order" },
  { name: "Pengiriman", icon: <Truck size={18} strokeWidth={1.5} />, desc: "Proses, estimasi, resi, luar negeri", key: "kirim" },
  { name: "Produk, Kain & Size", icon: <Tag size={18} strokeWidth={1.5} />, desc: "Jenis kain, series, ukuran, perawatan", key: "produk" },
  { name: "Retur & Garansi", icon: <RotateCcw size={18} strokeWidth={1.5} />, desc: "Tukar produk, produk salah atau rusak", key: "retur" },
  { name: "Paling Populer", icon: <Sparkles size={18} strokeWidth={1.5} />, desc: "Pertanyaan yang paling sering ditanyakan", key: "popular" },
];

const POPULAR_QUESTIONS = [
  { q: "Apa itu Create Your Price?", icon: <Package size={16} strokeWidth={1.5} /> },
  { q: "Apakah saya boleh memilih Harga Minimum?", icon: <Tag size={16} strokeWidth={1.5} /> },
  { q: "Apakah kualitas produk tetap sama jika memilih Harga Minimum?", icon: <Sparkles size={16} strokeWidth={1.5} /> },
  { q: "Bagaimana cara memilih ukuran yang tepat?", icon: <Tag size={16} strokeWidth={1.5} /> },
  { q: "Bagaimana cara mengetahui stok produk?", icon: <Package size={16} strokeWidth={1.5} /> },
  { q: "Bagaimana cara menghubungi Samaqu?", icon: <MessageCircle size={16} strokeWidth={1.5} /> },
];

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function FaqAccordionItem({ item, index, isOpen, onToggle }: { item: FaqItem; index: number; isOpen: boolean; onToggle: () => void }) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <div className="rounded-xl overflow-hidden mb-2.5" style={{ background: "white", border: "1px solid rgba(23,20,15,.08)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-4 px-4 text-left transition-colors"
        aria-expanded={isOpen}
      >
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{
            background: isOpen ? "var(--espresso)" : "rgba(42,33,27,.06)",
            color: isOpen ? "white" : "var(--espresso)",
          }}
        >
          {num}
        </span>
        <span className="flex-1 text-[14px] font-semibold leading-snug" style={{ color: "var(--espresso)" }}>
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
            <p className="pb-4 pl-14 pr-4 text-[13px] leading-relaxed" style={{ color: "rgba(42,33,27,.6)" }}>
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
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const { data } = await supabase.from("faq_items").select("*").eq("is_active", true).order("display_order");
        if (data) {
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

  const totalFaqs = faqs.length;

  const popularFaqs = useMemo(() => {
    return faqs.filter((f) => POPULAR_QUESTIONS.some((pq) => pq.q === f.question)).slice(0, 6);
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    let result = faqs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    }
    if (activeFilter !== "all") {
      result = result.filter((f) => f.category === activeFilter);
    }
    return result;
  }, [faqs, searchQuery, activeFilter]);

  const faqsByCategory = useMemo(() => {
    const map: Record<string, FaqItem[]> = {};
    for (const cat of FAQ_CATEGORIES) {
      map[cat.key] = faqs.filter((f) => f.category === cat.name);
    }
    return map;
  }, [faqs]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of FAQ_CATEGORIES) {
      counts[cat.key] = faqs.filter((f) => f.category === cat.name).length;
    }
    return counts;
  }, [faqs]);

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "rgba(190,139,60,.12)" }} />
        <div className="relative pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
            <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
              {/* Left: title + search */}
              <div>
                <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
                  <motion.p variants={headerVariants} className="flex items-center gap-2 text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 font-ui font-medium" style={{ color: "var(--gold)" }}>
                    <Sparkles size={14} strokeWidth={2} /> Pusat Bantuan
                  </motion.p>
                  <motion.h1 variants={headerVariants} className="text-[2.6rem] sm:text-5xl lg:text-[3.6rem] font-semibold leading-[1.05] tracking-tight mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
                    FAQ Samaqu
                  </motion.h1>
                  <motion.p variants={headerVariants} className="text-sm sm:text-[0.98rem] leading-relaxed max-w-lg font-ui" style={{ color: "rgba(212,197,181,.7)" }}>
                    Temukan jawaban dari pertanyaan yang paling sering ditanyakan seputar produk, pemesanan, Create Your Price, pengiriman, hingga retur.
                  </motion.p>
                </motion.div>

                {/* Search */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-7 max-w-md">
                  <div className="flex items-center gap-3 rounded-full px-5 py-3.5" style={{ background: "rgba(244,240,233,.08)", border: "1px solid rgba(244,240,233,.14)" }}>
                    <Search size={18} style={{ color: "var(--gold)" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari pertanyaan..."
                      className="flex-1 bg-transparent text-sm font-ui outline-none placeholder:text-[rgba(244,240,233,.45)]"
                      style={{ color: "var(--cream)" }}
                    />
                    <span className="text-xs font-semibold" style={{ color: "rgba(244,240,233,.45)" }}>{totalFaqs}</span>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium" style={{ color: "rgba(244,240,233,.55)" }}>
                  <span className="flex items-center gap-1.5"><CheckCircle size={13} style={{ color: "var(--gold)" }} /> {totalFaqs} pertanyaan terjawab</span>
                  <span className="flex items-center gap-1.5"><MessageCircle size={13} style={{ color: "var(--gold)" }} /> Tim siap membantu</span>
                </motion.div>
              </div>

              {/* Right: stats card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl p-6 sm:p-7" style={{ background: "var(--espresso)", border: "1px solid rgba(244,240,233,.14)" }}>
                <p className="text-[10px] tracking-[0.15em] uppercase font-ui font-bold" style={{ color: "rgba(244,240,233,.45)" }}>Ringkasan Bantuan</p>
                <div className="mt-5 grid grid-cols-2 gap-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--ink)", color: "var(--gold)" }}>
                      <Package size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--cream)" }}>Create Your Price</p>
                      <p className="mt-0.5 text-xs" style={{ color: "rgba(244,240,233,.55)" }}>Kamu pilih harganya</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--ink)", color: "var(--gold)" }}>
                      <Truck size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--cream)" }}>1–2 Hari Kerja</p>
                      <p className="mt-0.5 text-xs" style={{ color: "rgba(244,240,233,.55)" }}>Proses pesanan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--ink)", color: "var(--gold)" }}>
                      <Tag size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--cream)" }}>Panduan Size</p>
                      <p className="mt-0.5 text-xs" style={{ color: "rgba(244,240,233,.55)" }}>Tinggi & berat badan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--ink)", color: "var(--gold)" }}>
                      <RotateCcw size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--cream)" }}>Retur Dibantu</p>
                      <p className="mt-0.5 text-xs" style={{ color: "rgba(244,240,233,.55)" }}>Sesuai ketentuan</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BREADCRUMB ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14" style={{ paddingTop: "40px", paddingBottom: "24px" }}>
        <Breadcrumb />
      </div>

      <main className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 pb-16">

        {/* ═══ PERTANYAAN POPULER ═══ */}
        {!searchQuery.trim() && popularFaqs.length > 0 && (
          <section>
            <div className="flex items-end justify-between gap-4 mb-5">
              <h2 className="flex items-center gap-2.5 text-[1.35rem] sm:text-[1.6rem] font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(181,140,74,.1)", color: "var(--gold)" }}>
                  <Sparkles size={16} strokeWidth={1.5} />
                </div>
                Pertanyaan Populer
              </h2>
              <span className="hidden text-xs font-semibold" style={{ color: "rgba(42,33,27,.35)" }}>{popularFaqs.length} Pertanyaan</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {popularFaqs.map((faq, i) => (
                <motion.button
                  key={faq.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    setOpenItem(faq.id);
                    document.getElementById(`faq-section-${faq.category}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="text-left p-4 rounded-xl transition-all duration-200 hover:shadow-md group"
                  style={{ background: "white", border: "1px solid rgba(23,20,15,.08)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(181,140,74,.08)", color: "var(--gold)" }}>
                    {POPULAR_QUESTIONS[i]?.icon || <Sparkles size={16} strokeWidth={1.5} />}
                  </div>
                  <p className="text-[13px] sm:text-sm font-semibold leading-snug line-clamp-2 mb-2" style={{ color: "var(--espresso)" }}>
                    {faq.question}
                  </p>
                  <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--gold)" }}>
                    Lihat jawaban <ChevronRight size={12} />
                  </span>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* ═══ SEMUA KATEGORI ═══ */}
        {!searchQuery.trim() && (
          <section className="mt-12 sm:mt-16">
            <div className="flex items-end justify-between gap-4 mb-5">
              <h2 className="flex items-center gap-2.5 text-[1.35rem] sm:text-[1.6rem] font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(181,140,74,.1)", color: "var(--gold)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="1.4"/><circle cx="12" cy="7" r="1.4"/><circle cx="17" cy="7" r="1.4"/><circle cx="7" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="17" cy="12" r="1.4"/><circle cx="7" cy="17" r="1.4"/><circle cx="12" cy="17" r="1.4"/><circle cx="17" cy="17" r="1.4"/></svg>
                </div>
                Semua Kategori
              </h2>
              <button
                onClick={() => setActiveFilter("all")}
                className="px-4 py-2 text-xs font-semibold rounded-full transition-all"
                style={{
                  background: activeFilter === "all" ? "var(--espresso)" : "white",
                  color: activeFilter === "all" ? "var(--cream)" : "var(--espresso)",
                  border: `1px solid ${activeFilter === "all" ? "var(--espresso)" : "rgba(23,20,15,.1)"}`,
                }}
              >
                Semua
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(23,20,15,.08)", boxShadow: "0 1px 2px rgba(23,20,15,.05)" }}>
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveFilter(cat.key)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-200"
                  style={{ borderBottom: "1px solid rgba(23,20,15,.06)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(181,140,74,.08)", color: "var(--gold)" }}>
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--espresso)" }}>{cat.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(42,33,27,.35)" }}>{cat.desc}</p>
                  </div>
                  <span className="hidden text-xs font-semibold sm:block" style={{ color: "rgba(42,33,27,.35)" }}>{categoryCounts[cat.key] || 0} Pertanyaan</span>
                  <ChevronRight size={16} style={{ color: "rgba(42,33,27,.35)" }} />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ═══ FAQ LIST ═══ */}
        <div className="mt-12 sm:mt-16">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "rgba(201,183,156,.3)", borderTopColor: "var(--gold)" }} />
            </div>
          ) : searchQuery.trim() ? (
            /* Search Results */
            <div>
              <p className="text-sm font-ui mb-6" style={{ color: "rgba(42,33,27,.5)" }}>
                {filteredFaqs.length} hasil untuk &quot;{searchQuery}&quot;
              </p>
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-16 rounded-2xl" style={{ background: "white", border: "1px solid rgba(23,20,15,.08)" }}>
                  <p className="text-sm font-ui" style={{ color: "rgba(42,33,27,.5)" }}>Tidak ada pertanyaan yang cocok. Coba kata kunci lain atau{" "}
                    <a href="#hubungi" className="font-semibold" style={{ color: "var(--gold)" }}>hubungi tim Samaqu</a>.
                  </p>
                </div>
              ) : (
                <div>
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
              const catFaqs = faqsByCategory[cat.key] || [];
              if (catFaqs.length === 0) return null;

              return (
                <div key={cat.key} id={`faq-section-${cat.name}`} className="mb-12 scroll-mt-28">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(181,140,74,.08)", color: "var(--gold)" }}>
                      {cat.icon}
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase font-ui font-bold" style={{ color: "var(--gold)" }}>{cat.name}</p>
                      <p className="text-xs" style={{ color: "rgba(42,33,27,.35)" }}>{catFaqs.length} Pertanyaan</p>
                    </div>
                  </div>

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
        <section id="hubungi" className="relative overflow-hidden rounded-2xl mt-14" style={{ background: "var(--espresso)" }}>
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: "rgba(190,139,60,.14)" }} />
          <div className="relative p-8 sm:p-10 text-center">
            <div className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(190,139,60,.15)", border: "1px solid rgba(190,139,60,.3)" }}>
              <MessageCircle size={26} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
            </div>
            <h2 className="text-[1.5rem] sm:text-[2rem] font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
              Masih belum menemukan jawaban?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: "rgba(244,240,233,.65)" }}>
              Tim Samaqu siap membantu kamu — dari konsultasi ukuran, status pesanan, hingga proses retur.
            </p>

            <a
              href={getWhatsAppLink("Halo SAMAQU, saya ingin bertanya seputar produk")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition-all duration-200 mt-7"
              style={{ background: "var(--gold)", color: "white", boxShadow: "0 10px 24px -14px rgba(190,139,60,.9)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
              Hubungi Kami
            </a>

            <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
              <a href={getWhatsAppLink("Halo SAMAQU")} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 rounded-2xl py-4 transition-colors" style={{ border: "1px solid rgba(244,240,233,.14)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "rgba(212,197,181,.6)" }}><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
                <span className="text-xs font-semibold" style={{ color: "var(--cream)" }}>WhatsApp</span>
              </a>
              <a href="https://instagram.com/samaqu.id" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 rounded-2xl py-4 transition-colors" style={{ border: "1px solid rgba(244,240,233,.14)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(212,197,181,.6)" }}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                <span className="text-xs font-semibold" style={{ color: "var(--cream)" }}>Instagram</span>
              </a>
              <a href="mailto:halo@samaqu.id" className="flex flex-col items-center gap-2 rounded-2xl py-4 transition-colors" style={{ border: "1px solid rgba(244,240,233,.14)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(212,197,181,.6)" }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <span className="text-xs font-semibold" style={{ color: "var(--cream)" }}>Email</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </section>
  );
}
