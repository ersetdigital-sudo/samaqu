"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { CoatHanger, Ruler, ChatCircle, Package } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

/* ─── Default Data ─── */
const DEFAULT_STEPS = [
  { title: "Pilih Produk", desc: "Jelajahi katalog dan tentukan koleksi favoritmu — dari Thobe hingga Vest.", Icon: CoatHanger },
  { title: "Cek Ukuran", desc: "Gunakan panduan size kami agar potongan pas dan nyaman dikenakan.", Icon: Ruler },
  { title: "Chat Admin", desc: "Hubungi admin via WhatsApp untuk konfirmasi ketersediaan dan pemesanan.", Icon: ChatCircle },
  { title: "Selesai", desc: "Bayar, pesanan diproses, dan busana pilihanmu segera dalam perjalanan.", Icon: Package },
];

const STEP_ICONS = [CoatHanger, Ruler, ChatCircle, Package];

import { getWhatsAppLink } from "@/lib/store-settings";

/* ─── Animation ─── */
const headerVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Step ─── */
function StepItem({
  step,
  index,
}: {
  step: (typeof DEFAULT_STEPS)[number];
  index: number;
}) {
  return (
    <motion.div
      variants={stepVariants}
      className="step group relative z-10 text-center"
    >
      {/* Marker circle */}
      <div className="marker mx-auto mb-5 sm:mb-6 w-[64px] h-[64px] sm:w-[78px] sm:h-[78px] rounded-full flex items-center justify-center transition-all duration-450 group-hover:scale-105 group-hover:shadow-lg"
        style={{
          background: "var(--bg-primary)",
          border: "1.5px solid var(--warm-sand)",
        }}
      >
        <span className="step-icon w-6 h-6 sm:w-7 sm:h-7 transition-all duration-450 group-hover:scale-110" style={{ color: "var(--espresso)" }}>
          <step.Icon size={28} weight="light" />
        </span>
      </div>

      {/* Number */}
      <div
        className="marker-num mb-2 text-[1.6rem] sm:text-[2rem] font-bold leading-none transition-colors duration-450 group-hover:text-gold"
        style={{
          fontFamily: "var(--font-cormorant), Georgia, serif",
          color: "var(--warm-sand)",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Title */}
      <h3
        className="step-title text-[1.25rem] sm:text-[1.5rem] font-semibold mb-2 transition-colors duration-400 group-hover:text-gold"
        style={{ color: "var(--espresso)" }}
      >
        {step.title}
      </h3>

      {/* Description */}
      <p
        className="step-desc text-[0.9rem] sm:text-[0.94rem] leading-[1.7] max-w-[15rem] mx-auto"
        style={{ color: "rgba(42,33,27,.72)" }}
      >
        {step.desc}
      </p>
    </motion.div>
  );
}

/* ─── Timeline Track ─── */
function TimelineTrack() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <>
      {/* Desktop horizontal */}
      <div
        ref={ref}
        className="hidden md:block absolute top-[39px] left-[12.5%] right-[12.5%] h-[2px] rounded-full overflow-hidden z-0"
        style={{ background: "rgba(216,196,168,.45)" }}
      >
        <motion.div
          className="absolute inset-0 origin-left"
          style={{
            background: "linear-gradient(90deg, var(--gold), var(--gold-dark))",
          }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Mobile vertical */}
      <div
        className="md:hidden absolute top-[32px] bottom-[32px] left-[32px] w-[2px] rounded-full overflow-hidden z-0"
        style={{ background: "rgba(216,196,168,.35)" }}
      >
        <motion.div
          className="absolute inset-0 origin-top"
          style={{
            background: "linear-gradient(180deg, var(--gold), var(--gold-dark))",
          }}
          initial={{ scaleY: 0 }}
          animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
    </>
  );
}

