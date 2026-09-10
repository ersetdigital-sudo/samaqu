"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import AkunShell from "@/components/akun/AkunShell";
import { statusInfo, rupiah, tglID } from "@/lib/akun-format";

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
  order_items: OrderItem[];
}
interface Cust {
  id: string;
  name: string;
  whatsapp: string;
}

export default function DashboardAkunPage() {
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;
  const [cust, setCust] = useState<Cust | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishCount, setWishCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      setCust(c as Cust);
      const [o, w] = await Promise.all([
        getCustomerOrders(c.id),
        supabase.from("wishlists").select("product_id", { count: "exact", head: true }).eq("customer_id", c.id),
      ]);
      setOrders((o as Order[]) || []);
      setWishCount(w.count || 0);
      setLoading(false);
    }
    init();
  }, []);

  const firstName = (cust?.name || "Pelanggan").split(" ")[0];
  const initials = (cust?.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const activeOrders = orders.filter((o) => o.status === "pending" || o.status === "diproses" || o.status === "dikirim").length;
  const totalSpend = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <AkunShell>
      {/* ═══ MOBILE: hero ═══ */}
      <div
        className="md:hidden text-white rounded-b-[32px] pb-16 shadow-[0_10px_30px_rgba(15,61,51,.18)] -mx-4 -mt-4"
        style={{ background: "linear-gradient(165deg,#175647,#0f3d33 70%)" }}
      >
        <div className="px-5 pt-2">
          <p className="text-[17px] font-extrabold tracking-wide">SAMAQU</p>
        </div>
        <div className="px-5 pt-4 flex items-start gap-3">
          <span className="w-11 h-11 shrink-0 rounded-2xl grid place-items-center text-[13px] font-extrabold bg-white/15 border border-white/15">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[20px] font-extrabold leading-tight">Hai, {firstName}</p>
            <p className="text-[13px] text-white/60 mt-0.5">Selamat datang kembali di Samaqu.</p>
          </div>
        </div>
        <div className="px-5 mt-5 flex gap-2">
          <span className="flex-1 rounded-2xl bg-white/10 border border-white/10 px-3.5 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-white/50 font-bold">Pesanan aktif</span>
            <span className="block text-[15px] font-extrabold mt-0.5">{activeOrders} pesanan</span>
          </span>
          <span className="flex-1 rounded-2xl bg-white/10 border border-white/10 px-3.5 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-white/50 font-bold">Wishlist</span>
            <span className="block text-[15px] font-extrabold mt-0.5">{wishCount} produk</span>
          </span>
        </div>
      </div>

      <div className="-mt-10 md:mt-0 pb-10">
        {/* ═══ DESKTOP: greeting ═══ */}
        <header className="hidden md:block mb-6">
          <h1 className="text-[22px] md:text-3xl font-extrabold" style={{ color: "#0f3d33" }}>Hai, {firstName}</h1>
          <p className="text-sm md:text-base text-[#6c7a75] mt-1">Selamat datang kembali di Samaqu.</p>
        </header>

        {/* ═══ Stat cards (desktop) ═══ */}
        {loading ? (
          <div className="text-center text-sm text-[#6c7a75] py-8">Memuat…</div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.06)] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.06)_0px_4px_8px] p-5">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3" style={{ background: "#e3ede9" }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0f3d33" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /></svg>
                </div>
                <p className="text-2xl font-black" style={{ color: "#0f3d33" }}>{activeOrders}</p>
                <p className="text-xs text-[#8b9793] mt-1">Pesanan Aktif</p>
              </div>
              <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.06)] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.06)_0px_4px_8px] p-5">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3" style={{ background: "#e3ede9" }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0f3d33" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z" /></svg>
                </div>
                <p className="text-2xl font-black" style={{ color: "#0f3d33" }}>{wishCount}</p>
                <p className="text-xs text-[#8b9793] mt-1">Wishlist</p>
              </div>
              <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.06)] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.06)_0px_4px_8px] p-5">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3" style={{ background: "#e3ede9" }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0f3d33" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </div>
                <p className="text-2xl font-black" style={{ color: "#0f3d33" }}>Rp{totalSpend.toLocaleString("id-ID")}</p>
                <p className="text-xs text-[#8b9793] mt-1">Total Belanja</p>
              </div>
            </div>

            {/* ═══ Recent orders ═══ */}
            <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.06)] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.06)_0px_4px_8px] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#f0ebe2] flex items-center justify-between" style={{ background: "#faf8f4" }}>
                <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: "#0f3d33" }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#0f3d33" strokeWidth="1.7"><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /></svg>
                  PESANAN TERAKHIR
                </h2>
                <Link href={to("/akun/pesanan")} className="text-xs font-semibold transition hover:opacity-80" style={{ color: "#0f3d33" }}>
                  Lihat semua <svg viewBox="0 0 24 24" className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 6 6 6-6 6" /></svg>
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#e3ede9" }}>
                    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="#0f3d33" strokeWidth="1.5"><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /><path d="M12 13v7" /></svg>
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#0f3d33" }}>Belum ada pesanan</p>
                  <p className="text-xs text-[#8b9793]">Yuk temukan koleksi yang cocok untukmu.</p>
                  <Link href={to("/katalog")} className="mt-4 inline-block px-6 py-2.5 rounded-full text-xs font-bold text-white transition hover:opacity-90" style={{ background: "#d8c39a", color: "#4a3a1c" }}>
                    LIHAT KOLEKSI
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#f0ebe2]">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={to(`/akun/pesanan/${order.order_number}`)}
                      className="p-4 flex items-center gap-3 hover:bg-[#faf8f4] transition cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-[10px] overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "#e3ede9" }}>
                        {order.order_items?.[0]?.product_image ? (
                          <img src={order.order_items[0].product_image} alt={order.order_items[0].product_name} className="w-full h-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0f3d33" strokeWidth="1.5"><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "#0f3d33" }}>{order.order_items?.[0]?.product_name || "Produk"}</p>
                        <p className="text-xs text-[#8b9793] font-mono">#{order.order_number} &middot; {tglID(order.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black" style={{ color: "#0f3d33" }}>Rp{order.total.toLocaleString("id-ID")}</p>
                        <span className={statusInfo(order.status).pill}>{statusInfo(order.status).label}</span>
                      </div>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="#d1ccc4" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* ═══ Akses Cepat (mobile grid) ═══ */}
            <div className="md:hidden mt-8">
              <h2 className="akun-sect mb-3">Akses Cepat</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: "/akun/wishlist", title: "Wishlist", sub: "Koleksi favorit", icon: <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z" /> },
                  { href: "/akun/pesanan", title: "Pesanan Saya", sub: "Lacak status", icon: <><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /></> },
                  { href: "/akun/panduan-ukuran", title: "Panduan Ukuran", sub: "Cari size pas", icon: <><path d="M3 14 14 3l7 7L10 21z" /><path d="M7.5 12.5 9 14M10.5 9.5 12 11M13.5 6.5 15 8" /></> },
                  { href: "/akun/bantuan", title: "Hubungi Admin", sub: "Chat tim admin", icon: <><path d="M21 12a8 8 0 1 1-3.2-6.4" /><path d="M8 11h8M8 15h5" /></> },
                ].map((it) => (
                  <Link key={it.href} href={to(it.href)} className="akun-card relative p-4 flex items-start gap-3 transition hover:shadow-lg active:scale-[.99]">
                    <span className="shrink-0 w-9 h-9 rounded-xl grid place-items-center" style={{ background: "#e3ede9" }}>
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0f3d33" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-sm leading-tight" style={{ color: "#0f3d33" }}>{it.title}</span>
                      <span className="block text-[11px] text-[#6c7a75] mt-0.5">{it.sub}</span>
                    </span>
                    <span className="absolute right-3 top-4">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#9aa5a1]" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AkunShell>
  );
}
