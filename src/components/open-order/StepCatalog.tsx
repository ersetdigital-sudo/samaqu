"use client";

/**
 * Langkah 1 — daftar produk Open Order: filter kain + grid kartu produk (per warna ready stock).
 * Kartu dibuat sama seperti kartu katalog (serif espresso + aksen gold); foto dari katalog,
 * harga dari `open-order-config.ts`.
 */

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import type { Product } from "@/lib/katalog-data";
import { money, openOrderVariants, priceRange } from "@/lib/open-order-catalog";
import { OPEN_ORDER_PERIOD, OPEN_ORDER_PRODUCTS, type OpenOrderProduct } from "@/lib/open-order-config";
import { Chip, INK, MUTED, PrimaryButton } from "./ui";

const ALL = "semua";

export default function StepCatalog({
  catalog,
  cartCount,
  onOpen,
  onViewCart,
}: {
  catalog: Product[];
  cartCount: number;
  onOpen: (product: OpenOrderProduct, color: string) => void;
  onViewCart: () => void;
}) {
  const [fabric, setFabric] = useState<string>(ALL);

  const variants = useMemo(() => openOrderVariants(catalog), [catalog]);
  const shown = fabric === ALL ? variants : variants.filter((v) => v.product.kain === fabric);

  return (
    <div>
      {/* Judul & periode */}
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em]" style={{ color: "var(--gold)" }}>
          Create Your Price
        </p>
        <h1
          className="mt-2 text-[1.7rem] font-semibold leading-tight sm:text-[2.2rem]"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
        >
          Open Order <span style={{ color: "var(--gold)" }}>Samaqu</span>
        </h1>
        <p className="mt-1.5 text-[13px]" style={{ color: INK }}>
          Periode {OPEN_ORDER_PERIOD}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed" style={{ color: MUTED }}>
          Pilih produk, atur ukuran dan harga, lalu kirim pesanan kamu. Admin akan mengonfirmasi lewat WhatsApp.
        </p>
      </div>

      {/* Filter kain */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <Chip active={fabric === ALL} onClick={() => setFabric(ALL)}>
          Semua
        </Chip>
        {OPEN_ORDER_PRODUCTS.map((product) => (
          <Chip key={product.kain} active={fabric === product.kain} onClick={() => setFabric(product.kain)}>
            {product.kain}
          </Chip>
        ))}
      </div>

      {/* Grid produk */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {shown.map((variant) => (
          <button
            key={variant.key}
            type="button"
            onClick={() => onOpen(variant.product, variant.color)}
            className="group flex h-full flex-col overflow-hidden rounded-2xl text-left transition-shadow duration-300 hover:shadow-[0_10px_30px_-18px_rgba(42,33,27,.45)]"
            style={{ background: "var(--cream-bright)", border: "1px solid rgba(201,183,156,.2)" }}
          >
            <div className="relative aspect-[3/4] overflow-hidden" style={{ background: "#e8dfd1" }}>
              {/* Gradient kain (terlihat kalau foto gagal dimuat) */}
              <div
                className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
                style={{ background: "linear-gradient(135deg,rgba(232,223,209,.6),rgba(201,183,156,.4))" }}
              />
              {variant.image && (
                <img
                  src={cloudinaryUrl(variant.image, { width: 700 })}
                  alt={`${variant.product.name} ${variant.color}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <span
                className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]"
                style={{ background: "rgba(248,246,242,.92)", color: "var(--gold)", border: "1px solid rgba(181,140,74,.35)" }}
              >
                {variant.product.kain}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-3.5 sm:p-4">
              <h3
                className="line-clamp-1 text-[15px] font-semibold leading-snug"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
              >
                {variant.product.name}
              </h3>
              <p className="mt-1 text-[11.5px]" style={{ color: "var(--gold)" }}>
                Kain {variant.product.kain}
              </p>
              <p className="mt-0.5 text-[11.5px] line-clamp-1" style={{ color: MUTED }}>
                Warna: {variant.color}
              </p>
              <p className="mt-1.5 text-[12.5px] font-medium tabular-nums" style={{ color: "var(--espresso)" }}>
                {priceRange(variant.product)}
              </p>
              <span className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--espresso)] px-3 py-2.5 pt-3 text-[12.5px] font-medium text-[var(--espresso)] transition-all duration-200 group-hover:bg-[var(--espresso)] group-hover:text-white">
                Lihat Detail <ChevronRight size={14} strokeWidth={2} />
              </span>
            </div>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="py-10 text-center text-[13px]" style={{ color: MUTED }}>
          Belum ada produk untuk kain ini.
        </p>
      )}

      {/* Catatan harga */}
      <p className="mt-8 text-[11.5px] leading-relaxed" style={{ color: MUTED }}>
        Harga di atas adalah harga Open Order periode ini. Kamu bisa menentukan harga sendiri (Create Your Price) di
        langkah berikutnya — mulai dari {money(Math.min(...OPEN_ORDER_PRODUCTS.flatMap((p) => p.series.map((s) => s.price))))}.
      </p>

      {cartCount > 0 && (
        <div className="mt-5">
          <PrimaryButton onClick={onViewCart}>{`Lihat Pesanan (${cartCount})`}</PrimaryButton>
        </div>
      )}
    </div>
  );
}
