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

const BENTO_SPANS = [
  { col: "sm:col-span-2 lg:col-span-7 lg:row-span-4", h: "h-[420px] sm:h-[520px] lg:h-auto" },
  { col: "lg:col-span-5 lg:row-span-2", h: "h-[260px] lg:h-auto" },
  { col: "lg:col-span-5 lg:row-span-2", h: "h-[260px] lg:h-auto" },
  { col: "lg:col-span-4 lg:row-span-2", h: "h-[220px] lg:h-auto" },
  { col: "lg:col-span-4 lg:row-span-2", h: "h-[220px] lg:h-auto" },
  { col: "lg:col-span-4 lg:row-span-2", h: "h-[220px] lg:h-auto" },
];

export default function Koleksi() {
  const [categories, setCategories] = useState<CategoryItem[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    supabase.from("category_images").select("name, description, image_url").order("display_order").then(({ data, error }) => {
      if (!error && data && data.length > 0) setCategories(data);
    });
  }, []);

  return (
    <section id="produk" className="px-5 sm:px-8 lg:px-14 py-16 sm:py-24" style={{ background: "var(--sand-2)" }}>
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-12 sm:mb-16 fade-up">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-block w-8 h-px" style={{ background: "var(--gold)" }}></span>
              <span className="text-[11px] tracking-[0.32em] uppercase font-medium" style={{ color: "var(--gold)" }}>Katalog Samaqu</span>
            </div>
            <h2
              className="text-[2.6rem] sm:text-6xl lg:text-7xl leading-[1.02]"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
            >
              Pilih yang Membuatmu<br className="hidden sm:block" />
              <em className="italic" style={{ color: "var(--gold)" }}>Lebih</em> Percaya Diri
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-3">
            <div className="h-px mb-6" style={{ background: "linear-gradient(to right, rgba(64,50,37,.28), rgba(64,50,37,0))" }}></div>
            <p className="text-[15px] leading-relaxed max-w-md" style={{ color: "var(--coffee)" }}>
              Dibuat dengan perhatian pada kualitas, kepedulian, dan rasa bangga untuk menemani berbagai aktivitasmu — dari keseharian hingga momen istimewa.
            </p>
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5 lg:auto-rows-[150px]">
          {categories.map((cat, i) => {
            const span = BENTO_SPANS[i] || BENTO_SPANS[BENTO_SPANS.length - 1];
            const isFeatured = i === 0;

            return (
              <a
                key={cat.name}
                href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
                target="_blank"
                rel="noopener"
                className={`card group relative overflow-hidden rounded-2xl ${span.col} ${span.h}`}
              >
                <img
                  src={cat.image_url}
                  alt={`${cat.name} SAMAQU`}
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: isFeatured
                      ? "linear-gradient(to top, rgba(29,22,17,.88) 0%, rgba(29,22,17,.45) 35%, rgba(29,22,17,0) 70%)"
                      : i === 5
                        ? "linear-gradient(to top, rgba(29,22,17,.94) 0%, rgba(29,22,17,.7) 45%, rgba(29,22,17,.25) 100%)"
                        : "linear-gradient(to top, rgba(29,22,17,.88) 0%, rgba(29,22,17,.45) 35%, rgba(29,22,17,0) 70%)",
                  }}
                />

                {isFeatured && (
                  <span
                    className="absolute top-5 left-5 text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 rounded-full"
                    style={{ backdropFilter: "blur(10px)", background: "rgba(42,33,27,.72)", border: "1px solid rgba(241,233,221,.22)", color: "var(--sand-2)" }}
                  >
                    Best Seller
                  </span>
                )}

                <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 ${isFeatured ? "p-6 sm:p-8" : "p-5"}`}>
                  <div>
                    <h3
                      className={`text-white ${isFeatured ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}
                      style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
                    >
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className={`mt-1.5 ${isFeatured ? "text-[13px] sm:text-sm max-w-sm" : "text-[13px]"}`} style={{ color: "#d4c7ba" }}>
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 grid place-items-center rounded-full transition-transform duration-300 group-hover:translate-x-[3px] group-hover:-translate-y-[3px]"
                    style={{
                      width: isFeatured ? 44 : 40,
                      height: isFeatured ? 44 : 40,
                      backdropFilter: "blur(10px)",
                      background: "rgba(241,233,221,.14)",
                      border: "1px solid rgba(241,233,221,.28)",
                      color: "var(--sand-2)",
                    }}
                  >
                    ↗
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-center gap-5 fade-up">
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-3 rounded-full px-8 py-4 text-[11px] tracking-[0.24em] uppercase font-medium text-white transition-colors duration-300 hover:bg-[var(--gold)]"
            style={{ background: "var(--espresso)" }}
          >
            Lihat Katalog Selengkapnya
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
          <p className="text-[12px] tracking-[0.18em] uppercase" style={{ color: "var(--coffee)" }}>Create Your Own Price</p>
        </div>
      </div>
    </section>
  );
}
