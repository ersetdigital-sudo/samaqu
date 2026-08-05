"use client";

import { useState, useEffect } from "react";
import { getWhatsAppLink } from "@/lib/store-settings";
import { supabase } from "@/lib/supabase";

/* ── Check Icon ── */
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12.5 10 17l9-9" />
    </svg>
  );
}

/* ── Warning Icon ── */
function WarningIcon() {
  return (
    <span className="shrink-0 w-7 h-7 rounded-full border border-gold text-gold grid place-items-center text-sm font-medium">
      !
    </span>
  );
}

/* ── Guarantee Card ── */
function GuaranteeCard({
  title,
  desc,
  note,
  isWarning,
}: {
  title: string;
  desc: string;
  note?: string;
  isWarning?: boolean;
}) {
  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-start gap-3">
        {isWarning ? (
          <WarningIcon />
        ) : (
          <span className="shrink-0 w-7 h-7 rounded-full bg-green text-white grid place-items-center">
            <CheckIcon />
          </span>
        )}
        <h3 className="font-medium text-lg text-espresso">{title}</h3>
      </div>
      <p className="mt-3 text-[14.5px] text-stone leading-relaxed">{desc}</p>
      {note && <p className="mt-3 text-[13px] text-gold">{note}</p>}
    </div>
  );
}

/* ── Return Policy Item ── */
function ReturnPolicyItem({ icon, desc }: { icon: React.ReactNode; desc: string }) {
  return (
    <div className="text-center bg-white/60 rounded-2xl p-5 border border-gold/20">
      <span className="mx-auto w-11 h-11 rounded-full bg-sand/70 text-gold grid place-items-center">
        {icon}
      </span>
      <p className="mt-3 text-[13.5px] text-stone">{desc}</p>
    </div>
  );
}

/* ── Step Item ── */
function StepItem({ num, desc }: { num: number; desc: string }) {
  return (
    <li className="flex gap-4 card rounded-2xl p-5">
      <span className="font-display text-2xl text-gold w-8 shrink-0">{num}</span>
      <p className="text-[15px] text-stone">{desc}</p>
    </li>
  );
}

/* ── Non-Returnable Item ── */
function NonReturnableItem({ icon, desc }: { icon: React.ReactNode; desc: string }) {
  return (
    <div className="rounded-2xl p-5 text-center" style={{ border: "1px solid rgba(255,255,255,.12)" }}>
      <span
        className="mx-auto mb-3 w-10 h-10 rounded-full grid place-items-center"
        style={{ border: "1px solid rgba(216,185,140,.4)", color: "#D8B98C" }}
      >
        {icon}
      </span>
      <p className="text-[13.5px]" style={{ color: "rgba(246,239,231,.75)" }}>{desc}</p>
    </div>
  );
}

/* ── SVG Icons for Non-Returnable ── */
function ShirtIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0Z" />
    </svg>
  );
}

function ColorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="9.5" r="1.2" />
      <circle cx="14.5" cy="9.5" r="1.2" />
      <circle cx="16" cy="14" r="1.2" />
      <path d="M12 21a3 3 0 0 1 0-6 2 2 0 0 0 0-4" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="9" width="20" height="6" rx="1" />
      <path d="M6 9v3M10 9v4M14 9v3M18 9v4" />
    </svg>
  );
}

function UsedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16l-1 4h-2l-1 9H8L7 10H5L4 6Z" />
      <path d="M9 14c1.5 1.5 4.5 1.5 6 0" />
    </svg>
  );
}

function DamageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/* ── Policy Icons ── */
function PackageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h8l8.6 8.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3h16v18l-2.7-1.6L14.7 21 12 19.4 9.3 21l-2.6-1.6L4 21V3Z" />
      <path d="M8 8h8M8 12h8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9 2h6" />
    </svg>
  );
}

