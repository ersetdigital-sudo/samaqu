"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer, getCustomerOrders, logoutCustomer } from "@/lib/customer-auth";
import { getWhatsAppLink } from "@/lib/store-settings";
import { SITE_URL } from "@/lib/site-config";
import type { Product } from "@/lib/katalog-data";
import { Search, Bell, ShoppingCart, LogOut, ChevronRight, Package, Truck, CheckCircle } from "lucide-react";

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

interface CustomerData {
  id: string;
  name: string;
  whatsapp: string;
  chest_size?: number;
  shoulder_size?: number;
  length_size?: number;
  sleeve_size?: number;
}

type NavSection = "beranda" | "pesanan" | "koleksi" | "ukuran" | "wishlist";

export default function DashboardPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [activeNav, setActiveNav] = useState<NavSection>("beranda");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) { router.push("/akun/login"); return; }
      setCustomer(c);
      const [ordersData, productsData, wishlistData] = await Promise.all([
        getCustomerOrders(c.id),
        supabase.from("featured_products").select("products(*)").order("display_order").limit(6),
        supabase.from("wishlists").select("product_id").eq("customer_id", c.id),
      ]);
      setOrders(ordersData as Order[]);
      if (productsData.data) {
        const fp = productsData.data.map((r: any) => r.products).filter(Boolean);
        setProducts(fp as Product[]);
      }
      if (wishlistData.data && wishlistData.data.length > 0) {
        const ids = wishlistData.data.map((w) => w.product_id);
        const { data: wProducts } = await supabase.from("products").select("*").in("id", ids);
        if (wProducts) setWishlistProducts(wProducts as Product[]);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleRemoveWishlist(productId: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("wishlists").delete().eq("customer_id", userData.user.id).eq("product_id", productId);
    setWishlistProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  async function handleLogout() {
    await logoutCustomer();
    router.push("/akun/login");
  }

  const totalOrders = orders.length;
  const processingOrders = orders.filter((o) => o.status === "diproses" || o.status === "pending").length;
  const firstName = customer?.name?.split(" ")[0] || "Pelanggan";

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "#f0ebe5", color: "#6b5d50", label: "Menunggu" },
    diproses: { bg: "#b58c4a1f", color: "#8b6f42", label: "Dijahit" },
    dikirim: { bg: "#2d211b", color: "#f8f5f1", label: "Dikirim" },
    selesai: { bg: "#4032251a", color: "#6b5d50", label: "Selesai" },
    dibatalkan: { bg: "#fde8e8", color: "#c0392b", label: "Dibatalkan" },
  };

  const navItems: { id: NavSection; label: string; icon: string }[] = [
    { id: "beranda", label: "Beranda", icon: "◇" },
    { id: "pesanan", label: "Pesanan Saya", icon: "▤" },
    { id: "koleksi", label: "Koleksi", icon: "❖" },
    { id: "ukuran", label: "Ukuran Saya", icon: "↔" },
    { id: "wishlist", label: "Wishlist", icon: "♡" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full mx-auto mb-4 animate-pulse" style={{ background: "var(--gold)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary, #f8f5f1)" }}>
      {/* ═══════════════════════════════════
          SIDEBAR (desktop)
      ═══════════════════════════════════ */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 shrink-0 px-6 py-8 sticky top-0 h-screen" style={{ borderRight: "1px solid rgba(64,50,37,.09)", background: "var(--bg-secondary, #f0ebe5)" }}>
        {/* Profile card */}
        <div className="flex items-center gap-3 mb-8 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(64,50,37,.06)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
            {customer?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--espresso)" }}>{customer?.name || "Pelanggan"}</p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{customer?.whatsapp || ""}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveNav(item.id)} className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors cursor-pointer" style={{ background: activeNav === item.id ? "var(--espresso)" : "transparent", color: activeNav === item.id ? "#f8f5f1" : "var(--text-secondary)" }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors mt-1 cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <LogOut size={16} /> Keluar
          </button>
        </nav>
        <div className="mt-auto rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #403225, #2d211b, #1c1511)" }}>
          <p className="italic text-lg mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Konsultasi Ukuran</p>
          <p className="text-xs mb-4" style={{ color: "rgba(248,245,241,.7)" }}>Bingung pilih ukuran? Tim kami siap membantu Anda.</p>
          <a href={getWhatsAppLink("Halo, saya butuh bantuan konsultasi ukuran.")} target="_blank" rel="noopener noreferrer" className="block text-center rounded-full text-xs font-medium py-2.5 transition-colors" style={{ background: "#b58c4a", color: "white" }}>Hubungi Kami</a>
        </div>
      </aside>

      {/* ═══════════════════════════════════
          MAIN
      ═══════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30" style={{ backdropFilter: "blur(12px)", background: "rgba(248,245,241,.85)", borderBottom: "1px solid rgba(64,50,37,.09)" }}>
          <div className="flex items-center gap-4 px-5 sm:px-8 py-4">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/logo.svg" alt="SAMAQU" className="h-8 w-auto" />
            </div>
            {/* Search */}
            <div className="hidden sm:flex flex-1 max-w-md items-center gap-2 rounded-full px-4 py-2.5" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
              <Search size={16} style={{ color: "var(--text-muted)" }} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari thobe, koko, vest…" className="bg-transparent outline-none text-sm w-full" style={{ color: "var(--espresso)" }} />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button className="h-10 w-10 rounded-full relative flex items-center justify-center" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
                <Bell size={18} style={{ color: "var(--espresso)" }} />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: "#b58c4a" }} />
              </button>
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ background: "#b58c4a" }}>
                {customer?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 sm:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10 pb-28 lg:pb-10">

          {/* ── Hero Greeting ── */}
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #403225 0%, #2d211b 60%, #1c1511 100%)" }}>
            <div className="relative z-10 max-w-xl">
              <p className="text-sm tracking-widest uppercase mb-3" style={{ color: "#d4a574" }}>Assalamu&apos;alaikum</p>
              <h1 className="text-3xl sm:text-5xl leading-tight mb-3" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic" }}>Selamat datang kembali, {firstName}</h1>
              <p className="text-sm sm:text-base mb-6" style={{ color: "rgba(248,245,241,.7)" }}>Busana yang layak menemani setiap momen. Lihat pesanan terbaru dan koleksi pilihan untuk Anda.</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setActiveNav("koleksi")} className="rounded-full px-6 py-3 text-sm font-medium text-white transition-colors" style={{ background: "#b58c4a" }}>Jelajahi Koleksi</button>
                <button onClick={() => setActiveNav("pesanan")} className="rounded-full px-6 py-3 text-sm font-medium transition-colors" style={{ border: "1px solid rgba(248,245,241,.3)" }}>Lacak Pesanan</button>
              </div>
            </div>
            <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(181,140,74,.33), transparent 70%)" }} />
          </motion.section>

          {/* ── Stats ── */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Total Pesanan</p>
              <p className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{totalOrders}</p>
              <p className="text-xs mt-2" style={{ color: "#8b6f42" }}>+{orders.filter((o) => { const d = new Date(o.created_at); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length} bulan ini</p>
            </div>
            <div className="rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Sedang Diproses</p>
              <p className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{processingOrders}</p>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Dijahit & QC</p>
            </div>
            <div className="rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Pesanan Selesai</p>
              <p className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{orders.filter((o) => o.status === "selesai").length}</p>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Total transaksi</p>
            </div>
            <div className="rounded-2xl p-5 text-white transition-transform duration-300 hover:-translate-y-1" style={{ background: "var(--espresso)" }}>
              <p className="text-xs mb-2" style={{ color: "rgba(248,245,241,.6)" }}>Poin Loyalitas</p>
              <p className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#d4a574" }}>{totalOrders * 70}</p>
              <p className="text-xs mt-2" style={{ color: "rgba(248,245,241,.6)" }}>Tukar hadiah</p>
            </div>
          </section>

          {/* ── Recent Orders ── */}
          {activeNav === "beranda" || activeNav === "pesanan" ? (
            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Pesanan Terakhir</h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pantau status setiap pesanan Anda</p>
                </div>
              </div>
              {orders.length > 0 ? (
                <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
                  {orders.slice(0, 5).map((order, i) => {
                    const item = order.order_items?.[0];
                    const sc = statusColors[order.status] || statusColors.pending;
                    return (
                      <div key={order.id} className="flex items-center gap-4 p-4 sm:p-5" style={{ borderBottom: i < Math.min(orders.length, 5) - 1 ? "1px solid rgba(64,50,37,.09)" : undefined }}>
                        <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0" style={{ background: "var(--bg-tertiary, #e8e1d9)" }}>
                          {item?.product_image ? (
                            <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center"><Package size={20} style={{ color: "var(--text-muted)" }} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate" style={{ color: "var(--espresso)" }}>{item?.product_name || "Produk"}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>#{order.order_number} · {order.order_items?.length || 0} item</p>
                        </div>
                        <div className="hidden sm:block text-right shrink-0">
                          <p className="font-medium" style={{ color: "var(--espresso)" }}>Rp {order.total.toLocaleString("id-ID")}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                        <span className="shrink-0 rounded-full text-xs font-medium px-3 py-1.5" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
                  <Package size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Belum ada pesanan</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Mulai jelajahi koleksi kami dan buat pesanan pertama Anda</p>
                </div>
              )}
            </section>
          ) : null}

          {/* ── Recommended Collection ── */}
          {activeNav === "beranda" || activeNav === "koleksi" ? (
            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Koleksi Pilihan</h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Dikurasi khusus untuk Anda</p>
                </div>
                <Link href="/katalog" className="text-sm shrink-0" style={{ color: "#8b6f42" }}>Semua koleksi</Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible" style={{ scrollbarWidth: "none" }}>
                {products.map((p) => (
                  <Link key={p.id} href={`/katalog/${p.id}`} className="shrink-0 w-64 sm:w-auto rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
                    <div className="aspect-square overflow-hidden" style={{ background: "var(--bg-tertiary, #e8e1d9)" }}>
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                    </div>
                    <div className="p-4">
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{p.category}</p>
                      <p className="font-medium mb-2" style={{ color: "var(--espresso)" }}>{p.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold font-ui" style={{ color: "var(--gold)" }}>Rp {p.price.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* ── Size & Consult ── */}
          {activeNav === "beranda" || activeNav === "ukuran" ? (
            <section className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-3 rounded-2xl p-6" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
                <h3 className="text-2xl italic mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Ukuran Saya</h3>
                <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Tersimpan untuk pemesanan lebih cepat</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Dada", value: customer?.chest_size, key: "chest_size" },
                    { label: "Pundak", value: customer?.shoulder_size, key: "shoulder_size" },
                    { label: "Panjang", value: customer?.length_size, key: "length_size" },
                    { label: "Lengan", value: customer?.sleeve_size, key: "sleeve_size" },
                  ].map((s) => (
                    <div key={s.key} className="rounded-xl p-4 text-center" style={{ background: "var(--bg-primary, #f8f5f1)", border: "1px solid rgba(64,50,37,.09)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                      <p className="text-2xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
                        {s.value || "—"}{s.value ? <span className="text-sm"> cm</span> : null}
                      </p>
                    </div>
                  ))}
                </div>
                <button className="mt-5 rounded-full px-5 py-2.5 text-sm font-medium transition-colors" style={{ border: "1px solid rgba(64,50,37,.25)", color: "var(--espresso)" }}>Perbarui Ukuran</button>
              </div>
            </section>
          ) : null}

          {/* ── Wishlist ── */}
          {activeNav === "beranda" || activeNav === "wishlist" ? (
            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Wishlist Saya</h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{wishlistProducts.length} produk tersimpan</p>
                </div>
                {wishlistProducts.length > 0 && (
                  <Link href="/katalog" className="text-sm shrink-0" style={{ color: "#8b6f42" }}>Jelajahi Koleksi</Link>
                )}
              </div>
              {wishlistProducts.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:overflow-visible" style={{ scrollbarWidth: "none" }}>
                  {wishlistProducts.map((p) => (
                    <div key={p.id} className="shrink-0 w-56 sm:w-auto rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
                      <Link href={`/katalog/${p.id}`} className="block">
                        <div className="aspect-square overflow-hidden relative" style={{ background: "var(--bg-tertiary, #e8e1d9)" }}>
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </Link>
                      <div className="p-4">
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{p.category}</p>
                        <p className="font-medium text-sm mb-2" style={{ color: "var(--espresso)" }}>{p.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold" style={{ color: "#b58c4a" }}>Rp {p.price.toLocaleString("id-ID")}</span>
                          <button onClick={() => handleRemoveWishlist(p.id)} className="text-xs px-3 py-1.5 rounded-full transition-colors" style={{ border: "1px solid rgba(231,76,60,.2)", color: "#e74c3c" }}>Hapus</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
                  <p className="text-4xl mb-3">♡</p>
                  <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Belum ada wishlist</p>
                  <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Klik ikon hati pada produk favorit Anda</p>
                  <Link href="/katalog" className="inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: "var(--espresso)" }}>Jelajahi Katalog</Link>
                </div>
              )}
            </section>
          ) : null}

        </main>
      </div>

      {/* ═══════════════════════════════════
          MOBILE BOTTOM NAV
      ═══════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40" style={{ background: "rgba(248,245,241,.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(64,50,37,.09)" }}>
        <div className="px-6 py-2.5 flex items-center justify-between">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveNav(item.id)} className="flex flex-col items-center gap-1 text-[10px]" style={{ color: activeNav === item.id ? "#8b6f42" : "var(--text-muted)" }}>
              <span className="text-lg">{item.icon}</span>
              {item.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

