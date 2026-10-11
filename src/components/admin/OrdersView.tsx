"use client";

/**
 * Panel "Order Management" — daftar pesanan dashboard admin, disusun ala Shopee Seller Centre.
 *
 * Dulu seluruh panel ini inline di `src/app/admin/page.tsx` (dan file itu sudah ~1000 baris);
 * sekarang alur pesanan tinggal di satu komponen: tab sumber (Pesanan Website / Open Order) →
 * kotak cari → tab tahap → daftar. Dipakai **kedua** dashboard admin karena `/admin` dan
 * `/id/admin` merender `src/app/admin/page.tsx` yang sama.
 *
 * Yang bikin "setara Shopee": daftar dipecah per **tahap** (Belum Bayar / Perlu Dikirim /
 * Dikirim / Selesai / Dibatalkan) yang diturunkan `src/lib/order-flow.ts` dari status + resi,
 * bukan per nama status mentah; tiap baris membawa **aksi kontekstual** yang harus dikerjakan
 * admin (Atur Pesanan saat resi belum dibuat, Cetak Label saat paket jalan, Hubungi Pembeli saat
 * belum dibayar) supaya admin tidak perlu membuka tiap drawer. Tidak ada status baru yang
 * ditulis ke database dan query-nya tidak berubah — `arrangeOrder` tetap milik halaman admin
 * (konfirmasi + PATCH `/api/admin/orders` action `createJnt`) dan tetap digerbangi status
 * `diproses` di server.
 */
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import OrdersMobileList from "@/components/admin/OrdersMobileList";
import {
  ORDER_STAGE_LABEL,
  ORDER_STAGE_STYLE,
  ORDER_STAGE_TABS,
  matchesStage,
  orderStage,
  shippingLine,
  stageNeedsAdminAction,
  type OrderStageFilter,
} from "@/lib/order-flow";

/** Field yang benar-benar dipakai daftar; `Order` di halaman admin memenuhinya. */
export interface AdminOrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string | null;
  customer_whatsapp?: string | null;
  shipping_method?: string | null;
  awb_no?: string | null;
  status: string;
  total: number;
  created_at: string;
}

