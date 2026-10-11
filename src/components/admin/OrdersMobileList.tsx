"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Daftar pesanan versi kartu untuk layar kecil (di bawah `lg`) — dipakai panel
 * "Pesanan" dan kartu "Pesanan Terbaru" di kedua dashboard admin, supaya tabel
 * (min-w 720px / 500px) tidak dipaksa masuk ke layar ~370px.
 * Komponen ini menyembunyikan dirinya sendiri di layar besar (`lg:hidden`);
 * di sebelahnya dashboard tetap merender tabelnya (`hidden lg:block`).
 */
export interface OrderSummary {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

function rupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function tanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrdersMobileList<T extends OrderSummary>({
  orders,
  emptyText,
  onSelect,
  renderStatus,
}: {
  orders: T[];
  emptyText: string;
  /** Kalau diberikan, tiap kartu jadi tombol yang membuka detail pesanan. */
  onSelect?: (order: T) => void;
  renderStatus: (status: string) => ReactNode;
}) {
  if (orders.length === 0) {
    return <p className="lg:hidden px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>{emptyText}</p>;
  }

  return (
    <div className="lg:hidden">
      {orders.map((o) => {
        const body = (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold truncate" style={{ color: "var(--espresso)" }}>{o.order_number}</span>
                {renderStatus(o.status)}
              </div>
              <p className="text-sm mt-1 truncate" style={{ color: "var(--espresso)" }}>{o.customer_name}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{tanggal(o.created_at)} · {rupiah(o.total)}</p>
            </div>
            {onSelect && <ChevronRight size={18} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--text-muted)" }} />}
          </>
        );

        return onSelect ? (
          <button
            key={o.id}
            onClick={() => onSelect(o)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors active:bg-[rgba(248,246,242,.6)]"
            style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}
          >
            {body}
          </button>
        ) : (
          <div key={o.id} className="w-full flex items-center gap-3 px-5 py-4" style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
