"use client";

import { useState, useEffect } from "react";
import { getWhatsAppLink } from "@/lib/store-settings";
import { supabase } from "@/lib/supabase";

interface CategoryItem {
  name: string;
  description: string;
  image_url: string;
}

const FALLBACK_CATEGORIES: CategoryItem[] = [
  { name: "Thobe", description: "Potongan panjang klasik, adem, dan berwibawa.", image_url: "/images/57f4aded-cd60-412d-95b6-1085b51b97be.png" },
  { name: "Kandora", description: "Elegan untuk sehari-hari maupun formal.", image_url: "/images/e3214c06-ccf4-4342-aba7-849bf95da85a.png" },
  { name: "Koko", description: "Modern dan nyaman untuk shalat.", image_url: "/images/515c6ce5-1ac8-48d7-9832-450cbcd4cac9.png" },
  { name: "Vest", description: "Presisi untuk tampilan berkelas.", image_url: "/images/3b981a31-de0d-4aa5-9890-330ffe3f261d.png" },
  { name: "Kabak", description: "Premium berkualitas tinggi.", image_url: "/images/b32f8726-78f1-455c-aff9-59ab8b1a1310.png" },
  { name: "Cover Hanger", description: "Jaga busana tetap rapi.", image_url: "/images/6aec5227-932a-4ff1-86e2-2a3bb34943e9.png" },
];

export default function Koleksi() {
  const [categories, setCategories] = useState<CategoryItem[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    supabase.from("category_images").select("name, description, image_url").order("display_order").then(({ data, error }) => {
      if (!error && data && data.length > 0) setCategories(data);
    });
  }, []);

  return (
    <section id="produk" style={{ background: "var(--sand-2)" }}>
      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-14 sm:py-20">

        <p className="text-[11px] tracking-[0.28em] uppercase mb-5" style={{ color: "#5a5a5a" }}>Katalog Samaqu</p>

        <h1
          className="text-[2rem] sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] tracking-tight max-w-2xl"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
        >
          Pilih yang Membuatmu<br />
          <span className="italic font-normal pr-2" style={{ color: "var(--gold)" }}>Lebih</span>Percaya Diri
        </h1>

        <p className="mt-5 max-w-xl text-[15px] leading-relaxed" style={{ color: "#5a5a5a" }}>
          Dibuat dengan perhatian pada kualitas, kepedulian, dan rasa bangga untuk menemani berbagai aktivitasmu — dari keseharian hingga momen istimewa.
        </p>

        <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

          {/* Thobe — tall */}
          <article className="card group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)] md:row-span-2 min-h-[420px] md:min-h-[560px]" style={{ background: "var(--espresso)" }}>
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
          <article className="card wide group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)] min-h-[240px] md:min-h-[270px]" style={{ background: "var(--espresso)" }}>
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
          <article className="card wide group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)] min-h-[240px] md:min-h-[270px]" style={{ background: "var(--espresso)" }}>
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
          <article className="card group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)] md:row-span-2 min-h-[420px] md:min-h-[560px]" style={{ background: "var(--espresso)" }}>
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
          <article className="card wide group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)] min-h-[240px] md:min-h-[270px]" style={{ background: "#0d0d0d" }}>
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
          <article className="card wide group relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(42,33,27,.55)] min-h-[240px] md:min-h-[270px]" style={{ background: "var(--espresso)" }}>
            <img src={categories[5]?.image_url} alt="Cover Hanger" className="absolute inset-0 h-full w-full object-cover object-[62%_45%] transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]" />
            <div className="absolute inset-0 wide-shade" />
            <div className="absolute inset-0 z-10 flex items-end justify-between gap-4 p-5 sm:p-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#f1e9dd]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Cover Hanger</h2>
                <p className="mt-1 max-w-[13rem] text-[13px] leading-snug text-[#d4c7ba]">{categories[5]?.description}</p>
              </div>
              <a href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Cover Hanger.")} target="_blank" rel="noopener" aria-label="Lihat Cover Hanger" className="shrink-0 grid h-11 w-11 place-items-center rounded-full border backdrop-blur-sm text-[#f1e9dd] transition hover:bg-[#f1e9dd] hover:text-[var(--espresso)]" style={{ borderColor: "rgba(212,199,186,.5)", background: "rgba(42,33,27,.3)" }}>→</a>
            </div>
          </article>

        </div>

        <div className="mt-12 flex justify-center">
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] transition hover:bg-[var(--gold)]"
            style={{ background: "var(--espresso)", color: "#f1e9dd" }}
          >
            Lihat Katalog Selengkapnya <span aria-hidden="true">→</span>
          </a>
        </div>
      </main>

      <style jsx global>{`
        .card-shade { background: linear-gradient(to top, rgba(20,15,11,.92) 0%, rgba(20,15,11,.55) 38%, rgba(20,15,11,.05) 70%); }
        .wide-shade { background: linear-gradient(to top, rgba(20,15,11,.92) 0%, rgba(20,15,11,.45) 45%, rgba(20,15,11,0) 80%), linear-gradient(to right, rgba(20,15,11,.75) 0%, rgba(20,15,11,.15) 55%, rgba(20,15,11,0) 100%); }
        .card { transition: transform .45s cubic-bezier(.2,.7,.2,1), box-shadow .45s ease; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 26px 55px -22px rgba(42,33,27,.7); }
        .card:hover img { transform: scale(1.06); }
        .card img { transition: transform .8s cubic-bezier(.2,.7,.2,1); }
        .card::after { content: ""; position: absolute; inset: 0; border-radius: 22px; box-shadow: inset 0 0 0 1px rgba(241,233,221,.10); pointer-events: none; z-index: 20; }
        @media (max-width: 767px) {
          .card { min-height: 0 !important; aspect-ratio: 4/5; }
          .card.wide { aspect-ratio: 3/2; }
          .card:hover { transform: none; box-shadow: 0 18px 40px -18px rgba(42,33,27,.55); }
          .card:hover img { transform: none; }
        }
      `}</style>
    </section>
  );
}
