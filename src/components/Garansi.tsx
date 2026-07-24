"use client";

import { motion, Variants } from "framer-motion";
import Image from "next/image";

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

/* ─── Feature cards data ─── */
const guarantees = [
  {
    id: 1,
    title: "Kualitas Terjamin",
    desc: "Setiap produk melewati pengecekan jahitan dan bahan sebelum dikirim.",
    icon: (
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--espresso)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path stroke="var(--gold)" d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 2,
    title: "Pengiriman Aman",
    desc: "Dikemas rapi dan terlindungi agar sampai dalam kondisi sempurna.",
    icon: (
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--espresso)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.5 7.3 12 12l-8.5-4.7" />
        <path d="M12 12v9.2" />
        <path d="M20.5 7.3 12 2.6 3.5 7.3v9.4L12 21.4l8.5-4.7V7.3Z" />
        <path
          d="m7.75 4.95 8.5 4.7v3.3"
          stroke="var(--gold)"
          strokeWidth="2"
        />
        <path
          d="M14.6 11.15v3.25l1.65.9"
          stroke="var(--gold)"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    id: 3,
    title: "Layanan Ramah",
    desc: "Admin siap membantu dari pemilihan size hingga setelah pembelian.",
    icon: (
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--espresso)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        <path stroke="var(--gold)" d="M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    ),
  },
];

const trustBadges = [
  {
    label: "100% Original",
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        style={{ color: "var(--gold)" }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2 4 5v6c0 5 3.4 7.8 8 9 4.6-1.2 8-4 8-9V5l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Packing Aman",
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        style={{ color: "var(--gold)" }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m7.5 4.3 9 5.2v9L7.5 13V4.3Z" />
        <path d="M16.5 9.5 21 7V16l-4.5 2.5" />
        <path d="M3 7v9l4.5 2.5M3 7l4.5-2.7L12 7 7.5 9.5 3 7Z" />
      </svg>
    ),
  },
  {
    label: "Support Personal",
    icon: (
      <svg
        className="h-[18px] w-[18px]"
        style={{ color: "var(--gold)" }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 20a6 6 0 0 0-12 0" />
        <circle cx="12" cy="9" r="4" />
      </svg>
    ),
  },
];

/* ─── Feature card ─── */
function GuaranteeCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="g-card group relative rounded-3xl border bg-white/85 p-8 overflow-hidden"
      style={{
        borderColor: "rgba(42,33,27,.10)",
      }}
    >
      {/* Icon */}
      <div
        className="g-icon flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--beige)" }}
      >
        {icon}
      </div>

      <h3
        className="mt-6 text-[1.5rem] sm:text-[1.7rem] font-semibold leading-tight"
        style={{
          fontFamily: "var(--font-cormorant), Georgia, serif",
          color: "var(--espresso)",
        }}
      >
        {title}
      </h3>

      <p
        className="mt-2 text-sm leading-relaxed font-ui"
        style={{ color: "var(--text-secondary)" }}
      >
        {desc}
      </p>
    </motion.div>
  );
}