/* ── Default content ── */
const DEFAULTS = {
  hero_title: "Garansi & Kebijakan Retur",
  hero_kicker: "BELANJA AMAN, HAK ANDA TERLINDUNGI",
  hero_description: "Kami memastikan setiap pembelian memberikan ketenangan. Kenali garansi dan kebijakan retur kami untuk pengalaman belanja yang lebih baik.",
  hero_bullet1: "Garansi produk cacat produksi",
  hero_bullet2: "Retur dalam 7 hari kerja",
  hero_bullet3: "Konsultasi sebelum retur",
  hero_closing: "Kami percaya transparansi adalah awal dari kepercayaan. Jika ada masalah, hubungi kami — kami siap membantu.",
  hero_cta_text: "Ajukan Retur via WhatsApp",
  hero_image_url: "/garansi/hero-web.png",
  garansi_title: "Yang Kami Jamin",
  garansi_desc: "Setiap produk SAMAQU memiliki jaminan untuk memastikan Anda mendapatkan yang terbaik.",
  garansi1_title: "Produk Sampai dengan Aman",
  garansi1_desc: "Kami memastikan setiap pesanan dikemas rapi dan terlindungi. Jika produk rusak atau cacat saat pengiriman, kami akan menggantinya dengan yang baru.",
  garansi2_title: "Garansi Penggantian Produk",
  garansi2_desc: "Jika Anda menerima produk dengan cacat produksi (jahitan lepas, bahan robek, atau ketidaksesuaian warna), hubungi kami dalam waktu 7 hari kerja.",
  garansi2_note: "Sertakan foto produk dan nomor pesanan saat menghubungi.",
  garansi3_title: "Konsultasi Ukuran Gratis",
  garansi3_desc: "Sebelum membeli, Anda bisa berkonsultasi dengan admin kami untuk memastikan ukuran yang tepat. Kami bantu menemukan yang paling nyaman.",
  garansi3_note: "",
  retur_title: "Kebijakan Retur",
  retur_desc: "Kami menerima retur dalam kondisi tertentu untuk memastikan kepuasan Anda.",
  retur1: "Kemasan asli masih utuh dan belum dibuka",
  retur2: "Label dan tag produk masih terpasang",
  retur3: "Dalam waktu 7 hari kerja sejak barang diterima",
  retur4: "Bukti pembelian atau screenshot order",
  cara_title: "Cara Mengajukan Retur",
  cara1: "Hubungi admin via WhatsApp dan sertakan nomor pesanan serta alasan retur.",
  cara2: "Kirim foto produk yang ingin diretur beserta kondisi kemasan.",
  cara3: "Tunggu konfirmasi dari admin mengenai persetujuan retur.",
  cara4: "Kirim produk ke alamat yang telah ditentukan dan konfirmasi resi pengiriman.",
  no_retur_title: "Yang Tidak Dapat Diretur",
  no_retur_desc: "Beberapa kondisi berikut tidak memenuhi syarat retur:",
  no_retur1: "Produk sudah dipakai atau dicuci",
  no_retur2: "Perubahan warna akibat pemakaian",
  no_retur3: "Ukuran sudah disesuaikan permintaan",
  no_retur4: "Kerusakan akibat pemakaian tidak tepat",
  no_retur5: "Kerusakan akibat pencucian tidak sesuai",
  cta_title: "Butuh Bantuan?",
  cta_desc1: "Jika Anda memiliki pertanyaan tentang garansi atau ingin mengajukan retur, jangan ragu untuk menghubungi admin kami.",
  cta_desc2: "Tim kami siap membantu Anda dengan sepenuh hati.",
  cta_button_text: "Hubungi Admin",
  cta_image_url: "/garansi/cta-web.png",
};

