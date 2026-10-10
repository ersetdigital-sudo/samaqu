"use client";

/**
 * Langkah 6 — pesanan berhasil dibuat (menunggu konfirmasi admin).
 */

import Link from "next/link";
import { Check } from "lucide-react";
import { BADGE_BG, BADGE_INK, FIELD_BG, INK, MUTED, PrimaryButton } from "./ui";

export default function StepSuccess({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full" style={{ background: INK }}>
        <Check size={34} strokeWidth={2.5} color="#ffffff" />
      </div>

      <h2 className="mt-6 text-[21px] font-bold">Pesanan Berhasil Dikirim!</h2>
      <p className="mt-2 text-[13px]" style={{ color: MUTED }}>
        Terima kasih, pesanan kamu sudah kami terima.
      </p>

      <div className="mt-7 rounded-2xl p-5 text-left" style={{ background: FIELD_BG, border: "1px solid rgba(201,183,156,.25)" }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            Order ID
          </span>
          <span className="text-[13.5px] font-bold tabular-nums">{orderNumber}</span>
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-4">
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            Status
          </span>
          <span
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: BADGE_BG, color: BADGE_INK }}
          >
            Menunggu Konfirmasi Admin
          </span>
        </div>
      </div>

      <p className="mt-6 text-[12.5px] leading-relaxed" style={{ color: MUTED }}>
        Admin akan menghubungi kamu melalui WhatsApp untuk memastikan detail pesanan sebelum invoice diterbitkan.
      </p>

      <div className="mt-7 space-y-4">
        <Link href="/akun/pesanan" className="block">
          <PrimaryButton>Lihat Pesanan Saya</PrimaryButton>
        </Link>
        <Link
          href="/"
          className="inline-block text-[12.5px] font-semibold underline decoration-1 underline-offset-4 transition-opacity duration-200 hover:opacity-70"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
