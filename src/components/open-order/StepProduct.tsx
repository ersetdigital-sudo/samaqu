"use client";

/**
 * Langkah 2 — detail produk. Tampilannya mengikuti **halaman detail produk di Katalog**
 * (`src/app/[locale]/(customer)/katalog/[id]/page.tsx`): grid dua kolom (galeri di kiri, info
 * di kanan), galeri aspect 3/4 dengan panah + titik + thumbnail, eyebrow "Detail Produk", judul
 * serif dengan aksen gold, chip series/warna/ukuran, kartu harga Create Your Price dengan
 * quick-pick, deskripsi, dan accordion info.
 *
 * Bedanya cuma aksi bawahnya: di sini "Tambah ke Pesanan" (masuk keranjang Open Order), bukan
 * Keranjang / WhatsApp.
 */

import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { openOrderGallery } from "@/lib/open-order-catalog";
import { OPEN_ORDER_SIZES } from "@/lib/open-order-config";
import {
  findOpenOrderProduct,
  openOrderColorLabel,
  openOrderVariantFor,
  type OpenOrderProduct,
} from "@/lib/open-order-offering";
import type { ProductDraft } from "./types";

/** Format harga sama dengan halaman detail Katalog ("Rp 329.000"). */
const rupiah = (value: number) => "Rp " + Math.round(value).toLocaleString("id-ID");

/** Deskripsi cadangan per kategori — sama dengan `getDescription()` di halaman katalog. */
const DESCRIPTION_BY_CATEGORY: Record<string, string> = {
  Thobe: "Thobe premium dengan bahan pilihan yang adem dan nyaman. Potongan presisi, jahitan rapi, cocok untuk ibadah maupun acara istimewa. Tersedia dalam berbagai pilihan kain dan warna.",
  Kandora: "Kandora berkualitas dengan bahan ringan dan potongan yang elegan. Nyaman dipakai sehari-hari maupun untuk acara formal.",
  Koko: "Baju Koko dengan desain modern dan bahan premium. Nyaman untuk shalat maupun kegiatan sehari-hari.",
  Vest: "Vest elegan dengan potongan yang presisi. Cocok dipadukan dengan thobe atau koko untuk tampilan lebih berkelas.",
  Kabak: "Kabak premium dengan kualitas terbaik. Tersedia dalam berbagai pilihan.",
  "Cover & Hanger": "Cover dan hanger premium untuk menjaga busana tetap rapi dan terlindungi.",
};

