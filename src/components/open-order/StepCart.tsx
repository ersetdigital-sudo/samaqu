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
 * Kartu Extra Cover & Hanger — mengikuti gaya katalog utama: kartu cream dengan spine emas
 * tipis di tepi kiri, nama serif espresso, dan cap centang emas yang terisi saat dipilih.
 * Ditulis sebagai CSS scoped, bukan token bersama di `ui.tsx`, supaya ornamen ini hanya
 * dipakai di bagian tersebut. Perilaku tombolnya tidak berubah (toggle pilih/batal).
 */
const ADDON_CSS = `
.oo-addon{box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;overflow:hidden;padding:15px 16px 15px 19px;background:linear-gradient(180deg,#FBF9F5,var(--cream-bright));color:var(--espresso);border:1px solid rgba(201,183,156,.45);border-radius:14px;box-shadow:0 1px 2px rgba(45,33,27,.04),0 12px 28px -24px rgba(45,33,27,.55);font-family:var(--font-inter),system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;text-align:left;transition:border-color .25s ease,box-shadow .25s ease,background-color .25s ease}
.oo-addon::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--gold-light),var(--gold-deep));transform:scaleY(.4);transform-origin:center;transition:transform .4s cubic-bezier(.22,.8,.3,1)}
.oo-addon:hover{border-color:rgba(181,140,74,.6);box-shadow:0 2px 5px rgba(45,33,27,.05),0 18px 36px -26px rgba(45,33,27,.6)}
.oo-addon:hover::before,.oo-addon.is-on::before{transform:scaleY(1)}
.oo-addon:active{background:#F3EDE3}
.oo-addon:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.oo-addon-copy{min-width:0;display:flex;flex-direction:column;gap:4px}
.oo-addon-name{font-family:var(--font-cormorant),Georgia,"Times New Roman",serif;font-size:17px;line-height:1.1;font-weight:500;letter-spacing:.005em;color:var(--espresso)}
.oo-addon-caption{font-size:9px;line-height:1;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-deep)}
.oo-addon-right{flex:none;display:flex;align-items:center;gap:12px}
.oo-addon-price{font-family:var(--font-cormorant),Georgia,"Times New Roman",serif;font-size:15px;line-height:1;color:var(--espresso);font-variant-numeric:tabular-nums;white-space:nowrap}
.oo-addon-seal{display:grid;place-items:center;width:24px;height:24px;border-radius:999px;border:1px solid rgba(181,140,74,.55);color:transparent;transition:background-color .25s ease,border-color .25s ease,color .25s ease,transform .25s ease}
.oo-addon.is-on{border-color:rgba(150,116,47,.7);background:linear-gradient(180deg,#FCF8F0,#F6EEE0);box-shadow:0 2px 6px rgba(45,33,27,.06),0 18px 36px -26px rgba(45,33,27,.6)}
.oo-addon.is-on .oo-addon-seal{background:var(--gold-deep);border-color:var(--gold-deep);color:#FBF7EF;transform:scale(1.04)}
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
  const addonTotal = extraCover ? OPEN_ORDER_ADDON.price : 0;
  const total = subtotal + addonTotal;

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

      {/* Extra Cover & Hanger — kartu cream premium bergaya katalog. */}
      <style>{ADDON_CSS}</style>
      <button
        type="button"
        onClick={() => onToggleExtra(!extraCover)}
        aria-pressed={extraCover}
        className={`oo-addon mt-4${extraCover ? " is-on" : ""}`}
      >
        <span className="oo-addon-copy">
          <span className="oo-addon-name">{OPEN_ORDER_ADDON.name}</span>
          <span className="oo-addon-caption">Opsional · per pesanan</span>
        </span>
        <span className="oo-addon-right">
          <span className="oo-addon-price">+{money(OPEN_ORDER_ADDON.price)}</span>
          <span className="oo-addon-seal" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </span>
      </button>

      {/* Ringkasan */}
      <div className="mt-6 rounded-2xl p-5" style={{ background: FIELD_BG, border: "1px solid rgba(201,183,156,.25)" }}>
        <div className="space-y-2.5">
          <SummaryRow label={`Subtotal (${totalQty} produk)`} value={money(subtotal)} />
          {extraCover && <SummaryRow label={OPEN_ORDER_ADDON.name} value={money(addonTotal)} />}
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
          <SummaryRow label="Total" value={money(total)} strong />
        </div>
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