export default function GaransiRetur() {
  const [c, setC] = useState(DEFAULTS);

  useEffect(() => {
    supabase
      .from("garansi_retur_page")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setC((prev) => ({ ...prev, ...data }));
      });
  }, []);

  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-24 pb-10 md:pt-32 md:py-24 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] font-semibold text-espresso">
              {c.hero_title}
            </h1>
            <p className="tracking-[.28em] uppercase text-[.68rem] mt-4 text-gold">{c.hero_kicker}</p>
            <p className="mt-5 text-[15px] md:text-base text-stone leading-relaxed max-w-md">
              {c.hero_description}
            </p>
            <ul className="mt-6 space-y-3 max-w-md">
              <li className="flex gap-3 items-start">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span className="text-[15px] text-stone">{c.hero_bullet1}</span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span className="text-[15px] text-stone">{c.hero_bullet2}</span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span className="text-[15px] text-stone">{c.hero_bullet3}</span>
              </li>
            </ul>
            <p className="mt-6 text-[15px] text-stone leading-relaxed max-w-md">
              {c.hero_closing}
            </p>
            <a
              href="#retur"
              className="inline-flex mt-8 items-center gap-2 bg-espresso text-cream px-7 py-3 rounded-full text-sm tracking-wide hover:bg-coffee transition"
            >
              {c.hero_cta_text}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-sand/50 -z-10" />
            <img
              src={c.hero_image_url}
              alt="Produk SAMAQU"
              className="w-full rounded-[1.5rem] object-cover aspect-[4/3] md:aspect-[5/4] shadow-[0_20px_60px_-20px_rgba(28,26,23,.35)]"
            />
          </div>
        </div>
      </section>

      {/* ── GARANSI ── */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div>
          <h2 className="font-display text-2xl md:text-4xl text-gold">{c.garansi_title}</h2>
          <div className="rule mt-3" />
          <p className="mt-4 text-[15px] text-stone max-w-2xl">{c.garansi_desc}</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <GuaranteeCard
            title={c.garansi1_title}
            desc={c.garansi1_desc}
          />
          <GuaranteeCard
            title={c.garansi2_title}
            desc={c.garansi2_desc}
            note={c.garansi2_note}
          />
          <GuaranteeCard
            title={c.garansi3_title}
            desc={c.garansi3_desc}
            note={c.garansi3_note}
            isWarning
          />
        </div>
      </section>

      {/* ── KEBIJAKAN RETUR ── */}
      <section id="retur" className="py-12 md:py-16" style={{ background: "rgba(233,220,203,.45)" }}>
        <div className="mx-auto max-w-6xl px-5">
          <div>
            <h2 className="font-display text-2xl md:text-4xl text-gold">{c.retur_title}</h2>
            <div className="rule mt-3" />
            <p className="mt-4 text-[15px] text-stone max-w-2xl">{c.retur_desc}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <ReturnPolicyItem icon={<PackageIcon />} desc={c.retur1} />
            <ReturnPolicyItem icon={<TagIcon />} desc={c.retur2} />
            <ReturnPolicyItem icon={<BoxIcon />} desc={c.retur3} />
            <ReturnPolicyItem icon={<ClockIcon />} desc={c.retur4} />
          </div>
        </div>
      </section>

      {/* ── CARA MENGAJUKAN ── */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div>
          <h2 className="font-display text-2xl md:text-4xl text-gold">{c.cara_title}</h2>
          <div className="rule mt-3" />
        </div>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 list-none p-0">
          <StepItem num={1} desc={c.cara1} />
          <StepItem num={2} desc={c.cara2} />
          <StepItem num={3} desc={c.cara3} />
          <StepItem num={4} desc={c.cara4} />
        </ol>
      </section>

      {/* ── TIDAK DAPAT DIRETUR ── */}
      <section className="py-12 md:py-16" style={{ background: "#1C1A17" }}>
        <div className="mx-auto max-w-6xl px-5">
          <div>
            <h2 className="font-display text-2xl md:text-4xl" style={{ color: "#D8B98C" }}>{c.no_retur_title}</h2>
            <p className="mt-4 text-[15px] max-w-2xl" style={{ color: "rgba(246,239,231,.65)" }}>{c.no_retur_desc}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            <NonReturnableItem icon={<ShirtIcon />} desc={c.no_retur1} />
            <NonReturnableItem icon={<ColorIcon />} desc={c.no_retur2} />
            <NonReturnableItem icon={<RulerIcon />} desc={c.no_retur3} />
            <NonReturnableItem icon={<UsedIcon />} desc={c.no_retur4} />
            <NonReturnableItem icon={<DamageIcon />} desc={c.no_retur5} />
          </div>
        </div>
      </section>

      {/* ── BANTUAN CTA ── */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="order-2 md:order-1">
          <h2 className="font-display text-2xl md:text-4xl text-gold">{c.cta_title}</h2>
          <div className="rule mt-3" />
          <p className="mt-5 text-[15px] text-stone leading-relaxed max-w-md">
            {c.cta_desc1}
          </p>
          <p className="mt-4 text-[15px] text-stone leading-relaxed max-w-md">
            {c.cta_desc2}
          </p>
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya ingin bertanya soal garansi atau retur.")}
            target="_blank"
            rel="noopener"
            className="inline-flex mt-7 items-center gap-2 bg-espresso text-cream px-8 py-3.5 rounded-full text-sm tracking-[.15em] uppercase hover:bg-coffee transition"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 3.9A10 10 0 0 0 3.5 15.6L2 22l6.6-1.7A10 10 0 1 0 20 3.9Zm-8 16.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.9 1 1-3.8-.2-.3A8.2 8.2 0 1 1 12 20.1Zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5 0a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2a.6.6 0 0 0 0-.6c0-.2-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 6.4 10c0 1.3.9 2.5 1 2.7s1.8 3 4.5 4.1a5.1 5.1 0 0 0 3.1.5 2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
            </svg>
            {c.cta_button_text}
          </a>
        </div>
        <div className="order-1 md:order-2 relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-sand/50 -z-10" />
            <img
              src={c.cta_image_url}
              alt="Customer SAMAQU"
              className="w-full rounded-[1.5rem] object-cover aspect-[4/5] max-h-[520px] shadow-[0_20px_60px_-20px_rgba(28,26,23,.35)]"
            />
        </div>
      </section>
    </main>
  );
}
