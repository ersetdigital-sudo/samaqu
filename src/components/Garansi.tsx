"use client";

import { motion, Variants } from "framer-motion";

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

/* ─── SVG Illustrations (SAMAQU brand) ─── */
function ShieldIllustration() {
  return (
    <svg viewBox="0 0 240 170" fill="none" className="w-full h-full">
      {/* Decorative circles */}
      <circle cx="120" cy="85" r="60" fill="var(--sand-2)" opacity=".6" />
      <circle cx="120" cy="85" r="42" fill="var(--cream)" stroke="var(--clay)" strokeWidth=".8" />
      {/* Shield */}
      <path
        d="M120 48 L168 66 V100 C168 124 146 140 120 148 C94 140 72 124 72 100 V66 Z"
        fill="white"
        stroke="var(--espresso)"
        strokeWidth="1.6"
      />
      <path
        d="M120 58 L160 74 V100 C160 120 142 134 120 140 C98 134 80 120 80 100 V74 Z"
        fill="var(--sand-2)"
        stroke="var(--gold)"
        strokeWidth="1"
      />
      {/* Checkmark */}
      <path
        d="M100 98 L114 112 L144 82"
        stroke="var(--gold)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Sparkles */}
      <circle cx="56" cy="48" r="3" fill="var(--gold)" opacity=".3" />
      <circle cx="184" cy="48" r="3" fill="var(--gold)" opacity=".3" />
      <circle cx="120" cy="30" r="2.5" fill="var(--gold)" opacity=".25" />
      <path d="M52 72 L56 68 L60 72 L56 76 Z" fill="var(--gold)" opacity=".15" />
      <path d="M180 72 L184 68 L188 72 L184 76 Z" fill="var(--gold)" opacity=".15" />
    </svg>
  );
}

function BoxIllustration() {
  return (
    <svg viewBox="0 0 240 170" fill="none" className="w-full h-full">
      {/* Decorative circles */}
      <circle cx="120" cy="85" r="60" fill="var(--sand-2)" opacity=".6" />
      <circle cx="120" cy="85" r="42" fill="var(--cream)" stroke="var(--clay)" strokeWidth=".8" />
      {/* Box body */}
      <rect x="68" y="78" width="104" height="64" rx="3" fill="white" stroke="var(--espresso)" strokeWidth="1.4" />
      {/* Box lid */}
      <rect x="60" y="60" width="120" height="22" rx="3" fill="var(--sand-2)" stroke="var(--espresso)" strokeWidth="1.4" />
      {/* Ribbon vertical */}
      <rect x="114" y="60" width="12" height="82" fill="var(--gold)" opacity=".2" />
      {/* Ribbon horizontal */}
      <rect x="60" y="64" width="120" height="14" fill="var(--gold)" opacity=".12" />
      {/* Bow center */}
      <circle cx="120" cy="63" r="7" fill="var(--gold)" opacity=".4" />
      {/* Bow loops */}
      <path d="M112 60 Q106 48 120 52 Q110 44 108 56" fill="var(--gold)" opacity=".3" />
      <path d="M128 60 Q134 48 120 52 Q130 44 132 56" fill="var(--gold)" opacity=".3" />
      {/* Sparkles */}
      <circle cx="52" cy="50" r="2.5" fill="var(--gold)" opacity=".3" />
      <circle cx="188" cy="50" r="2.5" fill="var(--gold)" opacity=".3" />
      <path d="M48 80 L52 76 L56 80 L52 84 Z" fill="var(--gold)" opacity=".15" />
      <path d="M184 80 L188 76 L192 80 L188 84 Z" fill="var(--gold)" opacity=".15" />
    </svg>
  );
}

