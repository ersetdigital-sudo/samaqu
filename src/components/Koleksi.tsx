"use client";

import { useState, useEffect, useRef } from "react";
import { getWhatsAppLink } from "@/lib/store-settings";
import { supabase } from "@/lib/supabase";

interface CategoryItem {
  name: string;
  description: string;
  image_url: string;
}

const FALLBACK_CATEGORIES: CategoryItem[] = [
  { name: "Thobe", description: "Potongan panjang klasik, adem, dan berwibawa.", image_url: "/images/5616b4f5-b494-4940-808b-343520d0782e.png" },
  { name: "Kandora", description: "Elegan untuk sehari-hari maupun formal.", image_url: "/images/8b1f2100-01e0-41cc-a77c-96dde3e2b290.png" },
  { name: "Koko", description: "Modern dan nyaman untuk shalat.", image_url: "/images/44dc4804-7c64-4276-9e9d-374d0905f8ba.png" },
  { name: "Vest", description: "Presisi untuk tampilan berkelas.", image_url: "/images/819b1d90-d58e-4670-bfbd-2883bd685f63.png" },
  { name: "Kabak", description: "Premium berkualitas tinggi.", image_url: "/images/818e960c-6128-467b-b60f-eec772ee8125.png" },
  { name: "Cover Hanger", description: "Jaga busana tetap rapi.", image_url: "/images/fe8e7d65-922e-4797-8488-317779065a0b.png" },
];

function HeroCard({ cat, badgeText }: { cat: CategoryItem; badgeText?: string }) {
  return (
    <a
      href={getWhatsAppLink(`Halo Admin SAMAQU, saya tertarik dengan koleksi ${cat.name}.`)}
      target="_blank"
      rel="noopener"
      className="card group relative overflow-hidden rounded-[18px] sm:rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)]"
      style={{ background: "var(--espresso)" }}
    >
      <img src={cat.image_url} alt={cat.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
      {badgeText && (
        <span className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] uppercase text-white" style={{ background: "var(--gold)" }}>{badgeText}</span>
      )}
      <div className="absolute inset-0 card-shade" />
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 sm:gap-4 p-4 sm:p-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>{cat.name}</h2>
          <p className="mt-1 max-w-[12rem] sm:max-w-[15rem] text-[12px] sm:text-[13px] leading-snug text-[#d4c7ba]">{cat.description}</p>
        </div>
        <span className="shrink-0 grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-full border text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)" }}>
          <span className="text-sm sm:text-base">→</span>
        </span>
      </div>
    </a>
  );
}

function WideCard({ cat, objectPos }: { cat: CategoryItem; objectPos?: string }) {
  return (
    <a
      href={getWhatsAppLink(`Halo Admin SAMAQU, saya tertarik dengan koleksi ${cat.name}.`)}
      target="_blank"
      rel="noopener"
      className="card wide group relative overflow-hidden rounded-[18px] sm:rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)]"
      style={{ background: cat.name === "Kabak" ? "#0d0d0d" : "var(--espresso)" }}
    >
      <img src={cat.image_url} alt={cat.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" style={objectPos ? { objectPosition: objectPos } : undefined} />
      <div className="absolute inset-0 wide-shade" />
      <div className="absolute inset-0 z-10 flex items-end justify-between gap-3 sm:gap-4 p-4 sm:p-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>{cat.name}</h2>
          <p className="mt-1 max-w-[11rem] sm:max-w-[13rem] text-[12px] sm:text-[13px] leading-snug text-[#d4c7ba]">{cat.description}</p>
        </div>
        <span className="shrink-0 grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-full border backdrop-blur-sm text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)", background: "rgba(42,33,27,.3)" }}>
          <span className="text-sm sm:text-base">→</span>
        </span>
      </div>
    </a>
  );
}

