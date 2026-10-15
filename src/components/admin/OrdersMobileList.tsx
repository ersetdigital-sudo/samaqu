"use client";

/**
 * Daftar pesanan versi kartu untuk layar kecil (di bawah `lg`) — dipakai panel
 * "Order Management" di kedua dashboard admin, supaya tabel (min-w 860px) tidak
 * dipaksa masuk ke layar ~370px.
 *
 * Tata letaknya mengikuti kartu pesanan Shopee Seller Centre: nomor pesanan + pill **tahap**
 * (Belum Bayar / Perlu Dikirim / Dikirim / … dari `src/lib/order-flow.ts`, bukan nama status
 * mentah), nama pembeli, tanggal · total, lalu **baris pengiriman** (kurir + nomor resi) supaya
 * pesanan yang resinya belum dibuat langsung kelihatan tanpa membuka drawer. Kartunya sendiri
 * membuka detail lewat `onSelect` — **tidak ada tombol aksi di kartu**: "Atur Pesanan" /
 * "Cetak Label" / "Hubungi Pembeli" hanya ada di drawer detail (permintaan pemilik: "atur
 * pesanan hubungi pembeli di detail aja").
 *
 * Komponen ini menyembunyikan dirinya sendiri di layar besar (`lg:hidden`); di sebelahnya
 * pemanggil tetap merender tabelnya (`hidden lg:table`).
 */
import { ChevronRight, Truck } from "lucide-react";
import { ORDER_STAGE_LABEL, ORDER_STAGE_STYLE, SHIPPING_STATUS_STYLE, orderStage, shippingLine, shippingStatusOf } from "@/lib/order-flow";

export interface OrderSummary {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  /** Baris pengiriman; opsional supaya pemakai lama tanpa field ini tetap jalan. */
  shipping_method?: string | null;
  awb_no?: string | null;
  /** Status pengiriman terpisah dari status pesanan. */
  shipping_status?: string | null;
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
}: {
  orders: T[];
  emptyText: string;
  /** Kalau diberikan, badan kartu jadi tombol yang membuka detail pesanan. */
  onSelect?: (order: T) => void;
}) {
  if (orders.length === 0) {
    return <p className="lg:hidden px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>{emptyText}</p>;
  }

  return (
    <div className="lg:hidden">
      {orders.map((o) => {
        const stage = orderStage(o);
        const st = ORDER_STAGE_STYLE[stage];
        const ship = shippingLine(o);

        const body = (
          <>
            <div className="flex items-start gap-2">
              <span className="text-[13px] font-semibold truncate" style={{ color: "var(--espresso)" }}>{o.order_number}</span>
              <span className="badge ml-auto shrink-0" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                {ORDER_STAGE_LABEL[stage]}
              </span>
            </div>
            <p className="text-sm mt-1 truncate" style={{ color: "var(--espresso)" }}>{o.customer_name}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{tanggal(o.created_at)} · {rupiah(o.total)}</p>
            {/* Baris pengiriman: kurir + resi. "Resi belum dibuat" disorot karena itu pesanan
                yang menunggu admin menekan "Atur Pesanan" (tombolnya ada di drawer detail). */}
            <div className="flex items-center gap-1.5 mt-1.5 min-w-0" style={{ color: ship.awaiting ? "#c2410c" : "var(--text-muted)" }}>
              <Truck size={13} strokeWidth={1.9} className="shrink-0" />
              <span className="text-xs font-medium truncate">{ship.courier} · {ship.resi}</span>
            </div>
            {/* Status pengiriman (mis. "Menunggu Pickup") — dipisah dari pill tahap pesanan.
                Pesanan dibatalkan → "Dibatalkan" biar konsisten. */}
            {ship.cancelled ? (
              <span className="badge mt-1.5" style={{ background: ORDER_STAGE_STYLE.dibatalkan.bg, color: ORDER_STAGE_STYLE.dibatalkan.color, border: `1px solid ${ORDER_STAGE_STYLE.dibatalkan.border}` }}>
                Dibatalkan
              </span>
            ) : (() => {
              const ss = shippingStatusOf(o);
              if (!ss) return null;
              const st = SHIPPING_STATUS_STYLE[ss];
              return (
                <span className="badge mt-1.5" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                  {ship.status}
                </span>
              );
            })()}
          </>
        );

        return (
          <div key={o.id} className="px-5 py-4" style={{ borderTop: "1px solid #f1f1f3" }}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(o)} className="w-full flex items-start gap-2 text-left">
                <div className="min-w-0 flex-1">{body}</div>
                <ChevronRight size={18} strokeWidth={1.8} className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
              </button>
            ) : (
              <div className="w-full">{body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
