"use client";

/**
 * Langkah 5 — review pesanan: item, ongkir J&T, catatan untuk admin, lalu submit ke /api/open-order.
 */

import { cloudinaryUrl } from "@/lib/cloudinary";
import type { Product } from "@/lib/katalog-data";
import { money } from "@/lib/open-order-catalog";
import { OPEN_ORDER_ADDON } from "@/lib/open-order-config";
import type { CartLine, DraftShipping } from "./types";
import { lineImage, lineName } from "./StepCart";
import { DANGER, Field, MUTED, PrimaryButton, SummaryRow, TextArea } from "./ui";

export default function StepReview({
  lines,
  catalog,
  subtotal,
  extraCover,
  shipping,
  loadingOngkir,
  ongkirError,
  notes,
  onNotes,
  onSubmit,
  submitting,
  error,
}: {
  lines: CartLine[];
  catalog: Product[];
  subtotal: number;
  extraCover: boolean;
  shipping: DraftShipping | null;
  loadingOngkir: boolean;
  ongkirError: boolean;
  notes: string;
  onNotes: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}) {
  const addonTotal = extraCover ? OPEN_ORDER_ADDON.price : 0;
  const ongkir = shipping?.cost ?? 0;
  const total = subtotal + addonTotal + ongkir;

  return (
    <div>
      {/* Item */}
      <div className="space-y-3">
        {lines.map((line) => {
          const image = lineImage(line, catalog);
          return (
            <div key={line.key} className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5" style={{ border: "1px solid #e5e5e5" }}>
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg" style={{ background: "#f0f0f0" }}>
                {image && (
                  <img src={cloudinaryUrl(image, { width: 200 })} alt={lineName(line)} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{lineName(line)}</p>
                <p className="mt-0.5 text-[11.5px]" style={{ color: MUTED }}>
                  {line.color} · {line.size} · Series {line.series}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11.5px]" style={{ color: MUTED }}>
                  x{line.quantity}
                </p>
                <p className="text-[13px] font-semibold tabular-nums">{money(line.price * line.quantity)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ringkasan */}
      <div className="mt-6 space-y-2.5 rounded-2xl p-5" style={{ background: "#f0f0f0" }}>
        <SummaryRow label="Subtotal" value={money(subtotal)} />
        {extraCover && <SummaryRow label={OPEN_ORDER_ADDON.name} value={money(addonTotal)} />}
        <SummaryRow
          label={shipping ? `Ongkir (J&T — ${shipping.service})` : "Ongkir"}
          value={loadingOngkir ? "Menghitung…" : shipping ? money(ongkir) : "—"}
        />
        {ongkirError && (
          <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
            Ongkir otomatis belum tersedia — admin akan menghitung dan mengabari kamu.
          </p>
        )}
        <div className="pt-2.5" style={{ borderTop: "1px solid #dedede" }}>
          <SummaryRow label="Total" value={money(total)} strong />
        </div>
      </div>

      {/* Catatan */}
      <div className="mt-6">
        <Field label="Catatan untuk Admin">
          <TextArea
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            rows={3}
            placeholder="Misal: Warna sedikit lebih gelap"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 text-[12px]" style={{ color: DANGER }}>
          {error}
        </p>
      )}

      <div className="mt-6">
        <PrimaryButton onClick={onSubmit} disabled={submitting}>
          {submitting ? "Mengirim…" : "Submit Pesanan"}
        </PrimaryButton>
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: MUTED }}>
        Pesanan masuk sebagai menunggu konfirmasi admin. Admin akan menghubungi kamu lewat WhatsApp sebelum invoice
        diterbitkan.
      </p>
    </div>
  );
}
