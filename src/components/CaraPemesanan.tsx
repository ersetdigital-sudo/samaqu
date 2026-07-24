"use client";

import { motion, Variants, useInView } from "framer-motion";
import { useRef } from "react";
import { Search, Ruler, MessageCircle, Crown } from "lucide-react";

/* ─── Data ─── */
const steps = [
  {
    num: "01",
    title: "Pilih Produk",
    desc: "Jelajahi katalog dan tentukan koleksi favoritmu — dari Thobe hingga Vest.",
    icon: Search,
  },
  {
    num: "02",
    title: "Cek Size",
    desc: "Gunakan panduan size kami agar potongan pas dan nyaman dikenakan.",
    icon: Ruler,
  },
  {
    num: "03",
    title: "Chat Admin",
    desc: "Hubungi admin via WhatsApp untuk konfirmasi ketersediaan dan pemesanan.",
    icon: MessageCircle,
  },
  {
    num: "04",
    title: "Selesai",
    desc: "Bayar, pesanan diproses, dan busana pilihanmu segera dalam perjalanan.",
    icon: Crown,
  },
];

const waHref =
  "https://wa.me/6281234567890?text=" +
  encodeURIComponent(
    "Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan."
  );

/* ─── Animation ─── */
const headerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Step card ─── */
function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[number];
  index: number;
}) {
  const Icon = step.icon;

  return (
    <motion.div
      variants={stepVariants}
      className="group relative flex flex-col items-center text-center lg:flex-1"
    >
      {/* Step marker (number + icon) */}
      <div className="relative mb-5 sm:mb-6">
        {/* Outer ring — appears on hover */}
        <div
          className="absolute inset-[-8px] rounded-full border-2 border-transparent transition-all duration-500 group-hover:border-[var(--gold)] group-hover:inset-[-10px] opacity-0 group-hover:opacity-100"
          style={{ borderColor: "var(--gold)" }}
        />

        {/* Circle */}
        <div
          className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105"
          style={{
            background: "white",
            border: "1.5px solid rgba(201,183,156,.3)",
            boxShadow: "0 2px 12px -4px rgba(43,38,32,.06)",
          }}
        >
          {/* Number */}
          <span
            className="font-semibold text-lg transition-all duration-300 group-hover:opacity-0 group-hover:scale-75"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            {step.num}
          </span>

          {/* Icon — appears on hover */}
          <Icon
            size={26}
            strokeWidth={1.4}
            className="absolute opacity-0 scale-75 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100"
            style={{ color: "var(--gold)" }}
          />
        </div>
      </div>

      {/* Text */}
      <h3
        className="text-[13px] sm:text-[14px] font-semibold tracking-[0.12em] uppercase mb-2 font-ui"
        style={{ color: "var(--espresso)" }}
      >
        {step.title}
      </h3>
      <p
        className="text-[12.5px] sm:text-[13px] leading-[1.7] font-ui max-w-[220px]"
        style={{ color: "var(--coffee)" }}
      >
        {step.desc}
      </p>
    </motion.div>
  );
}

/* ─── Progress line (horizontal) ─── */
function ProgressLine() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div
      ref={ref}
      className="hidden lg:block absolute top-[36px] left-[12.5%] right-[12.5%] h-px"
      style={{ background: "rgba(201,183,156,.25)" }}
    >
      <motion.div
        className="h-full origin-left"
        style={{ background: "var(--gold)" }}
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
    </div>
  );
}

/* ─── Progress line (vertical) ─── */
function VerticalProgressLine() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div
      ref={ref}
      className="lg:hidden absolute top-0 bottom-0 left-[31px] sm:left-[35px] w-px"
      style={{ background: "rgba(201,183,156,.2)" }}
    >
      <motion.div
        className="w-full origin-top"
        style={{ background: "var(--gold)" }}
        initial={{ scaleY: 0 }}
        animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
    </div>
  );
}

