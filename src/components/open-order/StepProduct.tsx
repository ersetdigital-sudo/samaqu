"use client";

/**
 * Langkah 2 — detail produk: warna, ukuran, series (kalau ada), jumlah, dan Create Your Price.
 *
 * Generik untuk semua kategori: series cuma muncul kalau produknya memang punya series, kartu
 * Create Your Price cuma muncul kalau produknya mengaktifkannya, dan daftar ukuran diambil dari
 * varian produk (bukan daftar statis) supaya cocok dengan stok yang dipotong di server.
 */

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { money, openOrderGallery } from "@/lib/open-order-catalog";
import { OPEN_ORDER_SIZES } from "@/lib/open-order-config";
import { findOpenOrderProduct, openOrderColorLabel, openOrderVariantFor, type OpenOrderProduct } from "@/lib/open-order-offering";
import type { ProductDraft } from "./types";
import { Chip, Counter, DANGER, INK, MUTED, PrimaryButton, SectionLabel } from "./ui";

export default function StepProduct({
  draft,
  products,
  onChange,
  onAdd,
}: {
  draft: ProductDraft;
  products: OpenOrderProduct[];
  onChange: (patch: Partial<ProductDraft>) => void;
  onAdd: (line: ProductDraft) => void;
}) {
  const product = findOpenOrderProduct(products, draft.productId);
  const series = product?.series.find((option) => option.name === draft.series) ?? null;
  const variant = product ? openOrderVariantFor(product, draft.color, series?.name ?? null) : undefined;
  // Ukuran dari varian warna/series terpilih; daftar statis cuma cadangan (data varian kosong).
  const sizes = variant && variant.sizes.length > 0 ? variant.sizes : [...OPEN_ORDER_SIZES];
  const cypEnabled = product?.cypEnabled ?? false;
  const minimum = series?.price ?? product?.minimumPrice ?? 0;

  const [price, setPrice] = useState(draft.price);
  const [photo, setPhoto] = useState(0);

  // Harga default mengikuti series yang dipilih (atau harga produk kalau tanpa series).
  useEffect(() => {
    setPrice(draft.price);
  }, [draft.price]);

  // Foto galeri datang dari baris katalog untuk warna + series terpilih — foto yang sama
  // persis dengan halaman detail katalog (bukan cuma satu thumbnail).
  const gallery = product ? openOrderGallery(product, draft.color, series?.name ?? null) : [];
  const activePhoto = Math.min(photo, Math.max(gallery.length - 1, 0));
  const currentPhoto = gallery[activePhoto] ?? "";

  // Balik ke foto pertama setiap warna/series/produk berganti (fotonya juga berganti).
  useEffect(() => {
    setPhoto(0);
  }, [draft.productId, draft.color, series?.name]);

  // Warna/series berganti bisa mengubah daftar ukuran — pastikan ukuran terpilih tetap valid.
  useEffect(() => {
    if (sizes.includes(draft.size)) return;
    onChange({ size: sizes.includes("M") ? "M" : sizes[0] ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.productId, draft.color, series?.name, sizes.join("|")]);

  if (!product) return null;

  const colorLabel = openOrderColorLabel(product, draft.color);
  const priceTooLow = cypEnabled && price < minimum;
  const lineTotal = (priceTooLow ? minimum : price) * draft.quantity;

  function handlePriceInput(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    const value = digits ? parseInt(digits, 10) : 0;
    setPrice(value);
    if (value >= minimum) onChange({ price: value });
  }

  function handleAdd() {
    if (priceTooLow) return;
    onAdd({ ...draft, price: cypEnabled ? price : minimum, series: series?.name ?? "" });
  }

  return (
    <div>
      {/* Foto produk — galeri dari katalog (sama seperti halaman detail katalog) */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl" style={{ background: "#e5e5e5" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(232,223,209,.6),rgba(0,0,0,.4))" }} />
        {currentPhoto && (
          <img
            key={currentPhoto}
            src={cloudinaryUrl(currentPhoto, { width: 1200 })}
            alt={`${product.name} ${colorLabel}${series ? ` — ${series.name}` : ""}`}
            className="absolute inset-0 h-full w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setPhoto((i) => (i - 1 + gallery.length) % gallery.length)}
              aria-label="Foto sebelumnya"
              className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full transition-transform duration-200 hover:scale-105"
              style={{ background: "rgba(248,246,242,.85)", backdropFilter: "blur(6px)" }}
            >
              <ChevronLeft size={18} style={{ color: "var(--espresso)" }} />
            </button>
            <button
              type="button"
              onClick={() => setPhoto((i) => (i + 1) % gallery.length)}
              aria-label="Foto berikutnya"
              className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full transition-transform duration-200 hover:scale-105"
              style={{ background: "rgba(248,246,242,.85)", backdropFilter: "blur(6px)" }}
            >
              <ChevronRight size={18} style={{ color: "var(--espresso)" }} />
            </button>
            <span
              className="absolute bottom-3 right-3 z-10 rounded-full px-2.5 py-1 text-[10px] tabular-nums"
              style={{ background: "rgba(0,0,0,.55)", color: "white" }}
            >
              {activePhoto + 1}/{gallery.length}
            </span>
          </>
        )}
      </div>

      {/* Titik navigasi foto */}
      {gallery.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {gallery.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setPhoto(i)}
              aria-label={`Foto ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                background: i === activePhoto ? "var(--gold)" : "rgba(0,0,0,.4)",
                width: i === activePhoto ? 16 : 6,
                height: 6,
              }}
            />
          ))}
        </div>
      )}

      {/* Nama & bahan */}
      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--gold)" }}>
          Detail Produk
        </p>
        <h2
          className="mt-2 text-[1.6rem] font-semibold leading-tight sm:text-[1.9rem]"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
        >
          {product.name} {colorLabel && <span style={{ color: "var(--gold)" }}>— {colorLabel}</span>}
        </h2>
        <p className="mt-1.5 text-[13px]" style={{ color: MUTED }}>
          {product.kain ? (
            <>
              Jenis kain <span style={{ color: "var(--gold)" }}>{product.kain}</span>
            </>
          ) : (
            product.category
          )}
          {product.weight
            ? ` · ${product.weight >= 1000 ? (product.weight / 1000).toFixed(1) + " kg" : product.weight + " g"}`
            : ""}
        </p>
      </div>

      {/* Warna */}
      {product.colors.length > 0 && (
        <div className="mt-7">
          <SectionLabel>Pilih Warna</SectionLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {product.colors.map((color) => (
              <Chip key={color} shape="square" active={color === draft.color} onClick={() => onChange({ color })}>
                {openOrderColorLabel(product, color)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Ukuran */}
      <div className="mt-6">
        <SectionLabel>Pilih Ukuran</SectionLabel>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {sizes.map((size) => (
            <Chip key={size} shape="square" active={size === draft.size} onClick={() => onChange({ size })}>
              {size}
            </Chip>
          ))}
        </div>
      </div>

      {/* Series — hanya produk yang punya series (mis. Thobe) */}
      {product.series.length > 0 && (
        <div className="mt-6">
          <SectionLabel>Pilih Series</SectionLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {product.series.map((option) => {
              const active = option.name === series?.name;
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
      )}

      {/* Jumlah */}
      <div className="mt-6">
        <SectionLabel>Jumlah</SectionLabel>
        <div className="mt-2.5">
          <Counter value={draft.quantity} onChange={(quantity) => onChange({ quantity })} />
        </div>
      </div>

      {/* Harga — Create Your Price kalau produknya mengaktifkan, kalau tidak harga tetap. */}
      {cypEnabled ? (
        <div className="mt-6 rounded-2xl p-5" style={{ background: "var(--cream-bright)", border: "1px solid rgba(0,0,0,.25)" }}>
          <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            Harga Minimum
          </p>
          <p className="mt-1 text-[20px] font-semibold tabular-nums" style={{ color: "var(--gold)" }}>
            {money(minimum)}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
            Create Your Price — pilih harga terbaikmu{series ? ` untuk series ${series.name}` : ""}.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-3" style={{ border: "1px solid rgba(0,0,0,.35)" }}>
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
              Harga minimum{series ? ` untuk series ${series.name}` : ""} adalah {money(minimum)}.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl p-5" style={{ background: "var(--cream-bright)", border: "1px solid rgba(0,0,0,.25)" }}>
          <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            Harga
          </p>
          <p className="mt-1 text-[20px] font-semibold tabular-nums" style={{ color: "var(--espresso)" }}>
            {money(minimum)}
            <span className="ml-1.5 text-[12px] font-normal" style={{ color: MUTED }}>
              / pcs
            </span>
          </p>
        </div>
      )}

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
