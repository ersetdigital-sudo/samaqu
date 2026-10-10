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

      {/* Extra Cover & Hanger */}
      <button
        type="button"
        onClick={() => onToggleExtra(!extraCover)}
        className="mt-4 flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors duration-200"
        style={{ border: `1px solid ${extraCover ? "var(--espresso)" : LINE}` }}
      >
        <span>
          <span className="block text-[13px] font-semibold">{OPEN_ORDER_ADDON.name}</span>
          <span className="mt-0.5 block text-[11.5px]" style={{ color: MUTED }}>
            Opsional, per pesanan
          </span>
        </span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums">+{money(OPEN_ORDER_ADDON.price)}</span>
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