/* ─── Section ─── */
export default function CaraPemesanan() {
  return (
    <section
      id="cara-pesan"
      className="py-24 sm:py-32 lg:py-36"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* ── Header ── */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16 sm:mb-20"
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
            className="text-[11px] sm:text-[12px] tracking-[0.36em] uppercase mb-5 font-ui font-medium"
            style={{ color: "var(--gold)" }}
          >
            Mudah &amp; Terarah
          </motion.p>
          <motion.h2
            variants={headerVariants}
            className="text-[2rem] sm:text-5xl lg:text-[3.5rem] font-semibold mb-6 leading-[1.1] tracking-tight"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            Cara Pemesanan
          </motion.h2>
          <motion.p
            variants={headerVariants}
            className="text-sm sm:text-base lg:text-[17px] leading-[1.75] font-ui max-w-lg mx-auto"
            style={{ color: "var(--coffee)" }}
          >
            Tanpa ribet. Empat langkah tenang dari melihat koleksi sampai
            pesanan dikonfirmasi admin kami.
          </motion.p>
        </motion.div>

        {/* ── Timeline ── */}
        <div className="relative">
          <ProgressLine />
          <VerticalProgressLine />

          {/* Desktop: horizontal | Mobile: vertical */}
          <motion.div
            className="relative flex flex-col gap-10 lg:flex-row lg:gap-0"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
          >
            {/* Mobile: left marker column | Desktop: full width */}
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex gap-5 lg:gap-0">
                {/* Mobile timeline dot */}
                <div
                  className="lg:hidden shrink-0 w-[62px] sm:w-[70px] flex justify-center"
                >
                  <div
                    className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-all duration-500"
                    style={{
                      background: "white",
                      border: "1.5px solid rgba(201,183,156,.3)",
                      boxShadow: "0 2px 12px -4px rgba(43,38,32,.06)",
                    }}
                  >
                    <span
                      className="font-semibold text-lg"
                      style={{
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        color: "var(--espresso)",
                      }}
                    >
                      {step.num}
                    </span>
                  </div>
                </div>

                {/* Mobile text */}
                <div className="lg:hidden flex-1 pt-3 sm:pt-4">
                  <h3
                    className="text-[13px] sm:text-[14px] font-semibold tracking-[0.12em] uppercase mb-2 font-ui"
                    style={{ color: "var(--espresso)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-[12.5px] sm:text-[13px] leading-[1.7] font-ui"
                    style={{ color: "var(--coffee)" }}
                  >
                    {step.desc}
                  </p>
                </div>

                {/* Desktop card */}
                <div className="hidden lg:block w-full">
                  <StepCard step={step} index={i} />
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── CTA ── */}
        <motion.div
          className="text-center mt-16 sm:mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-2.5 rounded-full px-8 sm:px-10 py-4 sm:py-[18px] text-[11px] sm:text-[12px] tracking-[0.16em] uppercase font-ui font-medium transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
            style={{
              background: "var(--gold)",
              color: "white",
              boxShadow: "0 4px 16px -4px rgba(184,145,70,.3)",
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="transition-transform duration-300 group-hover:scale-110"
            >
              <path d="M17.6 6.3A7.85 7.85 0 0 0 12 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1A7.9 7.9 0 0 0 12 19.9 7.94 7.94 0 0 0 17.6 6.3ZM12 18.5a6.6 6.6 0 0 1-3.4-.9l-.24-.15-2.5.66.67-2.43-.16-.25A6.58 6.58 0 1 1 12 18.5Zm3.6-4.94c-.2-.1-1.17-.58-1.35-.64s-.31-.1-.44.1-.5.64-.62.77-.23.15-.43.05a5.4 5.4 0 0 1-1.59-.98 6 6 0 0 1-1.1-1.37c-.11-.2 0-.3.09-.4l.3-.35a1.36 1.36 0 0 0 .2-.33.37.37 0 0 0 0-.35c0-.1-.44-1.06-.6-1.45s-.32-.33-.44-.34h-.38a.72.72 0 0 0-.52.24 2.18 2.18 0 0 0-.68 1.62 3.79 3.79 0 0 0 .79 2 8.66 8.66 0 0 0 3.32 2.93c.46.2.83.32 1.11.41a2.68 2.68 0 0 0 1.23.08 2 2 0 0 0 1.32-.94 1.65 1.65 0 0 0 .11-.93c-.05-.09-.18-.14-.38-.24Z" />
            </svg>
            Mulai Pesan Sekarang
          </a>
        </motion.div>
      </div>
    </section>
  );
}