function ChatIllustration() {
  return (
    <svg viewBox="0 0 240 170" fill="none" className="w-full h-full">
      {/* Decorative circles */}
      <circle cx="120" cy="85" r="60" fill="var(--sand-2)" opacity=".6" />
      <circle cx="120" cy="85" r="42" fill="var(--cream)" stroke="var(--clay)" strokeWidth=".8" />
      {/* Chat bubble */}
      <rect x="68" y="52" width="104" height="72" rx="14" fill="white" stroke="var(--espresso)" strokeWidth="1.4" />
      {/* Bubble tail */}
      <path d="M96 124 L108 140 L120 124" fill="white" stroke="var(--espresso)" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="94" y="122" width="28" height="4" fill="white" />
      {/* Lines in bubble */}
      <rect x="88" y="70" width="64" height="4.5" rx="2.25" fill="var(--clay)" opacity=".3" />
      <rect x="88" y="82" width="48" height="4.5" rx="2.25" fill="var(--clay)" opacity=".3" />
      <rect x="88" y="94" width="56" height="4.5" rx="2.25" fill="var(--clay)" opacity=".3" />
      {/* Heart */}
      <path
        d="M120 76 C120 70 112 66 108 72 C104 66 96 70 96 76 C96 84 108 90 108 90 C108 90 120 84 120 76Z"
        fill="var(--gold)"
        opacity=".45"
        transform="translate(16, -4) scale(0.8)"
      />
      {/* Sparkles */}
      <circle cx="56" cy="44" r="2.5" fill="var(--gold)" opacity=".3" />
      <circle cx="184" cy="44" r="2.5" fill="var(--gold)" opacity=".3" />
      <path d="M52 68 L56 64 L60 68 L56 72 Z" fill="var(--gold)" opacity=".15" />
      <path d="M180 68 L184 64 L188 68 L184 72 Z" fill="var(--gold)" opacity=".15" />
    </svg>
  );
}

/* ─── Data ─── */
const guarantees = [
  {
    id: 1,
    title: "Kualitas Terjamin",
    desc: "Setiap produk melewati pengecekan jahitan dan bahan sebelum dikirim.",
    Illustration: ShieldIllustration,
  },
  {
    id: 2,
    title: "Pengiriman Aman",
    desc: "Dikemas rapi dan terlindungi agar sampai dalam kondisi sempurna.",
    Illustration: BoxIllustration,
  },
  {
    id: 3,
    title: "Layanan Ramah",
    desc: "Admin siap membantu dari pemilihan size hingga setelah pembelian.",
    Illustration: ChatIllustration,
  },
];

const trustBadges = ["100% Original", "Packing Aman", "Support Personal"];

/* ─── Card (BagUI feature-1 layout) ─── */
function FeatureCard({
  title,
  desc,
  Illustration,
}: {
  title: string;
  desc: string;
  Illustration: React.FC;
}) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-white rounded-sm overflow-hidden flex flex-col cursor-pointer"
      style={{
        boxShadow: "0 2px 16px -6px rgba(43,38,32,.07)",
        border: "1px solid rgba(201,183,156,.15)",
      }}
    >
      {/* Illustration area */}
      <div
        className="w-full h-[140px] sm:h-[160px] flex items-center justify-center p-4 border-b transition-colors duration-500 group-hover:bg-[var(--sand-2)]"
        style={{
          background: "var(--cream)",
          borderColor: "rgba(201,183,156,.12)",
        }}
      >
        <Illustration />
      </div>

      {/* Text */}
      <div className="p-5 sm:p-6 flex flex-col gap-2">
        <h3
          className="text-[13px] sm:text-[14px] font-semibold tracking-[0.1em] uppercase font-ui"
          style={{ color: "var(--espresso)" }}
        >
          {title}
        </h3>
        <p
          className="text-[12.5px] sm:text-[13px] leading-[1.7] font-ui"
          style={{ color: "var(--coffee)" }}
        >
          {desc}
        </p>
      </div>

      {/* Bottom gold accent */}
      <span
        className="h-[2px] w-0 transition-all duration-500 group-hover:w-full"
        style={{ background: "var(--gold)" }}
      />
    </motion.div>
  );
}

/* ─── Section ─── */
export default function Garansi() {
  return (
    <section className="relative py-24 sm:py-32 lg:py-36 overflow-hidden">
      {/* Subtle dot pattern background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 1px 1px, rgba(201,183,156,.1) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          backgroundColor: "var(--sand-2)",
        }}
      />

      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* ── Header ── */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14 sm:mb-18 lg:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          <motion.p
            variants={headerVariants}
            className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-5 font-ui font-medium"
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

        {/* ── Feature cards (BagUI layout: 3 cols) ── */}
        <motion.div
          className="grid sm:grid-cols-3 gap-4 sm:gap-5 mb-14 sm:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
        >
          {guarantees.map((g) => (
            <FeatureCard key={g.id} {...g} />
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