/* ─── Section ─── */
export default function Garansi() {
  return (
    <section
      id="jaminan"
      className="relative w-full px-5 sm:px-8 pt-24 sm:pt-32 lg:pt-40 pb-20 sm:pb-28 flex justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -5%, #efe8de 0%, #f8f6f2 55%, #f8f6f2 100%)",
      }}
    >
      {/* Dot grid pattern */}
      <div
        className="dot-grid absolute inset-0 opacity-50 pointer-events-none"
        style={{
          maskImage:
            "radial-gradient(70% 60% at 50% 30%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(70% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div className="relative w-full max-w-6xl">
        {/* ── Hero panel ── */}
        <motion.div
          className="relative overflow-hidden rounded-2xl sm:rounded-[36px] border px-5 sm:px-12 md:px-16 py-10 sm:py-14 md:py-20"
          style={{
            borderColor: "rgba(42,33,27,.10)",
            background:
              "linear-gradient(to bottom right, #efe8de, #f8f6f2, #e9dfd1)",
            boxShadow: "0 40px 90px -55px rgba(42,33,27,.4)",
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          {/* Decorative dot grids */}
          <div
            className="dot-grid absolute top-9 left-9 h-16 w-16 opacity-70 hidden sm:block"
            aria-hidden="true"
          />
          <div
            className="dot-grid absolute bottom-12 right-12 h-20 w-20 opacity-50 hidden sm:block"
            aria-hidden="true"
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left copy */}
            <div>
              <motion.span
                variants={headerVariants}
                className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] font-ui"
                style={{
                  borderColor: "rgba(184,145,70,.5)",
                  color: "var(--gold-deep)",
                }}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                </svg>
                Ketenangan Berbelanja
              </motion.span>

              <motion.h2
                variants={headerVariants}
                className="mt-5 sm:mt-7 text-[2.5rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.92] font-semibold"
                style={{
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  color: "var(--espresso)",
                }}
              >
                Jaminan
                <span className="block italic" style={{ color: "var(--gold)" }}>
                  SAMAQU
                </span>
              </motion.h2>

              <motion.p
                variants={headerVariants}
                className="mt-6 max-w-md text-base sm:text-lg leading-relaxed font-ui"
                style={{ color: "var(--text-secondary)" }}
              >
                Kami menjaga kepercayaanmu di setiap pesanan — dari kualitas
                bahan hingga pelayanan yang tulus.
              </motion.p>

              {/* Inline mini features */}
              <motion.div
                variants={headerVariants}
                className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4"
              >
                <div
                  className="flex items-center gap-2 text-sm font-medium font-ui"
                  style={{ color: "var(--espresso)" }}
                >
                  <svg
                    className="h-[18px] w-[18px]"
                    style={{ color: "var(--gold)" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  100% Terjamin
                </div>
                <div
                  className="flex items-center gap-2 text-sm font-medium font-ui"
                  style={{ color: "var(--espresso)" }}
                >
                  <svg
                    className="h-[18px] w-[18px]"
                    style={{ color: "var(--gold)" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
                  </svg>
                  Pengiriman Cepat
                </div>
                <div
                  className="flex items-center gap-2 text-sm font-medium font-ui"
                  style={{ color: "var(--espresso)" }}
                >
                  <svg
                    className="h-[18px] w-[18px]"
                    style={{ color: "var(--gold)" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                    <path d="M8 10h.01M12 10h.01M16 10h.01" />
                  </svg>
                  Layanan Ramah
                </div>
              </motion.div>
            </div>

            {/* Right illustration */}
            <motion.div
              variants={headerVariants}
              className="flex justify-center lg:justify-end"
            >
              <div className="float-anim w-64 sm:w-80 md:w-[26rem] h-auto">
                <Image
                  src="/images/b4af0f77-9ce8-484c-9dc2-b3df44eb1d86.png"
                  alt="Ilustrasi perisai jaminan SAMAQU"
                  width={600}
                  height={600}
                  className="w-full h-auto"
                  style={{
                    filter: "drop-shadow(0 28px 40px rgba(42,33,27,.2))",
                  }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Feature cards ── */}
        <motion.div
          className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
        >
          {guarantees.map((g) => (
            <GuaranteeCard key={g.id} {...g} />
          ))}
        </motion.div>

        {/* ── Trust signals banner ── */}
        <motion.div
          className="mt-8 rounded-2xl border bg-white/60 px-6 py-5"
          style={{
            borderColor: "rgba(42,33,27,.10)",
            background: "rgba(239,232,222,.6)",
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={containerVariants}
        >
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {trustBadges.map((badge, i) => (
              <motion.li
                key={badge.label}
                variants={headerVariants}
                className="flex items-center gap-2"
              >
                {badge.icon}
                <span
                  className="text-sm font-medium font-ui"
                  style={{ color: "var(--espresso)" }}
                >
                  {badge.label}
                </span>
                {/* Separator (hidden on last) */}
                {i < trustBadges.length - 1 && (
                  <span
                    className="hidden sm:block h-4 w-px ml-10"
                    style={{ background: "rgba(42,33,27,.10)" }}
                    aria-hidden="true"
                  />
                )}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      <style jsx>{`
        .dot-grid {
          background-image: radial-gradient(
            rgba(42, 33, 27, 0.13) 1.3px,
            transparent 1.3px
          );
          background-size: 14px 14px;
        }
        .float-anim {
          animation: floaty 6s ease-in-out infinite;
        }
        @keyframes floaty {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-14px);
          }
        }
        .g-card {
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .g-card::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          height: 3px;
          width: 100%;
          background: var(--gold);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.45s ease;
        }
        .g-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 26px 55px -26px rgba(42, 33, 27, 0.32);
        }
        .g-card:hover::after {
          transform: scaleX(1);
        }
        .g-icon {
          transition: transform 0.4s ease;
        }
        .g-card:hover .g-icon {
          transform: scale(1.12);
        }
      `}</style>
    </section>
  );
}
