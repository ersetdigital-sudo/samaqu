"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import { AkunHeader } from "@/components/akun/AkunShell";
import { statusInfo, tglID, rupiah } from "@/lib/akun-format";

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
  status: string;
  created_at: string;
  awb_no?: string | null;
  order_items: OrderItem[];
}

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "diproses", label: "Diproses" },
  { key: "dikirim", label: "Dikirim" },
  { key: "selesai", label: "Selesai" },
];

export default function PesananPage() {
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("semua");

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      const o = await getCustomerOrders(c.id);
      setOrders((o as Order[]) || []);
      setLoading(false);
    }
    init();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "semua") return orders;
    if (tab === "diproses") return orders.filter((o) => o.status === "pending" || o.status === "diproses");
    return orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  return (
    <>
      <AkunHeader title="Pesanan Saya" back="/akun" />

      <div className="flex gap-6 border-b border-[#e6dfd2] mb-5 md:mb-7 text-sm md:text-base overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key ? "font-extrabold border-[#0f3d33]" : "font-semibold text-[#8b9793] border-transparent"
            }`}
            style={tab === t.key ? { color: "#0f3d33" } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 md:gap-5">
          {[0, 1].map((i) => <div key={i} className="akun-card h-36 animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 md:gap-5">
          {filtered.map((o) => {
            const item = o.order_items?.[0];
            const sc = statusInfo(o.status);
            return (
              <Link key={o.id} href={to(`/akun/pesanan/${o.order_number}`)} className="akun-card block p-4 md:p-5 transition hover:shadow-lg active:scale-[.99]">
                <div className="flex items-center justify-between text-[11px] md:text-xs text-[#7c8b85] font-semibold">
                  <span>#{o.order_number}</span><span>{tglID(o.created_at)}</span>
                </div>
                <div className="flex gap-3 md:gap-4 mt-3">
                  <div className="akun-thumb w-16 h-16 md:w-24 md:h-24 shrink-0 overflow-hidden">
                    {item?.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-11 md:h-11" fill="none" stroke="#0f3d33" strokeWidth="1.2"><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /></svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm md:text-base truncate" style={{ color: "#0f3d33" }}>{item?.product_name || "Produk"}</p>
                    <p className="text-[12px] md:text-sm text-[#6c7a75] mt-0.5">{o.order_items?.length || 0} item • {rupiah(o.total)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={sc.pill}>{sc.label}</span>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#9aa5a1]" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="akun-card p-8 md:p-12 text-center md:max-w-[520px] md:mx-auto">
          <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center" style={{ background: "#e3ede9" }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#0f3d33" strokeWidth="1.5"><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /></svg>
          </div>
          <p className="mt-4 font-extrabold" style={{ color: "#0f3d33" }}>Belum ada pesanan di tab ini</p>
          <p className="text-sm text-[#6c7a75] mt-1">Coba pilih filter lain ya.</p>
        </div>
      )}
    </>
  );
}