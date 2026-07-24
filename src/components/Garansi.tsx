"use client";

import { motion, Variants } from "framer-motion";

/* ─── Animation variants ─── */
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ─── SVG Illustrations (SAMAQU brand) ─── */
function ShieldSvg() {
  return (
    <svg
      viewBox="0 0 240 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Shield body */}
      <path
        d="M120 24 L192 52 V96 C192 132 158 154 120 164 C82 154 48 132 48 96 V52 Z"
        fill="var(--sand-2)"
        stroke="var(--clay)"
        strokeWidth="1.4"
      />
      <path
        d="M120 36 L180 60 V96 C180 126 150 146 120 155 C90 146 60 126 60 96 V60 Z"
        fill="white"
        stroke="var(--gold)"
        strokeWidth="1.2"
      />
      {/* Checkmark */}
      <path
        d="M96 94 L112 110 L148 74"
        stroke="var(--gold)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Sparkle dots */}
      <circle cx="60" cy="40" r="2.5" fill="var(--gold)" opacity=".4" />
      <circle cx="180" cy="40" r="2.5" fill="var(--gold)" opacity=".4" />
      <circle cx="120" cy="16" r="2" fill="var(--gold)" opacity=".3" />
    </svg>
  );
}

function BoxSvg() {
  return (
    <svg
      viewBox="0 0 240 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Box base */}
      <rect
        x="52"
        y="72"
        width="136"
        height="80"
        rx="4"
        fill="var(--sand-2)"
        stroke="var(--clay)"
        strokeWidth="1.2"
      />
      {/* Box lid */}
      <rect
        x="44"
        y="56"
        width="152"
        height="20"
        rx="4"
        fill="white"
        stroke="var(--gold)"
        strokeWidth="1.4"
      />
      {/* Ribbon vertical */}
      <rect
        x="114"
        y="56"
        width="12"
        height="96"
        fill="var(--gold)"
        opacity=".2"
      />
      {/* Ribbon horizontal */}
      <rect
        x="44"
        y="60"
        width="152"
        height="12"
        fill="var(--gold)"
        opacity=".15"
      />
      {/* Ribbon cross */}
      <circle
        cx="120"
        cy="62"
        r="8"
        fill="var(--gold)"
        opacity=".35"
      />
      {/* Bow */}
      <path
        d="M112 56 Q108 42 120 48 Q132 42 128 56"
        stroke="var(--gold)"
        strokeWidth="1.5"
        fill="var(--sand-2)"
      />
      {/* Sparkle */}
      <circle cx="72" cy="44" r="2" fill="var(--gold)" opacity=".3" />
      <circle cx="168" cy="44" r="2" fill="var(--gold)" opacity=".3" />
    </svg>
  );
}

function HeartSvg() {
  return (
    <svg
      viewBox="0 0 240 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Chat bubble */}
      <rect
        x="56"
        y="36"
        width="128"
        height="88"
        rx="16"
        fill="var(--sand-2)"
        stroke="var(--clay)"
        strokeWidth="1.2"
      />
      <path
        d="M88 124 L104 144 L120 124"
        fill="var(--sand-2)"
        stroke="var(--clay)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Lines in bubble */}
      <rect x="80" y="60" width="80" height="5" rx="2.5" fill="var(--clay)" opacity=".3" />
      <rect x="80" y="74" width="56" height="5" rx="2.5" fill="var(--clay)" opacity=".3" />
      <rect x="80" y="88" width="68" height="5" rx="2.5" fill="var(--clay)" opacity=".3" />
      {/* Heart */}
      <path
        d="M120 76 C120 68 108 62 104 70 C100 62 88 68 88 76 C88 88 104 96 104 96 C104 96 120 88 120 76Z"
        fill="var(--gold)"
        opacity=".5"
        transform="translate(28, -4) scale(0.9)"
      />
      {/* Sparkle */}
      <circle cx="72" cy="28" r="2" fill="var(--gold)" opacity=".3" />
      <circle cx="168" cy="28" r="2" fill="var(--gold)" opacity=".3" />
    </svg>
  );
}

/* ─── Features data ─── */
const guarantees = [
  {
    id: 1,
    title: "Kualitas Terjamin",
    desc: "Setiap produk melewati pengecekan jahitan dan bahan sebelum dikirim.",
    Illustration: ShieldSvg,
  },
  {
    id: 2,
    title: "Pengiriman Aman",
    desc: "Dikemas rapi dan terlindungi agar sampai dalam kondisi sempurna.",
    Illustration: BoxSvg,
  },
  {
    id: 3,
    title: "Layanan Ramah",
    desc: "Admin siap membantu dari pemilihan size hingga setelah pembelian.",
    Illustration: HeartSvg,
  },
];

/* ─── Card ─── */
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
      style={{ boxShadow: "0 4px 24px -8px rgba(43,38,32,.08)" }}
    >
      {/* Illustration area */}
      <div
        className="w-full h-[140px] sm:h-[160px] flex items-center justify-center p-4 border-b"
        style={{
          background: "var(--cream)",
          borderColor: "rgba(201,183,156,.15)",
        }}
      >
        <Illustration />
      </div>

      {/* Text */}
      <div className="p-5 sm:p-6 flex flex-col gap-2">
        <h3
          className="text-[13px] sm:text-[14.5px] font-semibold tracking-[0.08em] uppercase font-ui"
          style={{ color: "var(--espresso)" }}
        >
          {title}
        </h3>
        <p
          className="text-[12.5px] sm:text-[13px] leading-relaxed font-ui"
          style={{ color: "var(--coffee)" }}
        >
          {desc}
        </p>
      </div>

      {/* Bottom accent */}
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
    <section
      className="py-20 sm:py-28 lg:py-32 px-4 sm:px-8"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-[1200px] mx-auto">
        {/* ── Header ── */}
        <motion.div
          className="text-center max-w-xl mx-auto mb-12 sm:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          <motion.p
            variants={headerVariants}
            className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 font-ui"
            style={{ color: "var(--gold)" }}
          >
            Ketenangan Berbelanja
          </motion.p>
          <motion.h2
            variants={headerVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-5 leading-tight"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            Jaminan SAMAQU
          </motion.h2>
          <motion.p
            variants={headerVariants}
            className="text-sm sm:text-base leading-[1.75] font-ui"
            style={{ color: "var(--coffee)" }}
          >
            Kami menjaga kepercayaanmu di setiap pesanan — dari kualitas
            hingga pelayanan.
          </motion.p>
        </motion.div>

        {/* ── Feature cards ── */}
        <motion.div
          className="grid sm:grid-cols-3 gap-4 sm:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
        >
          {guarantees.map((g) => (
            <FeatureCard key={g.id} {...g} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
