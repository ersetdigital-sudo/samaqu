"use client";

/**
 * Langkah 6 — halaman terima kasih setelah pesanan Open Order terkirim.
 *
 * Isinya sengaja lengkap supaya customer tidak perlu bertanya lagi ke admin:
 * - konfirmasi pesanan sudah masuk (nomor pesanan + total + metode pembayaran),
 * - instruksi pembayaran langsung di halaman (rekening dari dashboard admin) + tombol salin,
 * - langkah selanjutnya (verifikasi → diserahkan ke J&T → resi dikirim),
 * - tautan ke halaman pesanan di akun.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, Copy } from "lucide-react";
import { money } from "@/lib/open-order-catalog";
import { normalizeMethodType, paymentMethodLabel, type PaymentMethodRow } from "@/lib/payment-methods";
import { PaymentIcon } from "@/lib/payment-icons";
import { useSafeLocale } from "@/lib/safe-i18n";
import { FIELD_BG, INK, LINE, MUTED, PrimaryButton } from "./ui";

const NEXT_STEPS: { title: string; detail: string }[] = [
  { title: "Kami cek pembayaran", detail: "Biasanya beberapa jam setelah bukti transfer masuk (hari kerja)." },
  { title: "Pesanan disiapkan", detail: "Setelah terverifikasi, pesanan diserahkan ke kurir J&T." },
  { title: "Nomor resi dikirim", detail: "Resi masuk ke WhatsApp kamu dan bisa dipantau dari halaman pesanan." },
];

export default function StepSuccess({
  orderNumber,
  total,
  customerName,
  paymentMethod,
  itemCount,
}: {
  orderNumber: string;
  total: number;
  customerName: string;
  /** Metode yang dipilih customer (baris `payment_methods`) — untuk instruksi pembayaran. */
  paymentMethod: PaymentMethodRow | null;
  itemCount: number;
}) {
  const locale = useSafeLocale();
  const [copied, setCopied] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);

  // Jam berjalan + hitungan 24 jam (sama seperti halaman sukses checkout).
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setTimeLeft((left) => (left > 0 ? left - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  const countdown = {
    h: pad(Math.floor(timeLeft / 3600)),
    m: pad(Math.floor((timeLeft % 3600) / 60)),
    s: pad(timeLeft % 60),
  };
  const jamSekarang = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  const firstName = (customerName || "").trim().split(/\s+/)[0] || "Kak";
  const type = normalizeMethodType(paymentMethod?.method_type);
  const isCod = type === "cod";
  const accountNumber = paymentMethod?.account_number || "";
  const needsTransfer = !isCod && (accountNumber || paymentMethod?.account_info || paymentMethod?.bank_name);

  function copy(value: string, key: string) {
    if (!value) return;
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(key);
        setTimeout(() => setCopied(""), 1800);
      })
      .catch(() => {});
  }

  return (
    <div className="pb-4">
      {/* ── Kepala ── */}
      <div className="text-center">
        <div
          className="mx-auto grid h-[76px] w-[76px] place-items-center rounded-full"
          style={{ background: INK, boxShadow: "0 18px 40px -18px rgba(0,0,0,.55)" }}
        >
          <Check size={36} strokeWidth={2.5} color="var(--cream)" />
        </div>

        <p className="mt-6 text-[10px] font-ui font-medium uppercase tracking-[0.28em]" style={{ color: "var(--gold)" }}>
          Open Order
        </p>
        <h2
          className="mt-2 text-[1.7rem] font-semibold leading-tight sm:text-[2rem]"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: INK }}
        >
          Terima kasih, {firstName}!
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed" style={{ color: MUTED }}>
          Pesanan kamu sudah kami terima{typeof itemCount === "number" && itemCount > 0 ? ` (${itemCount} produk)` : ""}. Rinciannya juga
          sudah kami kirim ke WhatsApp kamu.
        </p>
      </div>

      {/* ── Jam sekarang + hitungan waktu pembayaran ── */}
      {needsTransfer && (
        <div
          className="mt-7 rounded-2xl p-4 sm:p-5"
          style={{ background: FIELD_BG, border: `1px solid ${LINE}` }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2.5 text-[12.5px] font-ui font-medium" style={{ color: INK }}>
              <Clock size={16} style={{ color: "var(--gold-deep)" }} />
              Sekarang
            </span>
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: INK }}>
              {jamSekarang} WIB
            </span>
          </div>

          <div
            className="mt-3.5 flex items-center justify-between gap-4 pt-3.5"
            style={{ borderTop: `1px solid ${LINE}` }}
          >
            <span className="text-[12.5px] font-ui font-medium" style={{ color: INK }}>
              Selesaikan sebelum waktu habis
            </span>
            <span className="flex items-center gap-1.5 font-ui" style={{ fontVariantNumeric: "tabular-nums" }}>
              <span className="rounded-md px-2.5 py-1 text-base font-medium" style={{ background: INK, color: "var(--cream)" }}>
                {countdown.h}
              </span>
              <span style={{ color: MUTED }}>:</span>
              <span className="rounded-md px-2.5 py-1 text-base font-medium" style={{ background: INK, color: "var(--cream)" }}>
                {countdown.m}
              </span>
              <span style={{ color: MUTED }}>:</span>
              <span className="rounded-md px-2.5 py-1 text-base font-medium" style={{ background: INK, color: "var(--cream)" }}>
                {countdown.s}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── Instruksi pembayaran (bank / e-wallet / QRIS) ── */}
      {needsTransfer && (
        <div className="mt-7 rounded-2xl p-5 sm:p-6" style={{ background: FIELD_BG, border: `1px solid ${LINE}` }}>
          <p className="text-[11px] font-ui font-medium uppercase tracking-[0.14em]" style={{ color: INK }}>
            Langkah 1 — Selesaikan Pembayaran
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12.5px]" style={{ color: MUTED }}>
                Metode
              </span>
              <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: INK }}>
                <PaymentIcon type={paymentMethod?.icon || paymentMethod?.method_type || undefined} size={18} style={{ color: MUTED }} />
                {paymentMethodLabel(paymentMethod)}
              </span>
            </div>

            {paymentMethod?.bank_name && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[12.5px]" style={{ color: MUTED }}>
                  Bank
                </span>
                <span className="text-[13.5px] font-semibold" style={{ color: INK }}>
                  {paymentMethod.bank_name}
                </span>
              </div>
            )}

            {accountNumber && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[12.5px]" style={{ color: MUTED }}>
                  No. Rekening
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-bold tabular-nums" style={{ color: INK }}>
                    {accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(accountNumber, "rekening")}
                    aria-label="Salin nomor rekening"
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 hover:bg-white"
                    style={{ border: `1px solid ${LINE}`, color: INK }}
                  >
                    <Copy size={12} strokeWidth={2} />
                    {copied === "rekening" ? "Tersalin" : "Salin"}
                  </button>
                </span>
              </div>
            )}

            {paymentMethod?.account_name && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[12.5px]" style={{ color: MUTED }}>
                  Atas nama
                </span>
                <span className="text-[13.5px] font-semibold" style={{ color: INK }}>
                  {paymentMethod.account_name}
                </span>
              </div>
            )}

            {paymentMethod?.account_info && (
              <p className="text-[12.5px] leading-relaxed" style={{ color: INK }}>
                {paymentMethod.account_info}
              </p>
            )}

            {paymentMethod?.instructions && (
              <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>
                {paymentMethod.instructions}
              </p>
            )}

            <div className="flex items-end justify-between gap-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <span className="text-[12.5px]" style={{ color: MUTED }}>
                Jumlah transfer
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[1.35rem] font-ui font-bold tabular-nums" style={{ color: "var(--gold)" }}>
                  {money(total)}
                </span>
                <button
                  type="button"
                  onClick={() => copy(String(total), "total")}
                  aria-label="Salin jumlah transfer"
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 hover:bg-white"
                  style={{ border: `1px solid ${LINE}`, color: INK }}
                >
                  <Copy size={12} strokeWidth={2} />
                  {copied === "total" ? "Tersalin" : "Salin"}
                </button>
              </span>
            </div>
          </div>

          <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: MUTED }}>
            Sudah transfer? Balas chat WhatsApp dari kami dengan bukti transfernya — pesanan otomatis dibatalkan kalau belum ada
            pembayaran dalam <strong style={{ color: INK }}>24 jam</strong>.
          </p>
        </div>
      )}

      {isCod && (
        <div className="mt-7 rounded-2xl p-5 sm:p-6" style={{ background: FIELD_BG, border: `1px solid ${LINE}` }}>
          <p className="text-[11px] font-ui font-medium uppercase tracking-[0.14em]" style={{ color: INK }}>
            Bayar di Tempat (COD)
          </p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: MUTED }}>
            Belum perlu transfer ya — admin akan konfirmasi dulu lewat WhatsApp sebelum pesanan dikirim. Siapkan pembayaran sebesar{" "}
            <strong style={{ color: INK }}>{money(total)}</strong> saat paket diterima.
          </p>
        </div>
      )}

      {/* ── Ringkasan pesanan ── */}
      <div className="mt-5 rounded-2xl p-5 sm:p-6" style={{ background: "#ffffff", border: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            No. Pesanan
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold tabular-nums" style={{ color: INK }}>
              {orderNumber}
            </span>
            <button
              type="button"
              onClick={() => copy(orderNumber, "order")}
              aria-label="Salin nomor pesanan"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 hover:bg-[rgba(0,0,0,.05)]"
              style={{ border: `1px solid ${LINE}`, color: INK }}
            >
              <Copy size={12} strokeWidth={2} />
              {copied === "order" ? "Tersalin" : "Salin"}
            </button>
          </span>
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-4">
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            Total pesanan
          </span>
          <span className="text-[13.5px] font-bold tabular-nums" style={{ color: INK }}>
            {money(total)}
          </span>
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-4">
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            Status
          </span>
          <span className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ background: "rgba(0,0,0,.12)", color: "var(--gold-deep)" }}>
            Menunggu Konfirmasi Admin
          </span>
        </div>
      </div>

      {/* ── Langkah selanjutnya ── */}
      <div className="mt-7">
        <p className="text-[11px] font-ui font-medium uppercase tracking-[0.14em]" style={{ color: INK }}>
          Apa Selanjutnya?
        </p>
        <ol className="mt-4 space-y-4">
          {NEXT_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3.5">
              <span
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                style={{ background: FIELD_BG, border: `1px solid ${LINE}`, color: INK }}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold" style={{ color: INK }}>
                  {step.title}
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed" style={{ color: MUTED }}>
                  {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Aksi ── */}
      <div className="mt-8 space-y-3">
        <Link href={`/${locale}/akun/pesanan`} className="block">
          <PrimaryButton>Lihat Pesanan Saya</PrimaryButton>
        </Link>
        <Link
          href={`/${locale}/katalog`}
          className="block rounded-lg px-6 py-3.5 text-center text-[12px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 hover:bg-[rgba(0,0,0,.09)]"
          style={{ border: `1px solid ${LINE}`, color: INK }}
        >
          Belanja Lagi
        </Link>
      </div>

      <p className="mt-6 text-center text-[11.5px] leading-relaxed" style={{ color: MUTED }}>
        Simpan nomor pesanan ini ya. Kalau ada yang mau ditanyakan, balas aja chat WhatsApp dari kami.
      </p>
    </div>
  );
}
