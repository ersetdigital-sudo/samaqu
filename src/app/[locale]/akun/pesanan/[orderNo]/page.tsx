"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import { AkunHeader } from "@/components/akun/AkunShell";
import { statusInfo, tglJamID, rupiah } from "@/lib/akun-format";

interface OrderItem {
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  product_image?: string;
}
interface Order {
  id: string;
  order_number: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  status: string;
  created_at: string;
  awb_no?: string | null;
  updated_at?: string;
  order_items: OrderItem[];
}

function Timeline({ steps }: { steps: [string, string, string][] }) {
  return (
    <ol className="relative">
      {steps.map(([state, label, time], i) => {
        const last = i === steps.length - 1;
        const dot =
          state === "done" ? (
            <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: "#0f3d33" }}>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#fff" strokeWidth="3"><path d="m5 13 4 4 10-10" /></svg>
            </span>
          ) : state === "active" ? (
            <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: "#dcefe8" }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#0f3d33" }} />
            </span>
          ) : (
            <span className="w-6 h-6 rounded-full border-2 border-[#dfd8ca] bg-white" />
          );
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              {dot}
              {!last && <span className="w-px flex-1 my-1" style={{ background: state === "todo" ? "#e5ded1" : "#bcd3cb" }} />}
            </div>
            <div className={last ? "pb-0" : "pb-5"}>
              <p className={`font-bold text-sm md:text-base ${state === "todo" ? "text-[#9aa5a1]" : ""}`} style={state === "todo" ? undefined : { color: "#0f3d33" }}>{label}</p>
              <p className="text-[11px] md:text-xs text-[#8b9793] mt-0.5">{time}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function DetailPesananPage() {
  const params = useParams();
  const orderNo = decodeURIComponent(String(params.orderNo));
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      const all = (await getCustomerOrders(c.id)) as Order[];
      const found = all.find((o) => o.order_number === orderNo);
      if (found) setOrder(found);
      else setNotFound(true);
      setLoading(false);
    }
    init();
  }, [orderNo]);

  if (loading) {
    return (
      <>
        <AkunHeader title="Detail Pesanan" back="/akun/pesanan" />
        <div className="akun-card h-52 animate-pulse" />
      </>
    );
  }

  if (notFound || !order) {
    return (
      <>
        <AkunHeader title="Detail Pesanan" back="/akun/pesanan" />
        <div className="akun-card p-10 text-center">
          <p className="font-extrabold" style={{ color: "#0f3d33" }}>Pesanan tidak ditemukan</p>
          <Link href={to("/akun/pesanan")} className="inline-block mt-4 akun-btn-green px-6 py-3 rounded-full text-sm font-extrabold">Kembali</Link>
        </div>
      </>
    );
  }

  const sc = statusInfo(order.status);
  const confirmed = order.created_at;
  const steps: [string, string, string][] = [
    ["done", "Pesanan dikonfirmasi", tglJamID(confirmed)],
    ["done", "Pesanan diproses", tglJamID(order.updated_at || confirmed)],
    [order.status === "dikirim" || order.status === "selesai" ? "done" : "active", "Diserahkan ke kurir", order.awb_no ? `Resi ${order.awb_no}` : "Menunggu"],
    [order.status === "selesai" ? "done" : order.status === "dikirim" ? "active" : "todo", "Dalam perjalanan", order.status === "dikirim" ? "Sedang dikirim" : "-"],
    [order.status === "selesai" ? "done" : "todo", "Pesanan diterima", order.status === "selesai" ? "Selesai" : "Estimasi menyusul"],
  ];

  return (
    <>
      <AkunHeader title="Detail Pesanan" back="/akun/pesanan" />

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-extrabold md:text-lg" style={{ color: "#0f3d33" }}>#{order.order_number}</p>
          <p className="text-xs md:text-sm text-[#6c7a75]">{tglJamID(order.created_at)}</p>
        </div>
        <span className={sc.pill}>{sc.label}</span>
      </div>

      <div className="md:flex md:gap-6 md:items-start">
        <div className="md:flex-1 md:min-w-0 space-y-3 md:space-y-5">
          <div className="akun-card p-5 md:p-6">
            <h3 className="font-extrabold mb-4 md:text-lg" style={{ color: "#0f3d33" }}>Status Pesanan</h3>
            <Timeline steps={steps} />
          </div>

          <div className="akun-card p-5 md:p-6">
            <h3 className="font-extrabold mb-4 md:text-lg" style={{ color: "#0f3d33" }}>Informasi Produk</h3>
            <div className="space-y-4">
              {order.order_items?.map((it, i) => (
                <div key={i} className="flex gap-4">
                  <div className="akun-thumb w-20 h-20 md:w-28 md:h-28 shrink-0 overflow-hidden">
                    {it.product_image ? (
                      <img src={it.product_image} alt={it.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="#0f3d33" strokeWidth="1.2"><path d="M9 3h6l3 3-2 2v13H8V8L6 6z" /></svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold md:text-lg" style={{ color: "#0f3d33" }}>{it.product_name}</p>
                    <p className="text-sm text-[#6c7a75] mt-0.5">
                      {it.color ? `Varian: ${it.color}` : ""}{it.size ? ` • Size ${it.size}` : ""}
                    </p>
                    <p className="text-sm text-[#6c7a75]">Qty: {it.quantity}</p>
                    <p className="font-extrabold mt-2" style={{ color: "#0f3d33" }}>{rupiah(it.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="mt-3 md:mt-0 md:w-[320px] md:shrink-0 md:sticky md:top-20 space-y-3 md:space-y-4">
          <div className="akun-card p-5 md:p-6">
            <h3 className="font-extrabold mb-4 md:text-lg" style={{ color: "#0f3d33" }}>Ringkasan Pembayaran</h3>
            <div className="space-y-2.5 text-sm md:text-base">
              <div className="flex justify-between"><span className="text-[#6c7a75]">Subtotal</span><span className="font-semibold">{rupiah(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-[#6c7a75]">Ongkos Kirim</span><span className="font-semibold">{rupiah(order.shipping_cost)}</span></div>
              {order.discount ? (
                <div className="flex justify-between"><span className="text-[#6c7a75]">Diskon</span><span className="font-semibold">-{rupiah(order.discount)}</span></div>
              ) : null}
              <div className="border-t border-[#eee7da] pt-2.5 flex justify-between">
                <span className="font-bold" style={{ color: "#0f3d33" }}>Total</span>
                <span className="font-extrabold" style={{ color: "#0f3d33" }}>{rupiah(order.total)}</span>
              </div>
            </div>
          </div>
          {order.awb_no ? (
            <Link href={to(`/akun/pesanan/${order.order_number}/lacak`)} className="akun-btn-green w-full py-4 rounded-full font-extrabold text-sm md:text-base flex items-center justify-center gap-2 transition active:scale-[.99]">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg>
              Lacak Pesanan
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
            </Link>
          ) : (
            <div className="akun-card p-4 text-center text-[12px] text-[#6c7a75]">Nomor resi belum tersedia.</div>
          )}
        </aside>
      </div>
    </>
  );
}