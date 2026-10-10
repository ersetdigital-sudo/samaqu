"use client";

/**
 * Langkah 3 — keranjang: ubah jumlah, hapus item, dan pilih Extra Cover & Hanger.
 */

import { Trash2 } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import type { Product } from "@/lib/katalog-data";
import { money, openOrderImage } from "@/lib/open-order-catalog";
import { OPEN_ORDER_ADDON } from "@/lib/open-order-config";
import { findOpenOrderProduct, type OpenOrderProduct } from "@/lib/open-order-offering";
import type { CartLine } from "./types";
import { Counter, FIELD_BG, GhostButton, LINE, MUTED, PrimaryButton, SummaryRow } from "./ui";

/**
 * Gaya kartu Extra Cover & Hanger (arah desain "Slab Espresso"): slab espresso penuh,
 * garis emas yang ter-gambar saat kartu tampil, ditutup cap centang kecil di kanan bawah.
 * Ditulis sebagai CSS scoped, bukan token bersama di `ui.tsx`, supaya warna gelap ini
 * hanya dipakai bagian tersebut.
 */
const ADDON_CSS = `
.oo-addon{box-sizing:border-box;height:48px;position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;overflow:hidden;padding:0 15px;background:#26211D;color:#F6EFE3;border:1px solid #3A322B;border-radius:9px;box-shadow:0 5px 14px rgba(38,33,29,.16);font-family:var(--font-inter),system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;text-align:left;transition:background-color .2s ease,border-color .2s ease,box-shadow .2s ease}
.oo-addon::before{content:"";position:absolute;left:0;bottom:0;width:calc(100% - 48px);height:1px;background:#C9A15A;transform-origin:left;animation:oo-addon-trace .9s cubic-bezier(.22,.8,.3,1) both}
.oo-addon::after{content:"";position:absolute;right:15px;bottom:3px;width:7px;height:4px;border-left:1px solid #C9A15A;border-bottom:1px solid #C9A15A;transform:rotate(-45deg);animation:oo-addon-seal .35s ease .85s both}
.oo-addon-copy{min-width:0;display:flex;flex-direction:column;gap:1px}
.oo-addon-name{font-family:var(--font-cormorant),Georgia,"Times New Roman",serif;font-size:15px;line-height:1.05;font-weight:400;white-space:nowrap;letter-spacing:.005em}
.oo-addon-caption{font-size:8px;line-height:1.2;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#C9A15A;white-space:nowrap}
.oo-addon-price{flex:none;padding-right:12px;color:#D7B46D;font-family:var(--font-cormorant),Georgia,"Times New Roman",serif;font-size:13px;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap}
.oo-addon:hover{background:#302923;border-color:#C9A15A;box-shadow:0 6px 18px rgba(38,33,29,.22)}
.oo-addon:active{background:#201C19;box-shadow:inset 0 2px 5px rgba(0,0,0,.22)}
.oo-addon:focus-visible{outline:2px solid #C9A15A;outline-offset:2px}
@keyframes oo-addon-trace{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes oo-addon-seal{from{opacity:0;transform:translateX(-3px) rotate(-45deg)}to{opacity:1;transform:translateX(0) rotate(-45deg)}}
`;

export function lineName(line: CartLine, products: OpenOrderProduct[]): string {
  return findOpenOrderProduct(products, line.productId)?.name ?? line.productId;
}

export function lineImage(line: CartLine, products: OpenOrderProduct[], catalog: Product[]): string {
  const product = findOpenOrderProduct(products, line.productId);
  return product ? openOrderImage(product, line.color, catalog) : "";
}

export default function StepCart({
  lines,
  products,
  catalog,
  subtotal,
  extraCover,
  onToggleExtra,
  onQuantity,
  onRemove,
  onContinue,
  onShopMore,
}: {
  lines: CartLine[];
  products: OpenOrderProduct[];
  catalog: Product[];
  subtotal: number;
  extraCover: boolean;
  onToggleExtra: (next: boolean) => void;
  onQuantity: (key: number, quantity: number) => void;
  onRemove: (key: number) => void;
  onContinue: () => void;
  onShopMore: () => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-[14px] font-semibold">Keranjang masih kosong</p>
        <p className="mt-2 text-[12.5px]" style={{ color: MUTED }}>
          Pilih produk Open Order dulu untuk membuat pesanan.
        </p>
        <div className="mx-auto mt-6 max-w-xs">
          <PrimaryButton onClick={onShopMore}>Lihat Produk</PrimaryButton>
        </div>
      </div>
    );
  }

  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div>
      <div className="space-y-3">
        {lines.map((line) => {
          const image = lineImage(line, products, catalog);
          return (
            <div key={line.key} className="flex gap-4 rounded-2xl p-4" style={{ border: `1px solid ${LINE}`, background: FIELD_BG }}>
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl" style={{ background: "#e8dfd1" }}>
                {image && (
                  <img src={cloudinaryUrl(image, { width: 300 })} alt={lineName(line, products)} className="h-full w-full object-cover" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{lineName(line, products)}</p>
                    <p className="mt-0.5 text-[11.5px]" style={{ color: MUTED }}>
                      {line.color} · {line.size} · Series {line.series}
                    </p>
                    <p className="mt-1 text-[12.5px] tabular-nums" style={{ color: MUTED }}>
                      {money(line.price)} / pcs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    aria-label={`Hapus ${lineName(line, products)}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-200 hover:bg-white"
                    style={{ color: MUTED }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <Counter value={line.quantity} onChange={(quantity) => onQuantity(line.key, quantity)} />
                  <span className="text-[14px] font-semibold tabular-nums">{money(line.price * line.quantity)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Extra Cover & Hanger — slab espresso premium. */}
      <style>{ADDON_CSS}</style>
      <button
        type="button"
        onClick={() => onToggleExtra(!extraCover)}
        aria-pressed={extraCover}
        className="oo-addon mt-4 w-full"
      >
        <span className="oo-addon-copy">
          <span className="oo-addon-name">{OPEN_ORDER_ADDON.name}</span>
          <span className="oo-addon-caption">Opsional, per pesanan</span>
        </span>
        <span className="oo-addon-price">+{money(OPEN_ORDER_ADDON.price)}</span>
      </button>

      {/* Ringkasan */}
      <div className="mt-6 rounded-2xl p-5" style={{ background: FIELD_BG, border: "1px solid rgba(201,183,156,.25)" }}>
        <SummaryRow label={`Subtotal (${totalQty} produk)`} value={money(subtotal)} strong />
        <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: MUTED }}>
          Ongkir dihitung otomatis dari kecamatan tujuan di langkah berikutnya.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <PrimaryButton onClick={onContinue}>Lanjut ke Data Pemesanan</PrimaryButton>
        <GhostButton onClick={onShopMore}>Lanjut belanja produk lain</GhostButton>
      </div>
    </div>
  );
}
