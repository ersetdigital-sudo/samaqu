"use client";

import Image from "next/image";
import { useSafeTranslations } from "@/lib/safe-i18n";

export default function Tentang() {
  const t = useSafeTranslations("tentangHome");
  return (
    <section id="tentang" className="py-14 sm:py-24 lg:py-32" style={{ background: "var(--sand-2)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="fade-up order-2 lg:order-1">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-5" style={{ color: "var(--gold)" }}>
            {t("tentangHome.eyebrow")}
          </p>
          <h2
            className="text-3xl sm:text-5xl font-medium mb-6 leading-tight"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
          >
            {t("tentangHome.title")}
          </h2>
          <p className="leading-[1.75] mb-5 text-sm sm:text-base" style={{ color: "var(--coffee)" }}>
            Kami tahu rasanya sedang berjuang, bertumbuh, dan membangun masa depan dengan apa yang kita punya. Karena itu Samaqu hadir dengan satu keyakinan sederhana: Orang biasa juga berhak mendapatkan kualitas terbaik.
          </p>
          <p className="leading-[1.75] mb-6 text-sm sm:text-base" style={{ color: "var(--coffee)" }}>
            Kami membuat produk dengan sungguh-sungguh, memberikan harga yang lebih mudah dijangkau, dan terus mencari cara agar apa yang kami bangun bisa memberikan manfaat bagi lebih banyak orang.
          </p>
          <a
            href="https://samaqu.vercel.app/tentang-kami"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 sm:py-4 text-[11px] sm:text-[12px] tracking-[0.18em] uppercase font-ui transition hover:opacity-90 mb-8"
            style={{ background: "var(--espresso)", color: "var(--cream)" }}
          >
            {t("tentangHome.cta")}
          </a>
          <div className="flex gap-8">
            <div>
              <p className="text-3xl mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                {t("tentangHome.value1")}
              </p>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--stone)" }}>
                {t("tentangHome.value1Desc")}
              </p>
            </div>
            <div>
              <p className="text-3xl mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                {t("tentangHome.value2")}
              </p>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--stone)" }}>
                {t("tentangHome.value2Desc")}
              </p>
            </div>
            <div>
              <p className="text-3xl mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                {t("tentangHome.value3")}
              </p>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--stone)" }}>
                {t("tentangHome.value3Desc")}
              </p>
            </div>
          </div>
        </div>

        <div className="fade-up order-1 lg:order-2">
          <div
            className="rounded-[2px] overflow-hidden"
            style={{ boxShadow: "0 40px 80px -35px rgba(43,38,32,.45)" }}
          >
            <Image
              src="/images/fab2fbc3-813a-4a5f-b67b-a34d9ef3514f.png"
              alt="Detail jahitan premium SAMAQU"
              width={600}
              height={800}
              className="w-full h-[35vh] sm:h-[50vh] lg:h-[60vh] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
