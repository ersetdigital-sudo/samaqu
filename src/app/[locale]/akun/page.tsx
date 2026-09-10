"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import AkunShell from "@/components/akun/AkunShell";
import { statusInfo, tglID } from "@/lib/akun-format";

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
  const latest = orders[0];

  return (
    <AkunShell>
      {/* Mobile hero */}
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
            <p className="text-[20px] font-extrabold leading-tight">Hai, {firstName} 👋</p>
            <p className="text-[13px] text-white/60 mt-0.5">Selamat datang kembali di Samaqu.</p>
          </div>
          <button className="w-10 h-10 shrink-0 grid place-items-center rounded-2xl bg-white/10 border border-white/10" aria-label="Notifikasi">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
          </button>
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
        {/* Desktop greeting */}
        <header className="hidden md:block pt-4 md:pt-0 pb-5">
          <h1 className="text-[22px] md:text-3xl font-extrabold" style={{ color: "#0f3d33" }}>Hai, {firstName} 👋</h1>
          <p className="text-sm md:text-base text-[#6c7a75] mt-1">Selamat datang kembali di Samaqu.</p>
        </header>

        {/* Pesanan Saya */}
        <div className="akun-card p-6 md:p-10">
          {loading ? (
            <div className="text-center text-sm text-[#6c7a75]">Memuat…</div>
          ) : latest ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-extrabold md:text-lg" style={{ color: "#0f3d33" }}>Pesanan Saya</h2>
                <Link href={to("/akun/pesanan")} className="text-[12px] font-bold" style={{ color: "#0f3d33" }}>Lihat semua</Link>
              </div>
              <Link href={to(`/akun/pesanan/${latest.order_number}`)} className="flex gap-3 md:gap-4 items-start group">
                <div className="akun-thumb w-16 h-16 md:w-24 md:h-24 shrink-0 overflow-hidden">
                  {latest.order_items?.[0]?.product_image ? (
                    <img src={latest.order_items[0].product_image} alt={latest.order_items[0].product_name} className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-11 md:h-11" fill="none" stroke="#0f3d33" strokeWidth="1.2"><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /></svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[#7c8b85] font-semibold">#{latest.order_number} • {tglID(latest.created_at)}</p>
                  <p className="font-bold text-sm md:text-base truncate mt-1" style={{ color: "#0f3d33" }}>{latest.order_items?.[0]?.product_name || "Produk"}</p>
                  <p className="text-[12px] md:text-sm text-[#6c7a75] mt-0.5">{latest.order_items?.length || 0} item • Rp{latest.total.toLocaleString("id-ID")}</p>
                  <div className="mt-2"><span className={statusInfo(latest.status).pill}>{statusInfo(latest.status).label}</span></div>
                </div>
              </Link>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center" style={{ background: "#e3ede9" }}>
                <svg viewBox="0 0 24 24" fill="none" className="w-11 h-11 md:w-12 md:h-12" stroke="#0f3d33" strokeWidth="1.5"><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /><path d="M12 13v7" /></svg>
              </div>
              <p className="mt-5 text-lg md:text-xl font-extrabold" style={{ color: "#0f3d33" }}>Belum ada pesanan</p>
              <p className="text-sm md:text-base text-[#6c7a75] mt-1">Yuk temukan koleksi yang cocok untukmu.</p>
              <Link href={to("/katalog")} className="akun-btn-gold mt-6 inline-block w-full md:w-auto md:px-10 py-3.5 rounded-full font-extrabold text-sm tracking-wide text-center">LIHAT KOLEKSI</Link>
            </div>
          )}
        </div>

        {/* Akses Cepat */}
        <h2 className="akun-sect mt-8 mb-3">Akses Cepat</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          {[
            { href: "/akun/wishlist", title: "Wishlist", sub: "Koleksi favorit", icon: <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z" /> },
            { href: "/akun/pesanan", title: "Pesanan Saya", sub: "Lacak status", icon: <><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /></> },
            { href: "/akun/panduan-ukuran", title: "Panduan Ukuran", sub: "Cari size pas", icon: <><path d="M3 14 14 3l7 7L10 21z" /><path d="M7.5 12.5 9 14M10.5 9.5 12 11M13.5 6.5 15 8" /></> },
            { href: "/akun/bantuan", title: "Hubungi Admin", sub: "Chat tim admin", icon: <><path d="M21 12a8 8 0 1 1-3.2-6.4" /><path d="M4 20l1.4-3.6" /><path d="M8 11h8M8 15h5" /></> },
          ].map((it) => (
            <Link key={it.href} href={to(it.href)} className="akun-card relative p-4 md:p-5 flex items-start gap-3 transition hover:shadow-lg active:scale-[.99]">
              <span className="shrink-0 w-9 h-9 rounded-xl grid place-items-center" style={{ background: "#e3ede9" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0f3d33" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-sm md:text-base leading-tight" style={{ color: "#0f3d33" }}>{it.title}</span>
                <span className="block text-[11px] md:text-sm text-[#6c7a75] mt-0.5">{it.sub}</span>
              </span>
              <span className="absolute right-3 top-4 md:static">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#9aa5a1]" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
              </span>
            </Link>
          ))}
        </div>

        {/* Data Saya */}
        <h2 className="akun-sect mt-8 mb-2">Data Saya</h2>
        <div className="divide-y divide-[#e9e3d8] md:bg-white md:rounded-2xl md:px-2">
          {[
            { href: "/akun/profil", label: "Informasi Profil", icon: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></> },
            { href: "/akun/alamat", label: "Alamat Pengiriman", icon: <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></> },
          ].map((r) => (
            <Link key={r.href} href={to(r.href)} className="flex items-center gap-3 py-4 md:py-5 md:px-3 transition active:opacity-70">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0f3d33" strokeWidth="1.6" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">{r.icon}</svg>
              <span className="flex-1 font-semibold text-sm md:text-base" style={{ color: "#1b2a26" }}>{r.label}</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#9aa5a1]" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
            </Link>
          ))}
        </div>
      </div>
    </AkunShell>
  );
}