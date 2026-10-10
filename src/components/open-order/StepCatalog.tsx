"use client";

/**
 * Langkah 1 — daftar produk Open Order: filter kain + grid kartu produk (per warna ready stock).
 * Foto dari katalog, harga dari `open-order-config.ts`.
 */

import { useMemo, useState } from "react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import type { Product } from "@/lib/katalog-data";
import { money, openOrderVariants, priceRange } from "@/lib/open-order-catalog";
import { OPEN_ORDER_PRODUCTS, type OpenOrderProduct } from "@/lib/open-order-config";
import { Chip, MUTED, PrimaryButton } from "./ui";

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
      {/* Judul periode */}
      <div className="text-center">
        <h1 className="text-[26px] font-bold uppercase tracking-[0.12em] sm:text-[32px]">OPEN ORDER</h1>
        <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
          SAMAQU
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
            className="group text-left"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl" style={{ background: "#f0f0f0" }}>
              {variant.image ? (
                <img
                  src={cloudinaryUrl(variant.image, { width: 700 })}
                  alt={`${variant.product.name} ${variant.color}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#e5e5e5,#cfcfcf)" }} />
              )}
              <span
                className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ background: "rgba(255,255,255,.92)", color: "#000" }}
              >
                {variant.product.kain}
              </span>
            </div>
            <h3 className="mt-3 text-[13.5px] font-semibold leading-snug">{variant.product.name}</h3>
            <p className="mt-0.5 text-[11.5px]" style={{ color: MUTED }}>
              Warna: {variant.color}
            </p>
            <p className="mt-1 text-[12.5px] font-semibold tabular-nums">{priceRange(variant.product)}</p>
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
