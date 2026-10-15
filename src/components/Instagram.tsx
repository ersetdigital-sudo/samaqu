"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSafeTranslations } from "@/lib/safe-i18n";
import { supabase } from "@/lib/supabase";
import { INSTAGRAM_DEFAULT_PHOTOS, INSTAGRAM_PROFILE } from "@/lib/instagram-defaults";

/**
 * Section "Ikuti perjalanan kami di Instagram @samaqu.id".
 *
 * Layout, jumlah kolom, ukuran, jarak, sudut, ikon, dan responsif TIDAK berubah —
 * yang berubah hanya SUMBER foto: dari tabel `instagram_photos` (diatur admin).
 * Setiap slot selalu terisi: kalau slot kosong/belum diisi / query gagal, dipakai
 * foto bawaan (INSTAGRAM_DEFAULT_PHOTOS) supaya grid tidak pernah bolong.
 *
 * Data diambil di klien (tanpa cache) sehingga perubahan admin langsung muncul
 * tanpa deploy ulang. Render pertama = foto bawaan (sama seperti sebelumnya).
 */

type Photo = { src: string; alt: string; link: string };

type Row = {
  posisi: number;
  image_url: string | null;
  link: string | null;
  alt: string | null;
};

/** Map baris DB → slot tetap (posisi i+1). Slot tanpa baris → foto bawaan. */
function toSlots(rows: Row[] | null): Photo[] {
  return INSTAGRAM_DEFAULT_PHOTOS.map((def, i) => {
    const row = rows?.find((r) => r.posisi === i + 1);
    return {
      src: row?.image_url || def.src,
      alt: row?.alt || def.alt,
      link: row?.link || INSTAGRAM_PROFILE,
    };
  });
}

function InstagramIcon() {
  return (
    <svg
      className="absolute top-2.5 right-2.5 w-[22px] h-[22px] text-white"
      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.5))" }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Instagram() {
  const t = useSafeTranslations("instagram");
  // Mulai dari foto bawaan (render pertama identik dengan tampilan lama), lalu
  // ganti dengan data admin begitu termuat.
  const [photos, setPhotos] = useState<Photo[]>(() => toSlots(null));

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("instagram_photos")
      .select("posisi, image_url, link, alt")
      .order("posisi")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setPhotos(toSlots(data as Row[]));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-14 sm:py-20" style={{ background: "#F3F3F3" }}>
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Header */}
        <div className="text-center">
          <span
            className="inline-block h-px w-10 mb-5"
            style={{ background: "#000000" }}
          />
          <p
            className="font-semibold font-ui"
            style={{
              letterSpacing: "0.24em",
              fontSize: "11px",
              color: "#000000",
            }}
          >
            {t("eyebrow")}
          </p>
          <h2
            className="mt-3 text-[30px] sm:text-[40px] font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "#000000",
            }}
          >
            @samaqu.id
          </h2>
        </div>

        {/* 3×2 Grid */}
        <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
          {photos.map((img, i) => (
            <a
              key={i}
              href={img.link}
              target="_blank"
              rel="noopener"
              className="group relative overflow-hidden rounded-[6px] aspect-square"
              style={{ background: "#e5e5e5" }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={400}
                height={400}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <InstagramIcon />
            </a>
          ))}
        </div>

        {/* CTA */}
        <a
          href={INSTAGRAM_PROFILE}
          target="_blank"
          rel="noopener"
          className="mt-8 sm:mt-10 grid place-items-center rounded-md text-[13px] sm:text-[14px] font-bold tracking-[.12em] py-4 transition-colors duration-200 !no-underline !text-white visited:!text-white hover:!text-white"
          style={{
            background: "#000000",
          }}
        >
          {t("cta")}
        </a>
      </div>
    </section>
  );
}
