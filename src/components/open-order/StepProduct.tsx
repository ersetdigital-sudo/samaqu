"use client";

/**
 * Langkah 2 — detail produk: warna, ukuran, series, jumlah, dan Create Your Price.
 * Tata letak & gaya mengikuti halaman detail produk di katalog (serif espresso + aksen gold).
 * Harga yang diisi customer tidak boleh di bawah harga series terpilih (validasi diulang di server).
 */

import { useEffect, useState } from "react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import type { Product } from "@/lib/katalog-data";
import { money, openOrderImage } from "@/lib/open-order-catalog";
import { findOpenOrderProduct, OPEN_ORDER_SIZES } from "@/lib/open-order-config";
import type { ProductDraft } from "./types";
import { Chip, Counter, DANGER, INK, MUTED, PrimaryButton, SectionLabel } from "./ui";

export default function StepProduct({
  draft,
  catalog,
  onChange,
  onAdd,
}: {
  draft: ProductDraft;
  catalog: Product[];
  onChange: (patch: Partial<ProductDraft>) => void;
  onAdd: (line: ProductDraft) => void;
}) {
  const product = findOpenOrderProduct(draft.productId);
  const [price, setPrice] = useState(draft.price);

  // Harga default mengikuti series yang dipilih.
  useEffect(() => {
    setPrice(draft.price);
  }, [draft.price]);

  if (!product) return null;

  const series = product.series.find((s) => s.name === draft.series) ?? product.series[0];
  const minimum = series.price;
  const image = openOrderImage(product, draft.color, catalog);
  const priceTooLow = price < minimum;
  const lineTotal = (priceTooLow ? minimum : price) * draft.quantity;

  function handlePriceInput(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    const value = digits ? parseInt(digits, 10) : 0;
    setPrice(value);
    if (value >= minimum) onChange({ price: value });
  }

  function handleAdd() {
    if (priceTooLow) return;
    onAdd({ ...draft, price });
  }

  return (
    <div>
      {/* Foto produk */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[16/11]" style={{ background: "#e8dfd1" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(232,223,209,.6),rgba(201,183,156,.4))" }} />
        {image && (
          <img
            src={cloudinaryUrl(image, { width: 1100 })}
            alt={`${product.name} ${draft.color}`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* Nama & bahan */}
      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--gold)" }}>
          Detail Produk
        </p>
        <h2
          className="mt-2 text-[1.6rem] font-semibold leading-tight sm:text-[1.9rem]"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
        >
          {product.name} <span style={{ color: "var(--gold)" }}>— {draft.color}</span>
        </h2>
        <p className="mt-1.5 text-[13px]" style={{ color: MUTED }}>
          Jenis kain <span style={{ color: "var(--gold)" }}>{product.kain}</span>
          {product.weight
            ? ` · ${product.weight >= 1000 ? (product.weight / 1000).toFixed(1) + " kg" : product.weight + " g"}`
            : ""}
        </p>
      </div>

      {/* Warna */}
      <div className="mt-7">
        <SectionLabel>Pilih Warna</SectionLabel>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {product.colors.map((color) => (
            <Chip key={color} shape="square" active={color === draft.color} onClick={() => onChange({ color })}>
              {color}
            </Chip>
          ))}
        </div>
      </div>

      {/* Ukuran */}
      <div className="mt-6">
        <SectionLabel>Pilih Ukuran</SectionLabel>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {OPEN_ORDER_SIZES.map((size) => (
            <Chip key={size} shape="square" active={size === draft.size} onClick={() => onChange({ size })}>
              {size}
            </Chip>
          ))}
        </div>
      </div>

      {/* Series */}
      <div className="mt-6">
        <SectionLabel>Pilih Series</SectionLabel>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {product.series.map((option) => {
            const active = option.name === series.name;
            return (
              <Chip
                key={option.name}
                shape="square"
                active={active}
                onClick={() => onChange({ series: option.name, price: option.price })}
              >
                <span className="font-medium">{option.name}</span>
                <span className="ml-1.5" style={{ color: active ? "rgba(248,245,241,.75)" : "var(--gold)" }}>
                  mulai dari {money(option.price)}
                </span>
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Jumlah */}
      <div className="mt-6">
        <SectionLabel>Jumlah</SectionLabel>
        <div className="mt-2.5">
          <Counter value={draft.quantity} onChange={(quantity) => onChange({ quantity })} />
        </div>
      </div>

      {/* Create Your Price */}
      <div className="mt-6 rounded-2xl p-5" style={{ background: "var(--cream-bright)", border: "1px solid rgba(201,183,156,.25)" }}>
        <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
          Harga Minimum
        </p>
        <p className="mt-1 text-[20px] font-semibold tabular-nums" style={{ color: "var(--gold)" }}>
          {money(minimum)}
        </p>
        <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
          Create Your Price — pilih harga terbaikmu untuk series {series.name}.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-3" style={{ border: "1px solid rgba(201,183,156,.35)" }}>
          <span className="text-[13.5px] font-semibold" style={{ color: MUTED }}>
            Rp
          </span>
          <input
            value={price ? price.toLocaleString("id-ID") : ""}
            onChange={(e) => handlePriceInput(e.target.value)}
            inputMode="numeric"
            aria-label="Harga pilihanmu"
            placeholder={minimum.toLocaleString("id-ID")}
            className="w-full bg-transparent text-[15px] font-semibold tabular-nums outline-none"
            style={{ color: INK }}
          />
        </div>
        {priceTooLow && (
          <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: DANGER }}>
            Harga minimum untuk series {series.name} adalah {money(minimum)}.
          </p>
        )}
      </div>

      {/* Total & CTA */}
      <div className="mt-6 flex items-baseline justify-between">
        <span className="text-[12.5px]" style={{ color: MUTED }}>
          Total ({draft.quantity} pcs)
        </span>
        <span className="text-[17px] font-semibold tabular-nums">{money(lineTotal)}</span>
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={handleAdd} disabled={priceTooLow}>
          Tambah ke Pesanan
        </PrimaryButton>
      </div>
    </div>
  );
}