/** Accordion info — sama seperti blok "Detail bahan / Panduan ukuran / Pengiriman" di katalog. */
function InfoAccordionItem({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,.03)", border: "1px solid rgba(0,0,0,.15)" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="text-[13px] font-medium font-ui" style={{ color: "var(--espresso)" }}>{title}</span>
        <ChevronDown size={16} strokeWidth={1.5} className="shrink-0 transition-transform duration-300" style={{ color: "var(--stone)", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="px-4 pb-3.5">
          <p className="text-[12.5px] leading-relaxed font-ui" style={{ color: "var(--stone)" }}>{children}</p>
        </div>
      )}
    </div>
  );
}

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

  const gallery = product ? openOrderGallery(product, draft.color, series?.name ?? null) : [];
  const activePhoto = Math.min(photo, Math.max(gallery.length - 1, 0));
  const currentPhoto = gallery[activePhoto] ?? "";

  // Produk/warna/series berganti → harga & foto ikut menyesuaikan.
  useEffect(() => {
    setPrice(draft.price);
    setPhoto(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.productId, draft.color, series?.name]);

  // Ukuran terpilih harus tetap ada di varian yang baru.
  useEffect(() => {
    if (sizes.includes(draft.size)) return;
    onChange({ size: sizes.includes("M") ? "M" : sizes[0] ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.productId, draft.color, series?.name, sizes.join("|")]);

  if (!product) return null;

  const colorLabel = openOrderColorLabel(product, draft.color);
  const finalPrice = cypEnabled ? (price >= minimum ? price : minimum) : minimum;
  const priceTooLow = cypEnabled && price < minimum;
  const lineTotal = finalPrice * draft.quantity;
  const description = product.description || DESCRIPTION_BY_CATEGORY[product.category] || "";

  function handlePriceInput(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    const value = digits ? parseInt(digits, 10) : 0;
    setPrice(value);
    if (value >= minimum) onChange({ price: value });
  }

  function handleAdd() {
    if (priceTooLow) return;
    onAdd({ ...draft, price: finalPrice, series: series?.name ?? "" });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-14">
      {/* ── Galeri ── */}
      <div>
        <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden" style={{ background: "#e5e5e5" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(232,223,209,.5),rgba(0,0,0,.28))" }} />
          {currentPhoto && (
            <img
              key={currentPhoto}
              src={cloudinaryUrl(currentPhoto, { width: 1200 })}
              alt={`${product.name} ${colorLabel}${series ? ` — ${series.name}` : ""}`}
              className="absolute inset-0 w-full h-full object-contain"
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
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 z-10"
                style={{ background: "rgba(248,246,242,.85)", backdropFilter: "blur(6px)" }}
              >
                <ChevronLeft size={18} style={{ color: "var(--espresso)" }} />
              </button>
              <button
                type="button"
                onClick={() => setPhoto((i) => (i + 1) % gallery.length)}
                aria-label="Foto berikutnya"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 z-10"
                style={{ background: "rgba(248,246,242,.85)", backdropFilter: "blur(6px)" }}
              >
                <ChevronRight size={18} style={{ color: "var(--espresso)" }} />
              </button>
            </>
          )}
        </div>

        {/* Titik navigasi */}
        {gallery.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {gallery.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setPhoto(i)}
                aria-label={`Foto ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{ background: i === activePhoto ? "var(--gold)" : "rgba(0,0,0,.4)", width: i === activePhoto ? 16 : 6, height: 6 }}
              />
            ))}
          </div>
        )}

        {/* Thumbnail */}
        {gallery.length > 1 && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {gallery.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setPhoto(i)}
                aria-label={`Foto ${i + 1}`}
                className="relative aspect-square rounded-lg overflow-hidden transition-all duration-200"
                style={{ boxShadow: i === activePhoto ? "0 0 0 2px var(--espresso)" : "0 0 0 1px rgba(0,0,0,.3)" }}
              >
                <img src={cloudinaryUrl(src, { width: 300 })} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div>
        <p className="text-[11px] tracking-[0.28em] uppercase font-ui mb-3" style={{ color: "var(--gold)" }}>
          Detail Produk
        </p>
        <h2 className="text-[1.7rem] sm:text-[2rem] lg:text-[2.2rem] font-semibold leading-tight mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
          {product.name}
          {product.kain ? (
            <span style={{ color: "var(--gold)" }}> — Kain {product.kain}</span>
          ) : series ? (
            <span style={{ color: "var(--gold)" }}> — {series.name}</span>
          ) : colorLabel ? (
            <span style={{ color: "var(--gold)" }}> — {colorLabel}</span>
          ) : null}
        </h2>
        <p className="text-[13px] font-ui mb-6" style={{ color: "var(--stone)" }}>
          {product.kain && (
            <>
              Jenis kain <span style={{ color: "var(--gold)" }}>{product.kain}</span>
              {" · "}
            </>
          )}
          <span style={{ color: "var(--gold)" }}>{product.category}</span>
          <span>{product.weight ? ` · ${product.weight >= 1000 ? (product.weight / 1000).toFixed(1) + " kg" : product.weight + " g"}` : " · ready stock"}</span>
        </p>

        {/* Series — hanya produk yang punya series (mis. Thobe) */}
        {product.series.length > 0 && (
          <div className="mb-6">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-[var(--muted)] mb-2.5">Pilih Series</p>
            <div className="flex flex-wrap gap-2">
              {product.series.map((option) => {
                const active = option.name === series?.name;
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => onChange({ series: option.name, price: option.price })}
                    className="px-4 py-2 rounded-lg text-[12.5px] transition"
                    style={{
                      background: active ? "var(--espresso)" : "var(--cream-bright)",
                      color: active ? "var(--cream)" : "var(--coffee)",
                      border: `1px solid ${active ? "var(--espresso)" : "rgba(0,0,0,.3)"}`,
                    }}
                  >
                    <span className="font-medium">{option.name}</span>
                    <span className="ml-1.5" style={{ color: active ? "rgba(248,245,241,.75)" : "var(--gold)" }}>
                      mulai dari {rupiah(option.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Warna */}
        {product.colors.length > 0 && product.colors.some((c) => c && c !== "default") && (
          <div className="mb-6">
            <p className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium mb-3" style={{ color: "var(--espresso)" }}>
              Pilih Warna
            </p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange({ color })}
                  className="px-3 py-2 text-[12px] font-ui rounded-sm transition-all duration-200"
                  style={{
                    background: color === draft.color ? "var(--espresso)" : "transparent",
                    color: color === draft.color ? "var(--cream)" : "var(--coffee)",
                    border: `1px solid ${color === draft.color ? "var(--espresso)" : "rgba(0,0,0,.3)"}`,
                  }}
                >
                  {openOrderColorLabel(product, color)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ukuran */}
        <div className="mb-6">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-[var(--muted)] mb-2.5">Pilih Ukuran</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onChange({ size })}
                className="px-4 py-2 rounded-lg text-[12.5px] transition"
                style={{
                  background: size === draft.size ? "var(--espresso)" : "var(--cream-bright)",
                  color: size === draft.size ? "var(--cream)" : "var(--coffee)",
                  border: `1px solid ${size === draft.size ? "var(--espresso)" : "rgba(0,0,0,.3)"}`,
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Kartu harga — gaya Open Order: Harga Minimum + input harga bebas (Create Your Price).
            Quick-pick ala katalog sengaja TIDAK dipakai di sini. */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: "var(--cream-bright)", border: "1px solid rgba(0,0,0,.25)" }}>
          {cypEnabled ? (
            <div>
              <p className="text-[11px] tracking-[0.1em] uppercase font-ui mb-1" style={{ color: "var(--stone)" }}>Harga Minimum</p>
              <p className="text-[20px] sm:text-[22px] font-ui font-semibold mb-1" style={{ color: "var(--gold)" }}>
                {rupiah(minimum)}
              </p>
              <p className="text-[12px] font-ui" style={{ color: "var(--stone)" }}>
                Create Your Price — pilih harga terbaikmu{series ? ` untuk series ${series.name}` : ""}.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-3" style={{ border: "1px solid rgba(0,0,0,.35)" }}>
                <span className="text-[13.5px] font-semibold" style={{ color: "var(--stone)" }}>Rp</span>
                <input
                  value={price ? price.toLocaleString("id-ID") : ""}
                  onChange={(e) => handlePriceInput(e.target.value)}
                  inputMode="numeric"
                  aria-label="Harga pilihanmu"
                  placeholder={minimum.toLocaleString("id-ID")}
                  className="w-full bg-transparent text-[15px] font-semibold tabular-nums outline-none"
                  style={{ color: "var(--espresso)" }}
                />
              </div>
              {priceTooLow && (
                <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: "#e74c3c" }}>
                  Harga minimum{series ? ` untuk series ${series.name}` : ""} adalah {rupiah(minimum)}.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[11px] tracking-[0.1em] uppercase font-ui mb-1" style={{ color: "var(--stone)" }}>Harga</p>
              <p className="text-[20px] sm:text-[22px] font-ui font-semibold" style={{ color: "var(--gold)" }}>
                {rupiah(minimum)}
              </p>
            </div>
          )}
        </div>

        {description && (
          <p className="text-sm sm:text-[15px] leading-relaxed font-ui mb-8" style={{ color: "rgba(0,0,0,.8)" }}>
            {description}
          </p>
        )}

        <div className="h-px mb-7" style={{ background: "rgba(0,0,0,.2)" }} />

        {/* Jumlah */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium" style={{ color: "var(--espresso)" }}>Jumlah</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChange({ quantity: Math.max(1, draft.quantity - 1) })}
              className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-105"
              style={{ border: "1px solid rgba(0,0,0,.3)", color: "var(--espresso)" }}
              aria-label="Kurangi jumlah"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>{draft.quantity}</span>
            <button
              type="button"
              onClick={() => onChange({ quantity: draft.quantity + 1 })}
              className="w-9 h-9 flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-105"
              style={{ border: "1px solid rgba(0,0,0,.3)", color: "var(--espresso)" }}
              aria-label="Tambah jumlah"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Total + aksi */}
        <div className="flex items-end justify-between mb-4">
          <span className="text-[11px] sm:text-[12px] tracking-[0.12em] uppercase font-ui font-medium" style={{ color: "var(--espresso)" }}>
            Total ({draft.quantity} pcs)
          </span>
          <span className="text-[1.25rem] font-ui font-semibold tabular-nums" style={{ color: "var(--gold)" }}>
            {rupiah(lineTotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={priceTooLow}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-sm text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01] hover:shadow-lg disabled:opacity-40 disabled:hover:scale-100"
          style={{ background: "var(--espresso)", color: "white", boxShadow: "0 8px 28px -8px rgba(0,0,0,.35)" }}
        >
          Tambah ke Pesanan
        </button>

        {/* Info tambahan */}
        <div className="mt-7 space-y-2.5">
          <InfoAccordionItem title="Detail bahan & perawatan">
            Kain premium dengan sirkulasi udara baik, tidak menerawang, dan jatuh rapi. Cuci dengan air dingin, setrika suhu sedang, jangan gunakan pemutih.
          </InfoAccordionItem>
          <InfoAccordionItem title="Panduan ukuran">
            Tersedia ukuran S–XXL. Ukur lingkar dada dan panjang badan, lalu sesuaikan dengan tabel ukuran. Ragu? Chat kami via WhatsApp.
          </InfoAccordionItem>
          <InfoAccordionItem title="Pengiriman & pengembalian">
            Dikirim 1–2 hari kerja setelah pembayaran. Salah ukuran bisa ditukar maksimal 7 hari setelah barang diterima.
          </InfoAccordionItem>
        </div>
      </div>
    </div>
  );
}