/* ─── Section ─── */
export default function CaraPemesanan() {
  const [steps, setSteps] = useState(DEFAULT_STEPS);

  useEffect(() => {
    async function fetchSteps() {
      try {
        const { data } = await supabase.from("order_steps").select("*").order("step_number");
        if (data && data.length > 0) {
          setSteps(data.map((s: { title: string; description: string }, i: number) => ({
            title: s.title,
            desc: s.description,
            Icon: STEP_ICONS[i] || Package,
          })));
        }
      } catch { /* use defaults */ }
    }
    fetchSteps();
  }, []);

  return (
    <section
      id="cara-pesan"
      className="relative px-5 sm:px-6 py-14 sm:py-24 lg:py-32 overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, rgba(216,196,168,.14), transparent 45%), radial-gradient(circle at 85% 90%, rgba(184,145,70,.08), transparent 45%), var(--bg-primary)",
      }}
      aria-labelledby="cara-pesan-title"
    >
      <div className="mx-auto max-w-6xl">
        {/* ── Header ── */}
        <motion.div
          className="text-center mb-6 sm:mb-14 lg:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          <motion.p
            variants={headerVariants}
            className="eyebrow inline-flex items-center gap-3 sm:gap-4 text-[0.72rem] font-medium uppercase tracking-[0.28em] font-ui"
            style={{ color: "var(--gold)" }}
          >
            <span className="w-6 sm:w-[26px] h-px" style={{ background: "var(--warm-sand)" }} />
            Mudah &amp; Terarah
            <span className="w-6 sm:w-[26px] h-px" style={{ background: "var(--warm-sand)" }} />
          </motion.p>
          <motion.h2
            variants={headerVariants}
            id="cara-pesan-title"
            className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            Cara{" "}
            <em className="italic font-medium" style={{ color: "var(--gold)" }}>
              Pemesanan
            </em>
          </motion.h2>
          <motion.p
            variants={headerVariants}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed font-ui"
            style={{ color: "var(--text-secondary)" }}
          >
            Tanpa ribet. Empat langkah tenang dari melihat koleksi sampai
            pesanan dikonfirmasi admin kami.
          </motion.p>
        </motion.div>

        {/* ── Mobile: 2x2 compact grid ── */}
        <motion.div
          className="md:hidden grid grid-cols-2 gap-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={stepVariants}
              className="group relative rounded-xl border bg-white/80 p-3.5 overflow-hidden transition-all duration-300 hover:shadow-md"
              style={{ borderColor: "rgba(216,196,168,.25)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <step.Icon size={20} weight="light" style={{ color: "var(--gold)" }} />
                <span
                  className="text-[1.3rem] font-bold leading-none"
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    color: "var(--espresso)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3
                className="text-sm font-semibold mb-1 font-ui"
                style={{ color: "var(--espresso)" }}
              >
                {step.title}
              </h3>
              <p
                className="text-[11px] leading-snug font-ui"
                style={{ color: "rgba(42,33,27,.65)" }}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Desktop: horizontal timeline ── */}
        <div className="hidden md:block timeline relative">
          <TimelineTrack />

          <motion.div
            className="relative z-10 grid grid-cols-4 gap-8 lg:gap-12"
            role="list"
            aria-label="Empat langkah cara pemesanan"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12 } },
            }}
          >
            {steps.map((step, i) => (
              <StepItem key={i} step={step} index={i} />
            ))}
          </motion.div>
        </div>

        {/* ── CTA ── */}
        <motion.div
          className="text-center mt-16 sm:mt-20 lg:mt-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <a
            className="cta group inline-flex items-center gap-2.5 rounded-full px-7 sm:px-9 py-3.5 sm:py-4 text-[0.85rem] sm:text-[0.9rem] font-semibold uppercase tracking-[0.08em] font-ui transition-all duration-350 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg"
            style={{
              background: "var(--gold)",
              color: "#fff",
              boxShadow: "0 8px 24px rgba(184,145,70,.25)",
            }}
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            aria-label="Mulai pesan sekarang via WhatsApp"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
            </svg>
            Mulai Pesan Sekarang
            <svg
              className="cta-arrow transition-transform duration-350 group-hover:translate-x-1"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
