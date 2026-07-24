"use client";

import { motion, Variants } from "framer-motion";
import { ShieldCheck, Package, Headphones } from "lucide-react";

/* ─── Animation ─── */
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/* ─── Data ─── */
const guarantees = [
  {
    icon: ShieldCheck,
    title: "Kualitas Terjamin",
    desc: "Setiap produk melewati pengecekan jahitan dan bahan sebelum dikirim.",
  },
  {
    icon: Package,
    title: "Pengiriman Aman",
    desc: "Dikemas rapi dan terlindungi agar sampai dalam kondisi sempurna.",
  },
  {
    icon: Headphones,
    title: "Layanan Ramah",
    desc: "Admin siap membantu dari pemilihan size hingga setelah pembelian.",
  },
];

const trustBadges = [
  "100% Original",
  "Packing Aman",
  "Support Personal",
];

/* ─── Card ─── */
function GuaranteeCard({
  icon: Icon,
  title,
  desc,
}: (typeof guarantees)[number]) {
  return (
    <motion.div
      variants={cardVariants}
      className="group relative bg-white rounded-sm p-7 sm:p-9 flex flex-col items-center text-center transition-all duration-500 hover:-translate-y-1.5"
      style={{
        boxShadow: "0 2px 12px -4px rgba(43,38,32,.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 12px 40px -12px rgba(43,38,32,.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 12px -4px rgba(43,38,32,.06)";
      }}
    >
      {/* Icon */}
      <div
        className="w-16 h-16 mb-6 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
        style={{
          background: "var(--sand-2)",
          border: "1px solid rgba(201,183,156,.2)",
        }}
      >
        <Icon
          size={28}
          strokeWidth={1.5}
          style={{ color: "var(--espresso)" }}
        />
      </div>

      <h3
        className="text-[13px] sm:text-[14px] font-semibold tracking-[0.12em] uppercase mb-3 font-ui"
        style={{ color: "var(--espresso)" }}
      >
        {title}
      </h3>

      <p
        className="text-[13px] sm:text-sm leading-[1.75] font-ui max-w-[260px]"
        style={{ color: "var(--coffee)" }}
      >
        {desc}
      </p>

      {/* Bottom gold accent — hidden by default, visible on hover */}
      <span
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 transition-all duration-500 group-hover:w-12 rounded-full"
        style={{ background: "var(--gold)" }}
      />
    </motion.div>
  );
}

/* ─── Section ─── */
export default function Garansi() {
  return (
    <section className="relative py-24 sm:py-32 lg:py-36 overflow-hidden">
      {/* Subtle pattern background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 1px 1px, rgba(201,183,156,.12) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          backgroundColor: "var(--sand-2)",
        }}
      />

      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* ── Header ── */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16 sm:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          <motion.p
            variants={headerVariants}
            className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-5 font-ui"
            style={{ color: "var(--gold)" }}
          >
            Ketenangan Berbelanja
          </motion.p>
          <motion.h2
            variants={headerVariants}
            className="text-[2rem] sm:text-5xl lg:text-[3.5rem] font-semibold mb-6 leading-[1.1] tracking-tight"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            Jaminan SAMAQU
          </motion.h2>
          <motion.p
            variants={headerVariants}
            className="text-sm sm:text-base lg:text-[17px] leading-[1.75] font-ui max-w-lg mx-auto"
            style={{ color: "var(--coffee)" }}
          >
            Kami menjaga kepercayaanmu di setiap pesanan — dari kualitas bahan
            hingga pesanan sampai di tangan.
          </motion.p>
        </motion.div>

        {/* ── Cards ── */}
        <motion.div
          className="grid sm:grid-cols-3 gap-5 sm:gap-6 mb-14 sm:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
        >
          {guarantees.map((g) => (
            <GuaranteeCard key={g.title} {...g} />
          ))}
        </motion.div>

        {/* ── Trust badges ── */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={containerVariants}
        >
          {trustBadges.map((badge) => (
            <motion.div
              key={badge}
              variants={headerVariants}
              className="flex items-center gap-2"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span
                className="text-[11px] sm:text-[12px] tracking-[0.14em] uppercase font-ui font-medium"
                style={{ color: "var(--stone)" }}
              >
                {badge}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
