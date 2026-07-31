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
  { name: "Cover Hanger", description: "Jaga busana tetap rapi dan terlindungi.", image_url: "/images/6aec5227-932a-4ff1-86e2-2a3bb34943e9.png" },
];

export default function Koleksi() {
  const [categories, setCategories] = useState<CategoryItem[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    supabase.from("category_images").select("name, description, image_url").order("display_order").then(({ data, error }) => {
      if (!error && data && data.length > 0) setCategories(data);
    });
  }, []);

  const thobe = categories[0];
  const kandora = categories[1];
  const koko = categories[2];
  const vest = categories[3];
  const kabak = categories[4];
  const coverHanger = categories[5];

  return (
    <section id="produk" className="px-4 sm:px-6 lg:px-14 py-10 sm:py-16" style={{ background: "var(--sand-2)" }}>
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="text-left pt-2 pb-8 sm:pt-4 sm:pb-12 max-w-3xl fade-up">
          <span className="block text-[11px] sm:text-xs uppercase tracking-[0.25em] font-medium mb-3 sm:mb-4" style={{ color: "var(--gold)" }}>
            Katalog Samaqu
          </span>
          <h2
            className="text-3xl sm:text-5xl md:text-6xl font-semibold leading-[1.18] tracking-tight mb-4 sm:mb-6"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
          >
            Pilih yang Membuatmu{" "}
            <em className="italic font-normal" style={{ color: "var(--gold)" }}>Lebih</em>{" "}
            Percaya Diri
          </h2>
          <p className="text-sm sm:text-base md:text-[17px] leading-relaxed max-w-2xl" style={{ color: "var(--coffee)" }}>
            Dibuat dengan perhatian pada kualitas, kepedulian, dan rasa bangga untuk menemani berbagai aktivitasmu — dari keseharian hingga momen istimewa.
          </p>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">

          {/* LEFT: Thobe + Koko (tall cards) */}
          <div className="flex flex-col gap-4 sm:gap-5 md:gap-6">
            {thobe && <CatalogCard category={thobe} heightClass="h-[460px] sm:h-[500px] md:h-[520px]" badgeText="Best Seller" />}
            {koko && <CatalogCard category={koko} heightClass="h-[460px] sm:h-[500px] md:h-[520px]" />}
          </div>

          {/* RIGHT: Kandora, Vest, Kabak, Cover Hanger */}
          <div className="flex flex-col gap-4 sm:gap-5 md:gap-6">
            {kandora && <CatalogCard category={kandora} heightClass="h-[220px] sm:h-[240px] md:h-[250px]" />}
            {vest && <CatalogCard category={vest} heightClass="h-[220px] sm:h-[240px] md:h-[250px]" />}
            {kabak && <CatalogCard category={kabak} heightClass="h-[220px] sm:h-[240px] md:h-[250px]" />}
            {coverHanger && <CatalogCard category={coverHanger} heightClass="h-[220px] sm:h-[240px] md:h-[250px]" />}
          </div>

        </div>

        {/* CTA */}
        <div className="flex justify-center pt-8 sm:pt-12 pb-8 fade-up">
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-3 rounded-full px-7 py-3.5 sm:px-9 sm:py-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: "var(--espresso)", color: "var(--sand-2)" }}
          >
            Lihat Katalog Selengkapnya
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
        </div>
      </div>
    </section>
  );
}

function CatalogCard({ category, heightClass, badgeText }: { category: CategoryItem; heightClass: string; badgeText?: string }) {
  return (
    <a
      href={getWhatsAppLink(`Halo Admin SAMAQU, saya tertarik dengan koleksi ${category.name} dan ingin bertanya soal pemesanan.`)}
      target="_blank"
      rel="noopener"
      className={`group relative w-full ${heightClass} rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 border`}
      style={{ borderColor: "rgba(216,206,189,.3)", background: "var(--espresso)" }}
    >
      <img
        src={category.image_url}
        alt={category.name}
        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-opacity group-hover:from-black/90" />

      {/* Badge */}
      {badgeText && (
        <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10">
          <span
            className="inline-block backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold tracking-widest uppercase px-3 py-1 sm:px-3.5 sm:py-1 rounded-full shadow-sm"
            style={{ background: "rgba(170,131,89,.8)", border: "1px solid rgba(255,255,255,.2)" }}
          >
            {badgeText}
          </span>
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 md:p-7 z-10 flex items-end justify-between">
        <div className="pr-4 max-w-[80%]">
          <h3
            className="text-2xl sm:text-3xl md:text-3xl font-semibold text-white mb-1.5 sm:mb-2 tracking-tight group-hover:text-[#f3ede2] transition-colors"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
          >
            {category.name}
          </h3>
          {category.description && (
            <p className="text-xs sm:text-sm font-normal leading-relaxed line-clamp-2" style={{ color: "rgba(226,218,208,.9)" }}>
              {category.description}
            </p>
          )}
        </div>

        {/* Arrow button */}
        <div className="shrink-0">
          <span
            aria-label={`Lihat ${category.name}`}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg"
            style={{ background: "rgba(255,255,255,.85)", color: "var(--espresso)" }}
          >
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </span>
        </div>
      </div>
    </a>
  );
}
