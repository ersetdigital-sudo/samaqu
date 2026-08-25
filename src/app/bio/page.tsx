"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const slides = [
  { src: "/bio-images/7ac920f0-0cd1-4296-8604-1ada8c4cd69f.png", alt: "Koleksi Samaqu 1" },
  { src: "/bio-images/1db09a85-30ed-4d90-82d3-267b6618b580.png", alt: "Koleksi Samaqu 2" },
  { src: "/bio-images/f2ed96b8-98b6-4cb0-9859-e62c726b7e4b.png", alt: "Koleksi Samaqu 3" },
  { src: "/bio-images/d8d42a74-9658-4d41-a2a6-d6673221aa4a.png", alt: "Koleksi Samaqu 4" },
];

const SECTION_ICONS: Record<string, string> = {
  Belanja: "M6 8h12l1 12H5L6 8zM9 8V6a3 3 0 0 1 6 0v2",
  Informasi: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zM13 9h-2V7h2v2z",
  Tentang: "M4 21V7l8-4 8 4v14M10 21v-6h4v6",
  Ikuti: "M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16",
};

const ICON_SVG: Record<string, string> = {
  "shopping-bag": "M6 8h12l1 12H5L6 8zM9 8V6a3 3 0 0 1 6 0v2",
  whatsapp: "M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5zM8.7 9.2c.3 2.6 3.5 5.4 5.9 5.7l1.2-1.4 1.7 1-.8 1.5c-2.9.6-7.6-3.3-8.6-6.6l1.4-.9 1 1.6-1.8-.9z",
  tag: "M20 12l-8 8-8-8V4h8l8 8zM8.5 8.5h.01",
  ruler: "M15 4l5 5L8 21H3v-5L15 4z",
  star: "M12 4l2.4 5 5.6.7-4 3.8 1 5.5-5-2.7-5 2.7 1-5.5-4-3.8 5.6-.7L12 4z",
  clipboard: "M5 4h14a1 1 0 0 1 1 1v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM9 3h6v3H9zM9 11h6M9 15h4",
  shield: "M12 3l7 3v6c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6l7-3zM9 12l2 2 4-4",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zM13 9h-2V7h2v2z",
  book: "M3 5h6a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H3V5zM21 5h-6a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h6V5z",
  instagram: "M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 21a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM17 7h.01",
  globe: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM2 12h20M12 2c2.5 2.7 2.5 15.3 0 18M12 2c-2.5 2.7-2.5 15.3 0 18",
  home: "M4 21V7l8-4 8 4v14M10 21v-6h4v6",
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
};

interface BioLinkItem {
  id: string;
  section: string;
  label: string;
  subtitle: string;
  href: string;
  icon: string;
  sort_order: number;
  enabled: boolean;
  target: string;
}

export default function BioLinkPage() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [links, setLinks] = useState<BioLinkItem[]>([]);

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

  useEffect(() => {
    supabase
      .from("bio_links")
      .select("*")
      .eq("enabled", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setLinks(data);
      });
  }, []);

  const sections = links.reduce<Record<string, BioLinkItem[]>>((acc, link) => {
    if (!acc[link.section]) acc[link.section] = [];
    acc[link.section].push(link);
    return acc;
  }, {});

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
          {Object.entries(sections).map(([section, items]) => (
            <section key={section}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <svg className="icon text-[#c8a97e]" viewBox="0 0 24 24">
                  <path d={SECTION_ICONS[section] || SECTION_ICONS.Belanja} />
                </svg>
                <span className="sec-label">{section}</span>
              </div>
              {section === "Ikuti" ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {items.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target={link.target || undefined}
                      rel={link.target === "_blank" ? "noopener noreferrer" : undefined}
                      className="card flex items-center justify-center gap-1.5 py-3.5"
                    >
                      <svg className="icon" viewBox="0 0 24 24">
                        <path d={ICON_SVG[link.icon] || ICON_SVG.link} />
                      </svg>
                      <span className="text-[12px] font-medium">{link.label}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target={link.target || undefined}
                      rel={link.target === "_blank" ? "noopener noreferrer" : undefined}
                      className="card flex items-center gap-3 px-4 py-3.5"
                    >
                      <svg className="icon shrink-0" viewBox="0 0 24 24">
                        <path d={ICON_SVG[link.icon] || ICON_SVG.link} />
                      </svg>
                      <span className="flex-1">
                        <span className="block text-[14px] font-medium">{link.label}</span>
                        {link.subtitle && (
                          <span className="block text-[11px] text-black/45">{link.subtitle}</span>
                        )}
                      </span>
                      <svg className="icon opacity-40 shrink-0" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
                    </a>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="py-6 text-center" style={{ borderTop: "1px solid rgba(200,169,126,.22)" }}>
          <div className="tracking-[0.42em] text-sm" style={{ fontFamily: '"Cormorant Garamond", serif', color: "#e9dfd1", paddingLeft: "0.42em" }}>SAMAQU</div>
          <p className="text-[11px] mt-2" style={{ color: "#6f665c" }}>© 2024 Samaqu. All rights reserved.</p>
        </footer>
      </div>

      <style>{`
        .icon { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
        .card { background: linear-gradient(180deg, #ece6dd, #e3dcd1); color: #1a1613; border-radius: 14px; transition: transform .18s ease, box-shadow .18s ease; box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 6px 18px rgba(0,0,0,.35); text-decoration: none; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,.5); }
        .sec-label { letter-spacing: .28em; font-size: 11px; color: #c8a97e; text-transform: uppercase; }
      `}</style>
    </main>
  );
}
