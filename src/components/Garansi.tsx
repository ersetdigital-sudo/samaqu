"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

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
        className="h-5 w-5 sm:h-7 sm:w-7"
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
        className="h-5 w-5 sm:h-7 sm:w-7"
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
        <path d="m7.75 4.95 8.5 4.7v3.3" stroke="var(--gold)" strokeWidth="2" />
        <path d="M14.6 11.15v3.25l1.65.9" stroke="var(--gold)" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 3,
    title: "Layanan Ramah",
    desc: "Admin siap membantu dari pemilihan size hingga setelah pembelian.",
    icon: (
      <svg
        className="h-5 w-5 sm:h-7 sm:w-7"
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
        className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
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
        className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
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
        className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
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

/* ─── Default data (title + description only, icon mapped by index) ─── */
const DEFAULT_GUARANTEES = [
  { title: "Garansi Kualitas Produk", description: "Kami peduli pada setiap produk yang kami buat. Karena itu, setiap produk melewati proses pengecekan kualitas sebelum dikirim." },
  { title: "Garansi Uang Kembali", description: "Kami ingin setiap transaksi terjadi atas dasar saling ridha. Jika produk yang kamu terima dirasa tidak sesuai, kami siap memberikan garansi uang kembali sesuai ketentuan." },
  { title: "Garansi Tukar Ukuran", description: "Ukuran kurang pas? Kami siap membantu proses penukaran agar kamu mendapatkan ukuran yang lebih sesuai." },
  { title: "Pelayanan yang Ramah", description: "Dari konsultasi hingga setelah pembelian, tim kami siap membantu dengan ramah, jujur, dan sepenuh hati." },
];

/* Icons mapped by index (not stored in DB) */
const GUARANTEE_ICONS = [
  // 1. Shield — Garansi Kualitas Produk
  <svg key="shield" className="h-5 w-5 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="var(--espresso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path stroke="var(--gold)" d="m9 12 2 2 4-4" /></svg>,
  // 2. RotateCcw — Garansi Uang Kembali
  <svg key="refund" className="h-5 w-5 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="var(--espresso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path stroke="var(--gold)" d="M12 7v5l4 2" /></svg>,
  // 3. Ruler — Garansi Tukar Ukuran
  <svg key="ruler" className="h-5 w-5 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="var(--espresso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z" /><path stroke="var(--gold)" d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" /></svg>,
  // 4. Chat — Pelayanan yang Ramah
  <svg key="chat" className="h-5 w-5 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="var(--espresso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /><path stroke="var(--gold)" d="M8 10h.01M12 10h.01M16 10h.01" /></svg>,
];

const DEFAULT_BADGES = ["100% Original", "Packing Aman", "Support Personal"];

/* ─── Section ─── */
export default function Garansi() {
  const [guarantees, setGuarantees] = useState(DEFAULT_GUARANTEES);
  const [badges, setBadges] = useState(DEFAULT_BADGES);

  useEffect(() => {
    async function fetch() {
      try {
        const [gRes, bRes] = await Promise.all([
          supabase.from("garansi_items").select("*").order("display_order"),
          supabase.from("trust_badges").select("*").order("display_order"),
        ]);
        if (gRes.data && gRes.data.length > 0) setGuarantees(gRes.data.map((g: { title: string; description: string }) => ({ title: g.title, description: g.description })));
        if (bRes.data && bRes.data.length > 0) setBadges(bRes.data.map((b: { label: string }) => b.label));
      } catch { /* use defaults */ }
    }
    fetch();
  }, []);

  return (
    <section
      id="jaminan"
      className="relative w-full px-5 sm:px-8 pt-10 sm:pt-24 lg:pt-32 pb-10 sm:pb-20 lg:pb-28 flex justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -5%, #efe8de 0%, #f8f6f2 55%, #f8f6f2 100%)",
      }}
    >
      {/* Dot grid pattern */}
      <div
        className="dot-grid absolute inset-0 opacity-50 pointer-events-none"
        style={{
          maskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div className="relative w-full max-w-6xl">
        {/* ── Hero panel ── */}
        <motion.div
          className="relative overflow-hidden rounded-2xl sm:rounded-[36px] border px-5 sm:px-12 md:px-16 py-8 sm:py-14 md:py-20"
          style={{
            borderColor: "rgba(42,33,27,.10)",
            background: "linear-gradient(to bottom right, #efe8de, #f8f6f2, #e9dfd1)",
            boxShadow: "0 40px 90px -55px rgba(42,33,27,.4)",
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          {/* Decorative dot grids */}
          <div className="dot-grid absolute top-9 left-9 h-16 w-16 opacity-70 hidden sm:block" aria-hidden="true" />
          <div className="dot-grid absolute bottom-12 right-12 h-20 w-20 opacity-50 hidden sm:block" aria-hidden="true" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            {/* Left copy */}
            <div>
              <motion.span
                variants={headerVariants}
                className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] font-ui"
                style={{ borderColor: "rgba(184,145,70,.5)", color: "var(--gold-deep)" }}
              >
                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                </svg>
                Ketenangan Berbelanja
              </motion.span>

              <motion.h2
                variants={headerVariants}
                className="mt-4 sm:mt-7 text-[2rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.92] font-semibold"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
              >
                Jaminan
                <span className="block italic" style={{ color: "var(--gold)" }}>SAMAQU</span>
              </motion.h2>

              <motion.p
                variants={headerVariants}
                className="mt-4 sm:mt-6 max-w-md text-sm sm:text-lg leading-relaxed font-ui"
                style={{ color: "var(--text-secondary)" }}
              >
                Kami tahu setiap rupiah yang kamu keluarkan adalah hasil kerja kerasmu. Karena itu kami ingin setiap pembelian terasa layak.
              </motion.p>

              {/* Inline mini features */}
              <motion.div variants={headerVariants} className="mt-6 sm:mt-9 flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-3 sm:gap-y-4">
                {["100% Terjamin", "Pengiriman Cepat", "Layanan Ramah"].map((label) => (
                  <div key={label} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium font-ui" style={{ color: "var(--espresso)" }}>
                    <svg className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" style={{ color: "var(--gold)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    {label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right illustration — smaller on mobile */}
            <motion.div variants={headerVariants} className="flex justify-center lg:justify-end">
              <div className="float-anim w-40 sm:w-80 md:w-[26rem] h-auto">
                <Image
                  src="/images/b4af0f77-9ce8-484c-9dc2-b3df44eb1d86.png"
                  alt="Ilustrasi perisai jaminan SAMAQU"
                  width={600}
                  height={600}
                  className="w-full h-auto"
                  style={{ filter: "drop-shadow(0 28px 40px rgba(42,33,27,.2))" }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Feature cards: horizontal scroll on mobile, grid on desktop ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
        >
          {/* Mobile: horizontal scroll */}
          <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 mt-6 pb-2 -mx-5 px-5 scrollbar-hide">
            {guarantees.map((g, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                className="g-card group relative shrink-0 w-[80%] snap-center rounded-xl border bg-white/85 p-5 overflow-hidden"
                style={{ borderColor: "rgba(42,33,27,.10)" }}
              >
                <div className="g-icon flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: "var(--beige)" }}>
                  {GUARANTEE_ICONS[i] || <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--espresso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path stroke="var(--gold)" d="m9 12 2 2 4-4" /></svg>}
                </div>
                <h3 className="text-[1.15rem] font-semibold leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
                  {g.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
                  {g.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {guarantees.map((g, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                className="g-card group relative rounded-3xl border bg-white/85 p-8 overflow-hidden"
                style={{ borderColor: "rgba(42,33,27,.10)" }}
              >
                <div className="g-icon flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--beige)" }}>
                  {GUARANTEE_ICONS[i] || <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--espresso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path stroke="var(--gold)" d="m9 12 2 2 4-4" /></svg>}
                </div>
                <h3 className="mt-6 text-[1.7rem] font-semibold leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
                  {g.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
                  {g.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Trust badges: compact on mobile ── */}
        <motion.div
          className="mt-6 sm:mt-8 rounded-xl sm:rounded-2xl border bg-white/60 px-4 sm:px-6 py-3 sm:py-5"
          style={{ borderColor: "rgba(42,33,27,.10)", background: "rgba(239,232,222,.6)" }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={containerVariants}
        >
          <ul className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-10 gap-y-2 sm:gap-y-3">
            {trustBadges.map((badge, i) => (
              <motion.li key={badge.label} variants={headerVariants} className="flex items-center gap-1.5 sm:gap-2">
                {badge.icon}
                <span className="text-xs sm:text-sm font-medium font-ui" style={{ color: "var(--espresso)" }}>
                  {badge.label}
                </span>
                {i < trustBadges.length - 1 && (
                  <span className="hidden sm:block h-4 w-px ml-10" style={{ background: "rgba(42,33,27,.10)" }} aria-hidden="true" />
                )}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
