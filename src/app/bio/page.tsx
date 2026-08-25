"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const slides = [
  { src: "/bio-images/7ac920f0-0cd1-4296-8604-1ada8c4cd69f.png", alt: "Koleksi Samaqu 1" },
  { src: "/bio-images/1db09a85-30ed-4d90-82d3-267b6618b580.png", alt: "Koleksi Samaqu 2" },
  { src: "/bio-images/f2ed96b8-98b6-4cb0-9859-e62c726b7e4b.png", alt: "Koleksi Samaqu 3" },
  { src: "/bio-images/d8d42a74-9658-4d41-a2a6-d6673221aa4a.png", alt: "Koleksi Samaqu 4" },
];

export default function BioLinkPage() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 3800);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <main className="min-h-screen" style={{ background: "#0d0b0a", color: "#f4efe8", fontFamily: '"Manrope", system-ui, sans-serif' }}>
      <div className="mx-auto" style={{ maxWidth: 520 }}>

        {/* Carousel */}
        <section className="relative">
          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: "1024/682" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="flex transition-transform duration-500 ease-out h-full" style={{ transform: `translateX(-${current * 100}%)` }}>
              {slides.map((s, i) => (
                <div key={i} className="min-w-full h-full relative">
                  <Image src={s.src} alt={s.alt} fill className="object-cover" />
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: 6,
                    height: 6,
                    background: i === current ? "#c8a97e" : "#fff",
                    opacity: i === current ? 1 : 0.35,
                  }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full"
              style={{ width: 30, height: 30, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)" }}
              aria-label="Sebelumnya"
            >
              <svg style={{ width: 18, height: 18, stroke: "#fff", fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }} viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full"
              style={{ width: 30, height: 30, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)" }}
              aria-label="Berikutnya"
            >
              <svg style={{ width: 18, height: 18, stroke: "#fff", fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }} viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>

            {/* Fade bottom */}
            <div className="absolute inset-x-0 bottom-0 h-[110px] pointer-events-none" style={{ background: "linear-gradient(to top, #0d0b0a, transparent)" }} />
          </div>
        </section>

        {/* Header */}
        <header className="px-6 pt-2 pb-7 text-center" style={{ background: "radial-gradient(120% 60% at 50% 0%,rgba(200,169,126,.16),transparent 70%)" }}>
          <h1 className="text-4xl sm:text-5xl font-light tracking-[0.32em]" style={{ fontFamily: '"Cormorant Garamond", serif', paddingLeft: "0.32em" }}>SAMAQU</h1>
          <p className="text-lg sm:text-xl mt-2" style={{ fontFamily: '"Cormorant Garamond", serif', color: "#e9dfd1" }}>Untuk Orang Biasa yang Sedang Bertumbuh.</p>
          <p className="text-[13px] leading-relaxed mt-3 max-w-[380px] mx-auto" style={{ color: "#a89c8e" }}>
            Samaqu hadir untuk menemani perjalananmu, agar tampil lebih percaya diri dan terus bertumbuh untuk memberi manfaat.
          </p>
        </header>

        <div className="px-5 pb-10 space-y-7">

          {/* Belanja */}
          <BioSection icon={<><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12h11L21 7H6" /></>} label="Belanja">
            <BioLink href="/id/katalog">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><path d="M6 8h12l1 12H5L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
              <span className="flex-1">
                <span className="block text-[14px] font-medium">Lihat Koleksi Samaqu</span>
                <span className="block text-[11px] text-black/45">Official Website</span>
              </span>
            </BioLink>
            <BioLink href="https://wa.me/6281234567890" target="_blank" rel="noopener">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5z" /><path d="M8.7 9.2c.3 2.6 3.5 5.4 5.9 5.7l1.2-1.4 1.7 1-.8 1.5c-2.9.6-7.6-3.3-8.6-6.6l1.4-.9 1 1.6-1.8-.9z" /></svg>
              <span className="flex-1 text-[14px] font-medium">Pesan via WhatsApp</span>
            </BioLink>
          </BioSection>

          {/* Informasi */}
          <BioSection icon={<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>} label="Informasi">
            <BioLink href="#">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><path d="M20 12l-8 8-8-8V4h8l8 8z" /><path d="M8.5 8.5h.01" /></svg>
              <span className="flex-1 text-[14px]">Create Your Price</span>
            </BioLink>
            <BioLink href="#">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><path d="M15 4l5 5L8 21H3v-5L15 4z" /></svg>
              <span className="flex-1 text-[14px]">Panduan Ukuran</span>
            </BioLink>
            <BioLink href="#">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><path d="M12 4l2.4 5 5.6.7-4 3.8 1 5.5-5-2.7-5 2.7 1-5.5-4-3.8 5.6-.7L12 4z" /></svg>
              <span className="flex-1 text-[14px]">Review Pelanggan</span>
            </BioLink>
            <BioLink href="#">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v3H9zM9 11h6M9 15h4" /></svg>
              <span className="flex-1 text-[14px]">Cara Pemesanan</span>
            </BioLink>
            <BioLink href="#">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
              <span className="flex-1 text-[14px]">Garansi &amp; Retur</span>
            </BioLink>
          </BioSection>

          {/* Tentang */}
          <BioSection icon={<><path d="M4 21V7l8-4 8 4v14" /><path d="M10 21v-6h4v6" /></>} label="Tentang Samaqu">
            <BioLink href="#">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h3M8 11h3M8 15h3M15 7h1M15 11h1M15 15h1" /></svg>
              <span className="flex-1 text-[14px]">Tentang Samaqu</span>
            </BioLink>
            <BioLink href="#">
              <svg className="icon shrink-0" viewBox="0 0 24 24"><path d="M3 5h6a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H3V5zM21 5h-6a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h6V5z" /></svg>
              <span className="flex-1 text-[14px]">Sama Quran</span>
            </BioLink>
          </BioSection>

          {/* Ikuti */}
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <svg className="icon text-[#c8a97e]" viewBox="0 0 24 24"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1.4" /></svg>
              <span className="sec-label">Ikuti Samaqu</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <a href="https://instagram.com/" target="_blank" rel="noopener" className="card flex items-center justify-center gap-1.5 py-3.5">
                <svg className="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17 7h.01" /></svg>
                <span className="text-[12px] font-medium">Instagram</span>
              </a>
              <a href="#" className="card flex items-center justify-center gap-1.5 py-3.5">
                <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
                <span className="text-[12px] font-medium">Website</span>
              </a>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener" className="card flex items-center justify-center gap-1.5 py-3.5">
                <svg className="icon" viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5z" /></svg>
                <span className="text-[12px] font-medium">WhatsApp</span>
              </a>
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer className="py-6 text-center" style={{ borderTop: "1px solid rgba(200,169,126,.22)" }}>
          <div className="tracking-[0.42em] text-sm" style={{ fontFamily: '"Cormorant Garamond", serif', color: "#e9dfd1", paddingLeft: "0.42em" }}>SAMAQU</div>
          <p className="text-[11px] mt-2" style={{ color: "#6f665c" }}>© 2024 Samaqu. All rights reserved.</p>
        </footer>
      </div>

      <style>{`
        .icon { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
        .card { background: linear-gradient(180deg, #ece6dd, #e3dcd1); color: #1a1613; border-radius: 14px; transition: transform .18s ease, box-shadow .18s ease; box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 6px 18px rgba(0,0,0,.35); }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,.5); }
        .sec-label { letter-spacing: .28em; font-size: 11px; color: #c8a97e; text-transform: uppercase; }
      `}</style>
    </main>
  );
}

/* ── Helper Components ── */

function BioSection({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        <svg className="icon text-[#c8a97e]" viewBox="0 0 24 24">{icon}</svg>
        <span className="sec-label">{label}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function BioLink({
  href,
  children,
  target,
  rel,
}: {
  href: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <a href={href} target={target} rel={rel} className="card flex items-center gap-3 px-4 py-3.5">
      {children}
      <svg className="icon opacity-40 shrink-0" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
    </a>
  );
}