export default function Koleksi() {
  const [categories, setCategories] = useState<CategoryItem[]>(FALLBACK_CATEGORIES);
  const [activeDot, setActiveDot] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("category_images").select("name, description, image_url").order("display_order").then(({ data, error }) => {
      if (!error && data && data.length > 0) setCategories(data);
    });
  }, []);

  const carouselItems = [categories[2], categories[3], categories[4], categories[5]].filter(Boolean);

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.scrollWidth / carouselItems.length;
    const idx = Math.round(scrollLeft / cardWidth);
    setActiveDot(Math.min(idx, carouselItems.length - 1));
  }

  return (
    <section id="produk" className="koleksi-section" style={{ background: "var(--sand-2)" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">

        {/* Header */}
        <p className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase mb-3 sm:mb-5" style={{ color: "#5a5a5a" }}>Katalog Samaqu</p>

        <h1
          className="text-[1.65rem] sm:text-4xl md:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] tracking-tight max-w-2xl"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
        >
          Pilih yang Membuatmu<br className="hidden sm:block" />
          <span className="italic font-normal pr-1 sm:pr-2" style={{ color: "var(--gold)" }}>Lebih</span>Percaya Diri
        </h1>

        <p className="mt-3 sm:mt-5 max-w-xl text-[13px] sm:text-[15px] leading-relaxed" style={{ color: "#5a5a5a" }}>
          Dibuat dengan perhatian pada kualitas, kepedulian, dan rasa bangga untuk menemani berbagai aktivitasmu — dari keseharian hingga momen istimewa.
        </p>

        {/* ═══ MOBILE LAYOUT (< md) ═══ */}
        <div className="md:hidden mt-6">
          {/* Hero cards: Thobe + Kandora */}
          <div className="flex flex-col gap-3">
            {categories[0] && <HeroCard cat={categories[0]} badgeText="Best Seller" />}
            {categories[1] && <HeroCard cat={categories[1]} />}
          </div>

          {/* Carousel: Koko, Vest, Kabak, Cover Hanger */}
          <div className="mt-5">
            <p className="text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: "#8a7a70" }}>Koleksi Lainnya</p>
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 scrollbar-hide"
              style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {carouselItems.map((cat, i) => (
                <a
                  key={cat.name}
                  href={getWhatsAppLink(`Halo Admin SAMAQU, saya tertarik dengan koleksi ${cat.name}.`)}
                  target="_blank"
                  rel="noopener"
                  className="carousel-card group relative flex-shrink-0 w-[82%] overflow-hidden rounded-[18px] shadow-[0_14px_32px_-14px_rgba(42,33,27,.5)] snap-start"
                  style={{ background: cat.name === "Kabak" ? "#0d0d0d" : "var(--espresso)", aspectRatio: "3/2" }}
                >
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out"
                    style={cat.name === "Koko" ? { objectPosition: "62% 35%" } : cat.name === "Vest" ? { objectPosition: "55% 18%" } : cat.name === "Kabak" ? { objectPosition: "50% 55%" } : cat.name === "Cover Hanger" ? { objectPosition: "62% 45%" } : undefined}
                  />
                  <div className="absolute inset-0 wide-shade" />
                  <div className="absolute inset-0 z-10 flex items-end justify-between gap-3 p-4">
                    <div>
                      <h2 className="text-xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>{cat.name}</h2>
                      <p className="mt-1 max-w-[10rem] text-[12px] leading-snug text-[#d4c7ba]">{cat.description}</p>
                    </div>
                    <span className="shrink-0 grid h-9 w-9 place-items-center rounded-full border backdrop-blur-sm text-[#f1e9dd]" style={{ borderColor: "rgba(212,199,186,.5)", background: "rgba(42,33,27,.3)" }}>
                      <span className="text-sm">→</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-3">
              {carouselItems.map((_, i) => (
                <span
                  key={i}
                  className="block rounded-full transition-all duration-300"
                  style={{
                    width: activeDot === i ? 20 : 6,
                    height: 6,
                    background: activeDot === i ? "var(--espresso)" : "rgba(42,33,27,.25)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ═══ DESKTOP LAYOUT (md+) ═══ */}
        <div className="hidden md:block mt-8 lg:mt-10">
          <div className="grid grid-cols-2 gap-4 lg:gap-5">
            {/* Thobe — tall */}
            <article className="card group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)] row-span-2" style={{ background: "var(--espresso)", minHeight: 560 }}>
              <img src={categories[0]?.image_url} alt="Thobe" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
              <span className="absolute top-4 left-4 z-20 rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-white" style={{ background: "var(--gold)" }}>Best Seller</span>
              <div className="absolute inset-0 card-shade" />
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-6">
                <div>
                  <h2 className="text-3xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Thobe</h2>
                  <p className="mt-1 max-w-[15rem] text-[13px] leading-snug text-[#d4c7ba]">{categories[0]?.description}</p>
                </div>
                <a href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Thobe.")} target="_blank" rel="noopener" aria-label="Lihat Thobe" className="shrink-0 grid h-11 w-11 place-items-center rounded-full border text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)" }}>→</a>
              </div>
            </article>

            {/* Koko — wide */}
            <article className="card wide group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)]" style={{ background: "var(--espresso)", minHeight: 270 }}>
              <img src={categories[2]?.image_url} alt="Koko" className="absolute inset-0 h-full w-full object-cover object-[62%_35%] transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
              <div className="absolute inset-0 wide-shade" />
              <div className="absolute inset-0 z-10 flex items-end justify-between gap-4 p-6">
                <div>
                  <h2 className="text-2xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Koko</h2>
                  <p className="mt-1 max-w-[13rem] text-[13px] leading-snug text-[#d4c7ba]">{categories[2]?.description}</p>
                </div>
                <a href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Koko.")} target="_blank" rel="noopener" aria-label="Lihat Koko" className="shrink-0 grid h-11 w-11 place-items-center rounded-full border backdrop-blur-sm text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)", background: "rgba(42,33,27,.3)" }}>→</a>
              </div>
            </article>

            {/* Vest — wide */}
            <article className="card wide group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)]" style={{ background: "var(--espresso)", minHeight: 270 }}>
              <img src={categories[3]?.image_url} alt="Vest" className="absolute inset-0 h-full w-full object-cover object-[55%_18%] transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
              <div className="absolute inset-0 wide-shade" />
              <div className="absolute inset-0 z-10 flex items-end justify-between gap-4 p-6">
                <div>
                  <h2 className="text-2xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Vest</h2>
                  <p className="mt-1 max-w-[13rem] text-[13px] leading-snug text-[#d4c7ba]">{categories[3]?.description}</p>
                </div>
                <a href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Vest.")} target="_blank" rel="noopener" aria-label="Lihat Vest" className="shrink-0 grid h-11 w-11 place-items-center rounded-full border backdrop-blur-sm text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)", background: "rgba(42,33,27,.3)" }}>→</a>
              </div>
            </article>

            {/* Kandora — tall */}
            <article className="card group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)] row-span-2" style={{ background: "var(--espresso)", minHeight: 560 }}>
              <img src={categories[1]?.image_url} alt="Kandora" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
              <div className="absolute inset-0 card-shade" />
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-6">
                <div>
                  <h2 className="text-3xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Kandora</h2>
                  <p className="mt-1 max-w-[14rem] text-[13px] leading-snug text-[#d4c7ba]">{categories[1]?.description}</p>
                </div>
                <a href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Kandora.")} target="_blank" rel="noopener" aria-label="Lihat Kandora" className="shrink-0 grid h-11 w-11 place-items-center rounded-full border backdrop-blur-sm text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)", background: "rgba(42,33,27,.3)" }}>→</a>
              </div>
            </article>

            {/* Kabak — wide */}
            <article className="card wide group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)]" style={{ background: "#0d0d0d", minHeight: 270 }}>
              <img src={categories[4]?.image_url} alt="Kabak" className="absolute inset-0 h-full w-full object-cover object-[50%_55%] transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
              <div className="absolute inset-0 wide-shade" />
              <div className="absolute inset-0 z-10 flex items-end justify-between gap-4 p-6">
                <div>
                  <h2 className="text-2xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Kabak</h2>
                  <p className="mt-1 max-w-[13rem] text-[13px] leading-snug text-[#d4c7ba]">{categories[4]?.description}</p>
                </div>
                <a href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Kabak.")} target="_blank" rel="noopener" aria-label="Lihat Kabak" className="shrink-0 grid h-11 w-11 place-items-center rounded-full border backdrop-blur-sm text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)", background: "rgba(42,33,27,.3)" }}>→</a>
              </div>
            </article>

            {/* Cover Hanger — wide */}
            <article className="card wide group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)]" style={{ background: "var(--espresso)", minHeight: 270 }}>
              <img src={categories[5]?.image_url} alt="Cover Hanger" className="absolute inset-0 h-full w-full object-cover object-[62%_45%] transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
              <div className="absolute inset-0 wide-shade" />
              <div className="absolute inset-0 z-10 flex items-end justify-between gap-4 p-6">
                <div>
                  <h2 className="text-2xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Cover Hanger</h2>
                  <p className="mt-1 max-w-[13rem] text-[13px] leading-snug text-[#d4c7ba]">{categories[5]?.description}</p>
                </div>
                <a href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Cover Hanger.")} target="_blank" rel="noopener" aria-label="Lihat Cover Hanger" className="shrink-0 grid h-11 w-11 place-items-center rounded-full border backdrop-blur-sm text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)", background: "rgba(42,33,27,.3)" }}>→</a>
              </div>
            </article>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 sm:mt-10 lg:mt-12 flex justify-center">
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 sm:gap-3 rounded-full px-6 py-3 sm:px-8 sm:py-4 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.16em] transition hover:bg-[var(--gold)]"
            style={{ background: "var(--espresso)", color: "#f1e9dd" }}
          >
            Lihat Katalog Selengkapnya <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <style jsx global>{`
        .card-shade { background: linear-gradient(to top, rgba(20,15,11,.92) 0%, rgba(20,15,11,.55) 38%, rgba(20,15,11,.05) 70%); }
        .wide-shade { background: linear-gradient(to top, rgba(20,15,11,.92) 0%, rgba(20,15,11,.45) 45%, rgba(20,15,11,0) 80%), linear-gradient(to right, rgba(20,15,11,.75) 0%, rgba(20,15,11,.15) 55%, rgba(20,15,11,0) 100%); }
        .card { transition: transform .45s cubic-bezier(.2,.7,.2,1), box-shadow .45s ease; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 26px 55px -22px rgba(42,33,27,.7); }
        .card:hover img { transform: scale(1.06); }
        .card img { transition: transform .8s cubic-bezier(.2,.7,.2,1); }
        .card::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgba(241,233,221,.10); pointer-events: none; z-index: 20; }
        .carousel-card::after { content: ""; position: absolute; inset: 0; border-radius: 18px; box-shadow: inset 0 0 0 1px rgba(241,233,221,.10); pointer-events: none; z-index: 20; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
        @media (max-width: 767px) {
          .card:hover { transform: none; box-shadow: 0 18px 40px -18px rgba(42,33,27,.55); }
          .card:hover img { transform: none; }
        }
      `}</style>
    </section>
  );
}
