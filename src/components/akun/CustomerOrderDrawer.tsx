"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import OrderDetailPanel from "@/components/ops/transaksi/OrderDetailPanel";
import { useSafeLocale } from "@/lib/safe-i18n";
import { sourceLabel } from "@/lib/transaksi";

type CustomerOrder = Record<string, any>;

/**
 * Drawer detail pesanan customer — layout sama dengan drawer admin/ops:
 * overlay gelap + panel kanan 448px, isi OrderDetailPanel tema mono.
 */
export default function CustomerOrderDrawer({
  order,
  onClose,
}: {
  order: CustomerOrder | null;
  onClose: () => void;
}) {
  const locale = useSafeLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!order) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [order, onClose]);

  // Portal ke body: halaman /akun dibungkus AkunPageTransition yang memakai
  // transform/filter, sehingga `fixed` di dalamnya terkurung di area konten
  // (drawer jadi pendek dan bergeser). Portal mengembalikannya ke viewport.
  if (!order || !mounted) return null;

  const panelOrder = {
    ...order,
    items: order.order_items || [],
    kota: order.shipping_city,
    notes: order.shipping_notes,
    shipping_kecamatan: order.shipping_kecamatan,
    shipping_province: order.shipping_province,
  };

  const latestTracking = order.tracking_status_text
    ? {
        status: order.tracking_status_text,
        location: order.tracking_city,
        dateTime: order.tracking_updated_at || "",
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Detail pesanan">
      <button
        type="button"
        aria-label="Tutup detail pesanan"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[448px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {sourceLabel(order.source)}
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold text-slate-900">Detail Pesanan</h2>
            <p className="mt-0.5 font-mono text-xs font-semibold text-slate-500">{order.order_number}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <OrderDetailPanel
            order={panelOrder}
            theme="mono"
            latestTracking={latestTracking}
            trackingState="done"
          />
        </div>

        <footer className="border-t border-slate-200 px-5 py-4">
          <Link
            href={`/${locale}/akun/pesanan/${order.order_number}/lacak`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Lacak Resi
          </Link>
        </footer>
      </aside>
    </div>,
    document.body
  );
}