function money(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function tanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function waLink(value?: string | null) {
  const digits = (value || "").replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

/** Pill tahap — istilah yang sama dengan tab di atasnya, jadi tab dan baris tidak beda bahasa. */
function StageBadge({ order }: { order: AdminOrderRow }) {
  const stage = orderStage(order);
  const s = ORDER_STAGE_STYLE[stage];
  return (
    <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {ORDER_STAGE_LABEL[stage]}
    </span>
  );
}

export default function OrdersView({
  orders,
  onSelect,
  onArrangeOrder,
}: {
  orders: AdminOrderRow[];
  onSelect: (order: AdminOrderRow) => void;
  /** "Atur Pesanan" — buat resi J&T; konfirmasi + PATCH ditangani halaman admin. */
  onArrangeOrder: (order: AdminOrderRow) => void;
}) {
  const [orderSource, setOrderSource] = useState<"website" | "open">("website");
  const [orderFilter, setOrderFilter] = useState<OrderStageFilter>("semua");
  const [orderSearch, setOrderSearch] = useState("");

  // Pesanan Open Order (Create Your Price) bernomor `CYO-`; sisanya pesanan checkout website.
  const sourceOrders = orders.filter((o) =>
    orderSource === "open" ? o.order_number.startsWith("CYO-") : !o.order_number.startsWith("CYO-")
  );
  // Kotak "Cari pesanan": cocokkan nomor pesanan, nama pelanggan, email, atau nomor WhatsApp.
  // Pencarian dan tab tahap dipakai bersamaan (AND), jadi admin bisa menyaring dua arah.
  const orderQuery = orderSearch.trim().toLowerCase();
  const searchedOrders = orderQuery
    ? sourceOrders.filter((o) =>
        [o.order_number, o.customer_name, o.customer_email, o.customer_whatsapp]
          .some((v) => (v || "").toLowerCase().includes(orderQuery))
      )
    : sourceOrders;
  const visibleOrders = searchedOrders.filter((o) => matchesStage(o, orderFilter));
  // Pesan kosong dibedakan: "pencarian tidak ketemu" vs "belum ada pesanan sama sekali".
  const ordersEmptyText = orderQuery
    ? "Tidak ada pesanan yang cocok dengan pencarian"
    : orderSource === "open" ? "Belum ada pesanan Open Order" : "Tidak ada pesanan";
  // Jumlah per tahap ikut tab sumber **dan** kotak pencarian, jadi angka di tab selalu cocok
  // dengan daftar di bawahnya (bukan query terpisah).
  const stageCounts = useMemo(() => {
    const counts: Partial<Record<string, number>> = {};
    for (const o of searchedOrders) {
      const s = orderStage(o);
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [searchedOrders]);

  // Judul ikut tab yang aktif, mis. "Pesanan Perlu Dikirim" / "Open Order Selesai".
  const listTitle = orderSource === "open"
    ? orderFilter === "semua" ? "Semua Open Order" : `Open Order ${ORDER_STAGE_LABEL[orderFilter]}`
    : orderFilter === "semua" ? "Semua Pesanan" : `Pesanan ${ORDER_STAGE_LABEL[orderFilter]}`;

  /** Aksi kontekstual per pesanan — ala tombol utama di kartu pesanan Shopee Seller Centre. */
  function rowAction(o: AdminOrderRow) {
    const stage = orderStage(o);
    if (stage === "perlu_dikirim") {
      return (
        <button
          type="button"
          onClick={() => onArrangeOrder(o)}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--gold)", color: "#fff" }}
        >
          Atur Pesanan
        </button>
      );
    }
    if (stage === "dikirim" && o.awb_no) {
      return (
        <a
          href={`/admin/label/${o.order_number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-[var(--bg-secondary)]"
          style={{ border: "1px solid #d4d4d8", color: "var(--espresso)" }}
        >
          Cetak Label
        </a>
      );
    }
    if (stage === "belum_bayar") {
      const wa = waLink(o.customer_whatsapp);
      if (wa) {
        return (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-[var(--bg-secondary)]"
            style={{ border: "1px solid #d4d4d8", color: "var(--espresso)" }}
          >
            Hubungi Pembeli
          </a>
        );
      }
    }
    return null;
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-4">
        <div className="flex gap-6" style={{ borderBottom: "1px solid #f1f1f3" }}>
          {([{ id: "website", label: "Pesanan Website" }, { id: "open", label: "Open Order" }] as const).map((t) => (
            <button key={t.id} onClick={() => setOrderSource(t.id)} className="pb-3 -mb-px text-sm font-medium transition-colors" style={{ color: orderSource === t.id ? "var(--espresso)" : "var(--text-muted)", borderBottom: orderSource === t.id ? "2px solid var(--gold)" : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5" style={{ borderBottom: "1px solid #f1f1f3" }}>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2 className="text-xl font-extrabold" style={{ color: "var(--fg)" }}>{listTitle}</h2>
          {/* Tab tahap: urutannya mengikuti pekerjaan penjual, dan "Perlu Dikirim" disorot
              (amber) selama masih ada pesanan yang menunggu resi dibuat. */}
          <div className="flex flex-wrap gap-2">
            {ORDER_STAGE_TABS.map((t) => {
              const active = orderFilter === t.key;
              const count = t.key === "semua" ? searchedOrders.length : stageCounts[t.key] || 0;
              const attention = !active && count > 0 && stageNeedsAdminAction(t.key);
              const style = active
                ? { background: "var(--gold)", color: "#fff", border: "1px solid var(--gold)" }
                : attention
                  ? { background: "#fff7ed", color: "#c2410c", border: "1px solid #ffedd5" }
                  : { background: "transparent", color: "var(--text-secondary)", border: "1px solid #d4d4d8" };
              return (
                <button
                  key={t.key}
                  onClick={() => setOrderFilter(t.key)}
                  className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={style}
                >
                  {t.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative mt-4 w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" size={16} strokeWidth={2} style={{ color: "var(--fg3)" }} />
          <input
            type="text"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Cari no. pesanan, nama, atau WhatsApp"
            aria-label="Cari pesanan"
            className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-shadow focus:ring-2"
            style={{ border: "1px solid var(--bd)", background: "var(--sub)", color: "var(--fg)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties}
          />
          {orderSearch && (
            <button
              type="button"
              onClick={() => setOrderSearch("")}
              aria-label="Bersihkan pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: "var(--fg3)" }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <OrdersMobileList
          orders={visibleOrders}
          onSelect={onSelect}
          emptyText={ordersEmptyText}
          renderActions={rowAction}
        />
        <table className="w-full text-sm min-w-[860px] hidden lg:table">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
              <th className="font-medium px-5 py-3">ID</th>
              <th className="font-medium px-5 py-3">Pelanggan</th>
              <th className="font-medium px-5 py-3">Tanggal</th>
              <th className="font-medium px-5 py-3">Total</th>
              <th className="font-medium px-5 py-3">Pengiriman</th>
              <th className="font-medium px-5 py-3">Status</th>
              <th className="font-medium px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((o) => {
              const ship = shippingLine(o);
              return (
                <tr key={o.id} className="cursor-pointer transition-colors hover:bg-[#fafafa]" style={{ borderTop: "1px solid #f1f1f3" }} onClick={() => onSelect(o)}>
                  <td className="px-5 py-3.5 font-semibold">{o.order_number}</td>
                  <td className="px-5 py-3.5">{o.customer_name}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>{tanggal(o.created_at)}</td>
                  <td className="px-5 py-3.5 font-semibold">{money(o.total)}</td>
                  <td className="px-5 py-3.5">
                    <span className="block text-xs" style={{ color: "var(--text-muted)" }}>{ship.courier}</span>
                    <span className="block text-xs font-semibold mt-0.5" style={{ color: ship.awaiting ? "#c2410c" : "var(--espresso)" }}>{ship.resi}</span>
                  </td>
                  <td className="px-5 py-3.5"><StageBadge order={o} /></td>
                  <td className="px-5 py-3.5 text-right">
                    {/* Klik di dalam sel aksi tidak boleh ikut membuka drawer barisnya. */}
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {rowAction(o)}
                      <button onClick={() => onSelect(o)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ border: "1px solid #d4d4d8", color: "var(--gold)" }}>Detail</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleOrders.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center" style={{ color: "var(--text-muted)" }}>{ordersEmptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
