"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
    // Fetch with no cache to ensure fresh data after admin edits
    supabase.from("category_images").select("name, description, image_url").order("display_order").then(({ data, error }) => {
      if (!error && data && data.length > 0) setCategories(data);
    });
  }, []);

  const featured = categories[0];

  return (
    <section
      id="produk"
      className="py-14 sm:py-24 lg:py-32"
      style={{ background: "var(--sand-2)" }}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 mb-6 sm:mb-14 fade-up">
          <div className="max-w-xl">
            <p
              className="text-[12px] tracking-[0.32em] uppercase mb-4 font-ui"
              style={{ color: "var(--gold)" }}
            >
              Katalog SAMAQU
            </p>
            <h2
              className="text-3xl sm:text-5xl font-medium"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                color: "var(--espresso)",
              }}
            >
              Pilih yang Membuatmu Lebih Percaya Diri
            </h2>
          </div>
          <p
            className="leading-[1.75] max-w-sm text-sm font-ui"
            style={{ color: "var(--coffee)" }}
          >
            Dibuat dengan perhatian pada kualitas, kepedulian, dan rasa bangga untuk menemani berbagai aktivitasmu.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {categories.map((cat, i) =>
            i === 0 ? (
              /* ── Feature card (large, first category) ── */
              <a
                key={cat.name}
                href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
                target="_blank"
                rel="noopener"
                className="group relative col-span-2 lg:col-span-2 lg:row-span-2 overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-500 hover:shadow-xl"
                style={{ borderColor: "rgba(216,196,168,.25)" }}
              >
                <img
                  src={cat.image_url}
                  alt={`${cat.name} SAMAQU`}
                  className="card-img w-full h-64 sm:h-80 lg:h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 transition-all duration-500 group-hover:bg-[rgba(43,38,32,.1)]"
                  style={{
                    background: "linear-gradient(180deg,rgba(43,38,32,0) 40%,rgba(43,38,32,.75))",
                  }}
                />
                <div className="absolute bottom-0 left-0 p-5 sm:p-7">
                  <h3 className="text-2xl sm:text-3xl text-white mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>{cat.name}</h3>
                  {cat.description && <p className="text-[13px] sm:text-sm font-ui" style={{ color: "rgba(216,196,168,.9)" }}>{cat.description}</p>}
                </div>
              </a>
            ) : (
              /* ── Regular card ── */
              <a
                key={cat.name}
                href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
                target="_blank"
                rel="noopener"
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-500 hover:shadow-lg"
                style={{ borderColor: "rgba(216,196,168,.25)" }}
              >
                <img
                  src={cat.image_url}
                  alt={`${cat.name} SAMAQU`}
                  className="card-img w-full h-44 sm:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 transition-all duration-500 group-hover:bg-[rgba(43,38,32,.08)]"
                  style={{
                    background: "linear-gradient(180deg,rgba(43,38,32,0) 45%,rgba(43,38,32,.7))",
                  }}
                />
                <div className="absolute bottom-0 left-0 p-4 sm:p-5">
                  <h3 className="text-xl sm:text-2xl text-white" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>{cat.name}</h3>
                  {cat.description && <p className="text-[12px] sm:text-[13px] font-ui mt-0.5" style={{ color: "rgba(216,196,168,.85)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cat.description}</p>}
                </div>
              </a>
            )
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 fade-up">
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[12px] tracking-[0.18em] uppercase font-ui text-white transition-all duration-300 hover:opacity-90 hover:shadow-lg"
            style={{ background: "var(--espresso)" }}
          >
            Tanya Katalog Lengkap via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
