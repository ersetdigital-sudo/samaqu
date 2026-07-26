"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, Package, Users, FileText, Settings,
  Search, Bell, Menu, X, ChevronDown, Plus, TrendingUp, Eye, Edit,
  DollarSign, ShoppingCart, UserPlus, Box, LogOut, Lock, Mail, Loader2, Trash2, Upload, Ticket,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/AdminToast";

type Panel = "dashboard" | "orders" | "products" | "customers" | "content" | "settings";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_whatsapp: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal: string;
  shipping_notes: string;
  shipping_method: string;
  payment_method: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  status: string;
  created_at: string;
  order_items?: { product_name: string; color: string; size: string; quantity: number; price: number }[];
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
}

const navItems = [
  { id: "dashboard" as Panel, label: "Dashboard", icon: LayoutDashboard },
  { id: "orders" as Panel, label: "Pesanan", icon: ShoppingBag, badge: true },
  { id: "products" as Panel, label: "Produk", icon: Package },
  { id: "customers" as Panel, label: "Pelanggan", icon: Users },
  { id: "content" as Panel, label: "Konten Website", icon: FileText },
  { id: "settings" as Panel, label: "Pengaturan", icon: Settings },
];

const panelTitles: Record<Panel, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Selamat datang kembali, kelola toko SAMAQU Anda." },
  orders: { title: "Pesanan", sub: "Pantau dan proses seluruh pesanan pelanggan." },
  products: { title: "Produk", sub: "Kelola katalog dan stok koleksi." },
  customers: { title: "Pelanggan", sub: "Data dan riwayat belanja pelanggan." },
  content: { title: "Konten Website", sub: "Atur tampilan halaman publik SAMAQU." },
  settings: { title: "Pengaturan", sub: "Konfigurasi informasi toko." },
};

function money(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    selesai: { bg: "#e7ecdf", color: "#5b6b45" },
    diproses: { bg: "#f0e7d8", color: "#8a6f42" },
    dikirim: { bg: "#e4e6ea", color: "#5c6473" },
    menunggu: { bg: "#f0ebe5", color: "#6b5d50" },
    pending: { bg: "#f0ebe5", color: "#6b5d50" },
  };
  const s = styles[status.toLowerCase()] || styles.pending;
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{status}</span>;
}

function AdminPageInner() {
  // ALL hooks must be declared BEFORE any early returns
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activePanel, setActivePanel] = useState<Panel>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState("Semua");

  // All useMemo/useCallback hooks
  const stats = useMemo(() => ({
    revenue: orders.filter((o) => o.status !== "pending").reduce((sum, o) => sum + o.total, 0),
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    totalProducts: products.length,
  }), [orders, products]);

  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; count: number; image: string }> = {};
    orders.forEach((o) => {
      o.order_items?.forEach((item) => {
        if (!counts[item.product_name]) counts[item.product_name] = { name: item.product_name, count: 0, image: "" };
        counts[item.product_name].count += item.quantity;
      });
    });
    // Match product images
    const result = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
    result.forEach((item) => {
      const product = products.find((p) => p.name === item.name);
      if (product) item.image = product.image;
    });
    return result;
  }, [orders, products]);

  // All useEffect hooks
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          const { data } = await supabase.from("admins").select("role").eq("user_id", u.id).single();
          if (mounted) setRole(data?.role || null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user || role !== "admin") return;
    let mounted = true;
    async function fetchData() {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          supabase.from("orders").select("*, order_items(product_name, color, size, quantity, price)").order("created_at", { ascending: false }).limit(50),
          supabase.from("products").select("*").order("created_at", { ascending: true }),
        ]);
        if (mounted) {
          if (ordersRes.data) setOrders(ordersRes.data as Order[]);
          if (productsRes.data) setProducts(productsRes.data as Product[]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [user, role]);

  // Handler functions (not hooks)
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return;
    }
    const u = data.user;
    setUser(u);
    const { data: adminData } = await supabase.from("admins").select("role").eq("user_id", u.id).single();
    setRole(adminData?.role || null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setOrders([]);
    setProducts([]);
    setActivePanel("dashboard");
  }

  const toast = useToast();
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  function showConfirm(title: string, message: string, onConfirm: () => void) {
    setConfirmModal({ open: true, title, message, onConfirm });
  }

  async function handleDeleteProduct(id: string, name: string) {
    showConfirm("Hapus Produk?", `Yakin ingin menghapus "${name}"? Tindakan ini tidak bisa dibatalkan.`, async () => {
      try {
        await supabase.from("product_images").delete().eq("product_id", id);
        await supabase.from("product_variants").delete().eq("product_id", id);
        await supabase.from("products").delete().eq("id", id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.showToast("success", "Produk berhasil dihapus");
      } catch (err) {
        console.error("Delete error:", err);
        toast.showToast("error", "Gagal menghapus produk, coba lagi");
      }
    });
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev);
      toast.showToast("success", "Status pesanan berhasil diperbarui");
    }
  }

  async function deleteOrder(orderId: string) {
    showConfirm("Hapus Pesanan?", "Yakin ingin menghapus pesanan ini? Tindakan ini tidak bisa dibatalkan.", async () => {
      const { error } = await supabase.from("order_items").delete().eq("order_id", orderId);
      if (!error) {
        await supabase.from("orders").delete().eq("id", orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setSelectedOrder(null);
        setDeleteConfirmOrder(null);
        toast.showToast("success", "Pesanan berhasil dihapus");
      }
    });
  }

  function go(panel: Panel) {
    setActivePanel(panel);
    setSidebarOpen(false);
  }

  // NOW early returns are safe (all hooks already called)
  if (authLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,183,156,.3)", borderTopColor: "var(--gold)" }} />
      </section>
    );
  }

  if (user && role !== "admin") {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="text-center px-6 max-w-sm">
          <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(231,76,60,.1)", border: "2px solid rgba(231,76,60,.3)" }}>
            <Lock size={28} style={{ color: "#e74c3c" }} />
          </div>
          <h1 className="text-2xl font-medium mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Akses Ditolak</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Akun Anda tidak memiliki akses ke dashboard admin. Hubungi pemilik toko untuk mendapatkan akses.
          </p>
          <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>Login sebagai: {user.email}</p>
          <button onClick={handleLogout} className="px-6 py-2.5 rounded-xl text-sm font-semibold" style={{ border: "1px solid rgba(64,50,37,.2)", color: "var(--espresso)" }}>
            Keluar & Login Ulang
          </button>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="min-h-screen flex" style={{ background: "#f0f2f5" }}>
        {/* Desktop: slanted dark left panel */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden" style={{ background: "var(--espresso)" }}>
          <div className="absolute inset-0" style={{
            clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)",
            background: "linear-gradient(135deg, rgba(181,140,74,.15) 0%, rgba(45,33,27,.95) 50%, rgba(45,33,27,1) 100%)",
          }} />
          <div className="absolute inset-0 opacity-20" style={{
            background: "radial-gradient(circle at 30% 40%, rgba(181,140,74,.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(157,122,58,.3) 0%, transparent 40%)",
          }} />
          <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 w-full">
            <div>
              <span className="text-3xl tracking-[0.2em] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>SAMAQU</span>
              <p className="text-[11px] tracking-[0.28em] uppercase mt-2" style={{ color: "rgba(212,197,181,.6)" }}>Admin Panel</p>
            </div>
            <div className="max-w-md">
              <h1 className="text-4xl lg:text-5xl font-medium leading-tight mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
                Kelola Toko<br /><em style={{ color: "#d4a86a" }}>SAMAQU</em> Anda
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(212,197,181,.7)" }}>
                Dashboard admin untuk mengelola pesanan, produk, pelanggan, dan konten website SAMAQU.
              </p>
            </div>
            <p className="text-xs" style={{ color: "rgba(212,197,181,.4)" }}>© 2026 SAMAQU. Semua hak cipta dilindungi.</p>
          </div>
        </div>

        {/* Right: form panel */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-sm">
            {/* Mobile: brand header */}
            <div className="lg:hidden text-center mb-10">
              <span className="text-3xl tracking-[0.2em] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>SAMAQU</span>
              <p className="text-[11px] tracking-[0.28em] uppercase mt-2" style={{ color: "var(--text-muted)" }}>Admin Panel</p>
            </div>

            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-medium mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Selamat Datang</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Masuk ke dashboard admin SAMAQU</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--espresso)" }}>Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@samaqu.id"
                    className="w-full rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all focus:ring-2"
                    style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--espresso)" }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties}
                  required
                  minLength={6}
                />
              </div>
              {authError && (
                <p className="text-[13px]" style={{ color: "#e74c3c" }}>{authError}</p>
              )}
              <button type="submit" className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: "var(--espresso)", boxShadow: "0 4px 14px -4px rgba(45,33,27,.4)" }}>
                Masuk
              </button>
            </form>

            <p className="mt-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              Butuh akses? Hubungi pemilik toko.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div id="admin-root" className="flex min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky z-40 top-0 left-0 h-screen lg:self-start w-72 shrink-0 transition-transform duration-300 flex flex-col overflow-y-auto admin-sidebar ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--espresso)" }}
      >
        <div className="flex flex-col gap-2 px-6 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <img src="/logo.svg" alt="SAMAQU" className="h-8 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: "#9f9690" }}>Admin Panel</p>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1.5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8f8680" }}>Menu Utama</p>
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`sidebar-link w-full text-left ${activePanel === item.id ? "active" : ""}`}
            >
              <item.icon size={20} strokeWidth={1.6} />
              <span className="flex-1">{item.label}</span>
              {item.badge && orders.filter((o) => o.status === "pending").length > 0 && (
                <span className="badge" style={{ background: "var(--gold)", color: "#fff" }}>
                  {orders.filter((o) => o.status === "pending").length}
                </span>
              )}
            </button>
          ))}

          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-2 mt-6" style={{ color: "#8f8680" }}>Lainnya</p>
          {navItems.slice(4).map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`sidebar-link w-full text-left ${activePanel === item.id ? "active" : ""}`}
            >
              <item.icon size={20} strokeWidth={1.6} />
              <span>{item.label}</span>
            </button>
          ))}
          <Link
            href="/admin/voucher"
            className="sidebar-link w-full text-left"
            onClick={() => setSidebarOpen(false)}
          >
            <Ticket size={20} strokeWidth={1.6} />
            <span>Voucher</span>
          </Link>
        </nav>

        <div className="px-4 pb-6">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--cream)" }}>Butuh bantuan?</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9f9690" }}>Butuh bantuan atau ingin tambah fitur? Hubungi kami.</p>
            <a href="https://wa.me/6285212150100?text=Halo,%20saya%20ingin%20bertanya%20seputar%20dashboard%20admin%20SAMAQU." target="_blank" rel="noopener noreferrer" className="mt-3 w-full text-sm font-semibold py-2 rounded-lg text-white text-center block" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>Hubungi Kami</a>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(248,245,241,.8)", borderBottom: "1px solid rgba(64,50,37,.06)" }}>
          <div className="flex items-center gap-4 px-5 lg:px-8 py-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg" style={{ color: "var(--espresso)" }}>
              <Menu size={24} strokeWidth={1.8} />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl lg:text-3xl italic leading-none" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{panelTitles[activePanel].title}</h1>
              <p className="text-sm mt-1 hidden sm:block" style={{ color: "var(--text-muted)" }}>{panelTitles[activePanel].sub}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} strokeWidth={1.8} style={{ color: "var(--text-muted)" }} />
                <input type="text" placeholder="Cari pesanan, produk..." className="pl-10 pr-4 py-2.5 w-64 rounded-xl bg-white text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.06)" }} />
              </div>
              <button className="relative p-2.5 rounded-xl bg-white" style={{ border: "1px solid rgba(64,50,37,.06)" }}>
                <Bell size={20} strokeWidth={1.7} style={{ color: "var(--espresso)" }} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />
              </button>
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 pl-2 cursor-pointer">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
                    {user.email?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div className="hidden sm:block leading-tight text-left">
                    <p className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>{user.email?.split("@")[0] || "Admin"}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{role === "admin" ? "Admin" : "User"}</p>
                  </div>
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl z-50 overflow-hidden" style={{ background: "white", border: "1px solid rgba(64,50,37,.1)", boxShadow: "0 12px 40px -8px rgba(45,33,27,.2)" }}>
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(64,50,37,.06)" }}>
                        <p className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>{user.email?.split("@")[0] || "Admin"}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                      </div>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--bg-secondary)]" style={{ color: "var(--espresso)" }}>
                        <LogOut size={16} strokeWidth={1.6} />
                        Keluar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 lg:p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={activePanel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

              {/* DASHBOARD */}
              {activePanel === "dashboard" && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
                    <StatCard icon={<DollarSign size={20} />} label="Pendapatan" value={money(stats.revenue)} badge="+18%" badgeColor="#e7ecdf,#5b6b45" />
                    <StatCard icon={<ShoppingCart size={20} />} label="Total Pesanan" value={stats.totalOrders.toString()} badge={`+${stats.pendingOrders}`} badgeColor="#e7ecdf,#5b6b45" />
                    <StatCard icon={<UserPlus size={20} />} label="Menunggu Verifikasi" value={stats.pendingOrders.toString()} badge="pending" badgeColor="#f0e7d8,#8a6f42" />
                    <StatCard icon={<Box size={20} />} label="Produk Aktif" value={stats.totalProducts.toString()} badge={`${products.length} item`} badgeColor="#f0e7d8,#8a6f42" />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5 mt-5">
                    <div className="card p-5 xl:col-span-2">
                      <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Pesanan Terbaru</h2>
                      {loading ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Memuat...</p> : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[500px]">
                            <thead>
                              <tr className="text-left" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                                <th className="font-medium px-4 py-3">ID</th>
                                <th className="font-medium px-4 py-3">Pelanggan</th>
                                <th className="font-medium px-4 py-3">Total</th>
                                <th className="font-medium px-4 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orders.slice(0, 5).map((o) => (
                                <tr key={o.id} style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}>
                                  <td className="px-4 py-3 font-semibold">{o.order_number}</td>
                                  <td className="px-4 py-3">{o.customer_name}</td>
                                  <td className="px-4 py-3 font-semibold">{money(o.total)}</td>
                                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="card p-5">
                      <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Koleksi Terlaris</h2>
                      <div className="space-y-4">
                        {topProducts.map((p, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg shrink-0 overflow-hidden" style={{ background: "#e8dfd1" }}>
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${["#c8b18a,#8b6f42", "#e0d3bd,#b58c4a", "#9c8468,#403225", "#d4a574,#8b6f42", "#bfa789,#6b5d50"][i]})` }} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate">{p.name}</p>
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.count} terjual</p>
                            </div>
                          </div>
                        ))}
                        {topProducts.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Belum ada data penjualan</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ORDERS */}
              {activePanel === "orders" && (
                <div className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3 justify-between p-5" style={{ borderBottom: "1px solid rgba(64,50,37,.06)" }}>
                    <h2 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Semua Pesanan</h2>
                    <div className="flex gap-2">
                      {["Semua", "pending", "diproses", "selesai"].map((s) => (
                        <button key={s} onClick={() => setOrderFilter(s)} className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors" style={{ background: orderFilter === s ? "var(--gold)" : "transparent", color: orderFilter === s ? "#fff" : "var(--text-secondary)", border: orderFilter === s ? "none" : "1px solid rgba(64,50,37,.15)" }}>
                          {s === "Semua" ? "Semua" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr className="text-left" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                          <th className="font-medium px-5 py-3">ID</th>
                          <th className="font-medium px-5 py-3">Pelanggan</th>
                          <th className="font-medium px-5 py-3">Tanggal</th>
                          <th className="font-medium px-5 py-3">Total</th>
                          <th className="font-medium px-5 py-3">Status</th>
                          <th className="font-medium px-5 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.filter((o) => orderFilter === "Semua" || o.status === orderFilter).map((o) => (
                          <tr key={o.id} className="cursor-pointer transition-colors hover:bg-[rgba(248,246,242,.5)]" style={{ borderTop: "1px solid rgba(64,50,37,.06)" }} onClick={() => setSelectedOrder(o)}>
                            <td className="px-5 py-3.5 font-semibold">{o.order_number}</td>
                            <td className="px-5 py-3.5">{o.customer_name}</td>
                            <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>{new Date(o.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                            <td className="px-5 py-3.5 font-semibold">{money(o.total)}</td>
                            <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                            <td className="px-5 py-3.5 text-right">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>Detail</button>
                            </td>
                          </tr>
                        ))}
                        {orders.filter((o) => orderFilter === "Semua" || o.status === orderFilter).length === 0 && (
                          <tr><td colSpan={6} className="px-5 py-8 text-center" style={{ color: "var(--text-muted)" }}>Tidak ada pesanan</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PRODUCTS */}
              {activePanel === "products" && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Katalog Produk</h2>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Kelola koleksi busana SAMAQU</p>
                    </div>
                    <Link href="/admin/produk/tambah" className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
                      <Plus size={18} strokeWidth={2} /> Tambah Produk
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {products.map((p) => (
                      <div key={p.id} className="card overflow-hidden group">
                        <div className="h-40 relative overflow-hidden" style={{ background: "#e8dfd1" }}>
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                          <span className="absolute top-3 left-3 badge" style={{ background: "rgba(255,255,255,.8)", color: "var(--espresso)" }}>{p.category}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-sm leading-snug">{p.name}</h3>
                          <p className="text-[15px] sm:text-base font-ui font-medium mt-2" style={{ color: "var(--gold)" }}>Rp {p.price.toLocaleString("id-ID")}</p>
                          <div className="flex gap-2 mt-3">
                            <Link href={`/admin/produk/edit/${p.id}`} className="flex-1 text-xs font-semibold py-2 rounded-lg text-center" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Edit</Link>
                            <Link href={`/admin/produk/detail/${p.id}`} className="flex-1 text-xs font-semibold py-2 rounded-lg text-center text-white" style={{ background: "var(--gold)" }}>Detail</Link>
                            <button onClick={() => handleDeleteProduct(p.id, p.name)} className="flex-1 text-xs font-semibold py-2 rounded-lg text-center" style={{ border: "1px solid rgba(231,76,60,.3)", color: "#e74c3c" }}>Hapus</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOMERS */}
              {activePanel === "customers" && (
                <div className="card overflow-hidden">
                  <div className="p-5" style={{ borderBottom: "1px solid rgba(64,50,37,.06)" }}>
                    <h2 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Daftar Pelanggan</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="text-left" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                          <th className="font-medium px-5 py-3">Nama</th>
                          <th className="font-medium px-5 py-3">Kontak</th>
                          <th className="font-medium px-5 py-3">Pesanan</th>
                          <th className="font-medium px-5 py-3">Total Belanja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const customers: Record<string, { name: string; whatsapp: string; orders: number; total: number }> = {};
                          orders.forEach((o) => {
                            if (!customers[o.customer_name]) customers[o.customer_name] = { name: o.customer_name, whatsapp: o.customer_whatsapp, orders: 0, total: 0 };
                            customers[o.customer_name].orders++;
                            customers[o.customer_name].total += o.total;
                          });
                          return Object.values(customers).sort((a, b) => b.total - a.total);
                        })().map((c, i) => (
                          <tr key={i} style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}>
                            <td className="px-5 py-3.5 font-semibold">{c.name}</td>
                            <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>{c.whatsapp}</td>
                            <td className="px-5 py-3.5">{c.orders} pesanan</td>
                            <td className="px-5 py-3.5 font-semibold">{money(c.total)}</td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr><td colSpan={4} className="px-5 py-8 text-center" style={{ color: "var(--text-muted)" }}>Belum ada pelanggan</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CONTENT */}
              {activePanel === "content" && (
                <div>
                  <h2 className="text-2xl italic mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Konten Website</h2>
                  <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Kelola bagian yang tampil di samaqu.vercel.app</p>
                  <Link href="/admin/konten-website" className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow" style={{ cursor: "pointer" }}>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: "var(--espresso)" }}>Kelola Konten Halaman</h3>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Edit Hero, Koleksi Pilihan, Cara Pemesanan, Testimoni</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--gold)" }}>Buka →</span>
                  </Link>
                </div>
              )}

              {/* SETTINGS */}
              {activePanel === "settings" && (
                <div className="space-y-6">
                  <h2 className="text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Pengaturan Toko</h2>

                  {/* Store Info */}
                  <StoreInfoSection />

                  {/* Payment Methods */}
                  <PaymentMethodsSection />
                  <QrisEwalletSection />
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 pb-10 overflow-y-auto" style={{ background: "rgba(42,33,27,.4)", backdropFilter: "blur(4px)" }} onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} transition={{ duration: 0.25 }} className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: "var(--cream)", boxShadow: "0 25px 60px -12px rgba(42,33,27,.5)" }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(64,50,37,.06)" }}>
                <div>
                  <h2 className="text-xl font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{selectedOrder.order_number}</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{new Date(selectedOrder.created_at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedOrder.status} />
                  <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-lg hover:bg-[rgba(64,50,37,.05)]" style={{ color: "var(--text-muted)" }}><X size={18} /></button>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Status Update */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
                  <p className="text-[11px] tracking-[0.15em] uppercase mb-3 font-medium" style={{ color: "var(--text-muted)" }}>Ubah Status</p>
                  <div className="flex flex-wrap gap-2">
                    {["pending", "diproses", "selesai", "dibatalkan"].map((s) => (
                      <button key={s} onClick={() => updateOrderStatus(selectedOrder.id, s)} className="text-xs px-4 py-2 rounded-lg font-medium transition-all" style={{ background: selectedOrder.status === s ? "var(--gold)" : "transparent", color: selectedOrder.status === s ? "#fff" : "var(--text-secondary)", border: selectedOrder.status === s ? "none" : "1px solid rgba(64,50,37,.15)" }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
                  <p className="text-[11px] tracking-[0.15em] uppercase mb-3 font-medium" style={{ color: "var(--text-muted)" }}>Informasi Pelanggan</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Nama</span><span className="font-medium" style={{ color: "var(--espresso)" }}>{selectedOrder.customer_name}</span></div>
                    {selectedOrder.customer_email && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Email</span><span className="font-medium" style={{ color: "var(--espresso)" }}>{selectedOrder.customer_email}</span></div>}
                    <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>WhatsApp</span><span className="font-medium" style={{ color: "var(--espresso)" }}>{selectedOrder.customer_whatsapp}</span></div>
                    {selectedOrder.shipping_address && <div className="flex justify-between text-sm gap-4"><span style={{ color: "var(--text-secondary)" }}>Alamat</span><span className="font-medium text-right" style={{ color: "var(--espresso)" }}>{selectedOrder.shipping_address}{selectedOrder.shipping_city ? `, ${selectedOrder.shipping_city}` : ""}{selectedOrder.shipping_postal ? ` ${selectedOrder.shipping_postal}` : ""}</span></div>}
                    {selectedOrder.shipping_notes && <div className="flex justify-between text-sm gap-4"><span style={{ color: "var(--text-secondary)" }}>Catatan</span><span className="text-right" style={{ color: "var(--espresso)" }}>{selectedOrder.shipping_notes}</span></div>}
                  </div>
                </div>

                {/* Payment & Shipping */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
                  <p className="text-[11px] tracking-[0.15em] uppercase mb-3 font-medium" style={{ color: "var(--text-muted)" }}>Pembayaran & Pengiriman</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Metode Pembayaran</span><span className="font-medium" style={{ color: "var(--espresso)" }}>{selectedOrder.payment_method === "bank" || selectedOrder.payment_method?.startsWith?.("pm_") ? "Transfer Bank" : selectedOrder.payment_method === "qris" ? "QRIS / E-Wallet" : selectedOrder.payment_method === "cod" ? "COD" : selectedOrder.payment_method || "-"}</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Metode Pengiriman</span><span className="font-medium" style={{ color: "var(--espresso)" }}>{selectedOrder.shipping_method || "-"}</span></div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
                  <p className="text-[11px] tracking-[0.15em] uppercase mb-3 font-medium" style={{ color: "var(--text-muted)" }}>Produk Dipesan</p>
                  {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.order_items.map((item, i) => (
                        <div key={i} className="flex justify-between items-start text-sm">
                          <div>
                            <p className="font-medium" style={{ color: "var(--espresso)" }}>{item.product_name}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.color || ""} {item.size || ""} &times; {item.quantity}</p>
                          </div>
                          <span className="font-semibold" style={{ color: "var(--espresso)" }}>{money(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Detail item tidak tersedia</p>
                  )}
                </div>

                {/* Total */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
                  <div className="space-y-2">
                    {selectedOrder.subtotal > 0 && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Subtotal</span><span>{money(selectedOrder.subtotal)}</span></div>}
                    {selectedOrder.discount > 0 && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Diskon</span><span style={{ color: "#e74c3c" }}>-{money(selectedOrder.discount)}</span></div>}
                    {selectedOrder.shipping_cost > 0 && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Ongkos Kirim</span><span>{money(selectedOrder.shipping_cost)}</span></div>}
                    <div className="flex justify-between text-base font-semibold pt-2" style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}>
                      <span style={{ color: "var(--espresso)" }}>Total</span>
                      <span style={{ color: "var(--gold)", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "1.15rem" }}>{money(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(64,50,37,.06)", background: "rgba(255,255,255,.3)" }}>
                <a href={`https://wa.me/${selectedOrder.customer_whatsapp?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.885 3.488" /></svg>
                  Hubungi via WhatsApp
                </a>
                <button onClick={(e) => { e.stopPropagation(); deleteOrder(selectedOrder.id); }} className="text-xs font-medium px-4 py-2 rounded-lg" style={{ border: "1px solid rgba(231,76,60,.3)", color: "#e74c3c" }}>
                  Hapus Pesanan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal((prev) => ({ ...prev, open: false })); }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
      />

      <style jsx global>{`
        /* All interactive elements in admin dashboard */
        #admin-root button,
        #admin-root a,
        #admin-root [role="button"],
        #admin-root select {
          cursor: pointer;
        }
        /* Hidden scrollbar - keeps scroll functionality, hides visual scrollbar */
        .admin-sidebar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        .admin-sidebar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        .sidebar-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 0.9rem; border-radius: 0.7rem;
          color: #d4ccc2; font-size: 0.9rem; font-weight: 500;
          cursor: pointer; transition: all .2s ease; border: 1px solid transparent;
        }
        .sidebar-link:hover { background: rgba(255,255,255,.06); color: #f8f5f1; }
        .sidebar-link.active { background: rgba(255,255,255,.12); color: #f8f5f1; border-color: rgba(255,255,255,.1); }
        .sidebar-link.active svg { color: var(--gold); }
        .card { background: #fffdfb; border: 1px solid rgba(64,50,37,.06); border-radius: 1rem; box-shadow: 0 1px 2px rgba(64,50,37,.03); }
        .badge { font-size: .72rem; font-weight: 600; padding: .2rem .6rem; border-radius: 999px; white-space: nowrap; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(64,50,37,.2); border-radius: 999px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}

function StoreInfoSection() {
  const [form, setForm] = useState({ store_name: "", tagline: "", email: "", whatsapp: "" });
  const [original, setOriginal] = useState({ store_name: "", tagline: "", email: "", whatsapp: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    supabase.from("store_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        const s = { store_name: data.store_name || "", tagline: data.tagline || "", email: data.email || "", whatsapp: data.whatsapp || "" };
        setForm(s); setOriginal(s);
      }
      setLoading(false);
    });
  }, []);

  const dirty = form.store_name !== original.store_name || form.tagline !== original.tagline || form.email !== original.email || form.whatsapp !== original.whatsapp;

  async function handleSave() {
    setSaving(true);
    await supabase.from("store_settings").upsert({ id: 1, ...form, updated_at: new Date().toISOString() });
    setOriginal({ ...form });
    setSaving(false);
    toast.showToast("success", "Perubahan berhasil disimpan");
  }

  function handleReset() {
    setForm({ ...original });
  }

  if (loading) return <div className="card p-6 max-w-2xl"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl space-y-5">
      <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Informasi Toko</h3>
      <div>
        <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>Nama Toko</label>
        <input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.1)" }} />
      </div>
      <div>
        <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>Tagline</label>
        <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.1)" }} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.1)" }} />
        </div>
        <div>
          <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>WhatsApp</label>
          <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.1)" }} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        {dirty && (
          <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
            {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan Perubahan
          </button>
        )}
        <button onClick={handleReset} className="text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
      </div>
    </div>
  );
}

function PaymentMethodsSection() {
  const [banks, setBanks] = useState<{ id: string; bank_name: string; account_name: string; account_number: string; is_active: boolean }[]>([]);
  const [originalBanks, setOriginalBanks] = useState<typeof banks>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, Record<string, boolean>>>({});
  const toast = useToast();

  useEffect(() => {
    supabase.from("payment_methods").select("*").order("display_order").then(({ data }) => {
      if (data) { setBanks(data); setOriginalBanks(JSON.parse(JSON.stringify(data))); }
      setLoading(false);
    });
  }, []);

  function isDirty(bank: typeof banks[0]) {
    const orig = originalBanks.find((b) => b.id === bank.id);
    if (!orig) return true; // new bank
    return orig.bank_name !== bank.bank_name || orig.account_name !== bank.account_name || orig.account_number !== bank.account_number;
  }

  function updateField(id: string, field: string, value: string) {
    setBanks(banks.map((b) => b.id === id ? { ...b, [field]: value } : b));
    setErrors((prev) => ({ ...prev, [id]: { ...prev[id], [field]: false } }));
  }

  async function saveBank(bank: typeof banks[0]) {
    const e: Record<string, boolean> = {};
    if (!bank.bank_name.trim()) e.bank_name = true;
    if (!bank.account_name.trim()) e.account_name = true;
    if (!bank.account_number.trim()) e.account_number = true;
    if (Object.keys(e).length > 0) { setErrors((prev) => ({ ...prev, [bank.id]: e })); return; }

    setSavingId(bank.id);
    const isNew = !originalBanks.find((b) => b.id === bank.id);

    if (isNew) {
      const { data, error } = await supabase.from("payment_methods").insert({
        bank_name: bank.bank_name, account_name: bank.account_name, account_number: bank.account_number,
        is_active: true, display_order: banks.indexOf(bank),
      }).select().single();
      if (!error && data) {
        setBanks(banks.map((b) => b.id === bank.id ? data : b));
        setOriginalBanks([...originalBanks, data]);
        toast.showToast("success", "Rekening berhasil disimpan");
      }
    } else {
      await supabase.from("payment_methods").update({
        bank_name: bank.bank_name, account_name: bank.account_name, account_number: bank.account_number,
      }).eq("id", bank.id);
      setOriginalBanks(originalBanks.map((b) => b.id === bank.id ? { ...b, ...bank } : b));
      toast.showToast("success", "Rekening berhasil disimpan");
    }
    setSavingId(null);
  }

  function addBank() {
    const tempId = "new-" + Date.now();
    setBanks([...banks, { id: tempId, bank_name: "", account_name: "", account_number: "", is_active: true }]);
  }

  function cancelNew(id: string) {
    setBanks(banks.filter((b) => b.id !== id));
  }

  async function toggleBank(id: string, active: boolean) {
    setBanks(banks.map((b) => b.id === id ? { ...b, is_active: active } : b));
    await supabase.from("payment_methods").update({ is_active: active }).eq("id", id);
    toast.showToast("success", active ? "Rekening diaktifkan" : "Rekening dinonaktifkan");
  }

  async function deleteBank(id: string) {
    if (!confirm("Hapus rekening ini?")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    setBanks(banks.filter((b) => b.id !== id));
    setOriginalBanks(originalBanks.filter((b) => b.id !== id));
    toast.showToast("success", "Rekening berhasil dihapus");
  }

  if (loading) return <div className="card p-6"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Metode Pembayaran</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Rekening bank untuk transfer pembayaran</p>
        </div>
        <button onClick={addBank} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>
          <Plus size={14} /> Tambah Rekening
        </button>
      </div>

      <div className="space-y-4">
        {banks.map((bank) => {
          const isNew = !originalBanks.find((b) => b.id === bank.id);
          const dirty = isDirty(bank);
          const bankErrors = errors[bank.id] || {};

          return (
            <div key={bank.id} className="p-4 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.1)", background: bank.is_active ? "rgba(255,255,255,.5)" : "rgba(200,200,200,.1)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: bank.is_active ? "var(--gold)" : "var(--text-muted)" }}>{isNew ? "Baru" : bank.is_active ? "Aktif" : "Nonaktif"}</span>
                <div className="flex items-center gap-2">
                  {!isNew && (
                    <button onClick={() => toggleBank(bank.id, !bank.is_active)} className="text-xs px-2 py-1 rounded" style={{ border: "1px solid rgba(64,50,37,.15)", color: bank.is_active ? "var(--text-muted)" : "var(--gold)" }}>
                      {bank.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  )}
                  {dirty && (
                    <button onClick={() => saveBank(bank)} disabled={savingId === bank.id} className="text-xs px-3 py-1 rounded font-semibold" style={{ background: "var(--gold)", color: "white" }}>
                      {savingId === bank.id ? "..." : "Simpan"}
                    </button>
                  )}
                  {isNew ? (
                    <button onClick={() => cancelNew(bank.id)} className="p-1 rounded hover:bg-red-50" style={{ color: "#e74c3c" }}>
                      <X size={14} />
                    </button>
                  ) : (
                    <button onClick={() => deleteBank(bank.id)} className="p-1 rounded hover:bg-red-50" style={{ color: "#e74c3c" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: bankErrors.bank_name ? "#e74c3c" : "var(--text-muted)" }}>Nama Bank *</label>
                  <input value={bank.bank_name} onChange={(e) => updateField(bank.id, "bank_name", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${bankErrors.bank_name ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="Bank Mandiri" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: bankErrors.account_name ? "#e74c3c" : "var(--text-muted)" }}>Nama Pemilik *</label>
                  <input value={bank.account_name} onChange={(e) => updateField(bank.id, "account_name", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${bankErrors.account_name ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="PT Samaqu Digital" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: bankErrors.account_number ? "#e74c3c" : "var(--text-muted)" }}>Nomor Rekening *</label>
                  <input value={bank.account_number} onChange={(e) => updateField(bank.id, "account_number", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${bankErrors.account_number ? "#e74c3c" : "rgba(64,50,37,.15)"}`, background: "white", color: "var(--espresso)" }} placeholder="1234567890123" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomerProductsSection() {
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; image: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      supabase.from("featured_products").select("product_id, display_order").order("display_order"),
      supabase.from("products").select("id, name, image, category").order("created_at", { ascending: false }),
    ]).then(([fpRes, pRes]) => {
      if (fpRes.data) setFeaturedIds(fpRes.data.map((r) => r.product_id));
      if (pRes.data) setAllProducts(pRes.data);
      setLoading(false);
    });
  }, []);

  function toggleProduct(id: string) {
    setSaved(false);
    setFeaturedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function save() {
    setSaving(true);
    await supabase.from("featured_products").delete().neq("product_id", "");
    if (featuredIds.length > 0) {
      await supabase.from("featured_products").insert(featuredIds.map((id, i) => ({ product_id: id, display_order: i })));
    }
    setSaving(false);
    setSaved(true);
    toast.showToast("success", "Produk pilihan berhasil disimpan");
  }

  if (loading) return <div className="card p-6"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Produk Pilihan Customer</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Tampil di dashboard customer section "Koleksi Pilihan" (maks 8)</p>
        </div>
        <button onClick={save} disabled={saving || featuredIds.length === 0} className="text-xs px-4 py-2 rounded-xl font-semibold text-white" style={{ background: saved ? "#5b6b45" : "var(--gold)", opacity: saving || featuredIds.length === 0 ? 0.5 : 1 }}>
          {saving ? "..." : saved ? "Tersimpan" : "Simpan"}
        </button>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Dipilih: {featuredIds.length} / 8 produk</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {allProducts.map((p) => {
          const selected = featuredIds.includes(p.id);
          return (
            <button key={p.id} onClick={() => { if (!selected && featuredIds.length >= 8) return; toggleProduct(p.id); }} className="rounded-xl overflow-hidden text-left transition-all" style={{ border: selected ? "2px solid var(--gold)" : "1px solid rgba(64,50,37,.1)", opacity: !selected && featuredIds.length >= 8 ? 0.4 : 1 }}>
              <div className="aspect-square" style={{ background: "#e8dfd1" }}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate" style={{ color: "var(--espresso)" }}>{p.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.category}</p>
              </div>
              {selected && <div className="text-center text-[10px] py-1 font-medium" style={{ background: "rgba(181,140,74,.1)", color: "var(--gold)" }}>Dipilih</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QrisEwalletSection() {
  const [methods, setMethods] = useState<{ id: string; provider_name: string; method_type: string; account_info: string; qr_image_url: string; is_active: boolean }[]>([]);
  const [originalMethods, setOriginalMethods] = useState<typeof methods>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    supabase.from("qris_ewallet_methods").select("*").order("display_order").then(({ data }) => {
      if (data) { setMethods(data); setOriginalMethods(JSON.parse(JSON.stringify(data))); }
      setLoading(false);
    });
  }, []);

  function isDirty(m: typeof methods[0]) {
    const orig = originalMethods.find((o) => o.id === m.id);
    if (!orig) return true;
    return orig.provider_name !== m.provider_name || orig.method_type !== m.method_type || orig.account_info !== m.account_info || orig.qr_image_url !== m.qr_image_url;
  }

  function updateField(id: string, field: string, value: string) {
    setMethods(methods.map((m) => m.id === id ? { ...m, [field]: value } : m));
  }

  async function uploadQrisImage(id: string, file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { toast.showToast("error", "Format file tidak didukung (JPG/PNG/WebP)"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.showToast("error", "Ukuran file maksimal 5MB"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "samaqu_unsigned");
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/dgtixuop0/image/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url) {
        setMethods(methods.map((m) => m.id === id ? { ...m, qr_image_url: data.secure_url } : m));
        await supabase.from("qris_ewallet_methods").update({ qr_image_url: data.secure_url }).eq("id", id);
        toast.showToast("success", "QR Code berhasil diupload");
      }
    } catch { toast.showToast("error", "Gagal upload gambar"); }
  }

  async function addMethod() {
    const tempId = "new-" + Date.now();
    setMethods([...methods, { id: tempId, provider_name: "", method_type: "qris", account_info: "", qr_image_url: "", is_active: true }]);
  }

  function cancelNew(id: string) {
    setMethods(methods.filter((m) => m.id !== id));
  }

  async function saveMethod(method: typeof methods[0]) {
    if (!method.provider_name.trim()) { toast.showToast("error", "Nama provider wajib diisi"); return; }
    setSavingId(method.id);
    const isNew = !originalMethods.find((o) => o.id === method.id);

    if (isNew) {
      const { data, error } = await supabase.from("qris_ewallet_methods").insert({
        provider_name: method.provider_name, method_type: method.method_type, account_info: method.account_info, qr_image_url: method.qr_image_url,
        is_active: true, display_order: methods.indexOf(method),
      }).select().single();
      if (!error && data) {
        setMethods(methods.map((m) => m.id === method.id ? data : m));
        setOriginalMethods([...originalMethods, data]);
        toast.showToast("success", "Berhasil disimpan");
      }
    } else {
      await supabase.from("qris_ewallet_methods").update({
        provider_name: method.provider_name, method_type: method.method_type, account_info: method.account_info, qr_image_url: method.qr_image_url,
      }).eq("id", method.id);
      setOriginalMethods(originalMethods.map((m) => m.id === method.id ? { ...m, ...method } : m));
      toast.showToast("success", "Berhasil disimpan");
    }
    setSavingId(null);
  }

  async function toggleMethod(id: string, active: boolean) {
    setMethods(methods.map((m) => m.id === id ? { ...m, is_active: active } : m));
    await supabase.from("qris_ewallet_methods").update({ is_active: active }).eq("id", id);
    toast.showToast("success", active ? "Diaktifkan" : "Dinonaktifkan");
  }

  async function deleteMethod(id: string) {
    if (!confirm("Hapus metode ini?")) return;
    await supabase.from("qris_ewallet_methods").delete().eq("id", id);
    setMethods(methods.filter((m) => m.id !== id));
    setOriginalMethods(originalMethods.filter((m) => m.id !== id));
    toast.showToast("success", "Berhasil dihapus");
  }

  if (loading) return <div className="card p-6"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>QRIS / E-Wallet</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Metode pembayaran digital</p>
        </div>
        <button onClick={addMethod} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>
          <Plus size={14} /> Tambah
        </button>
      </div>
      <div className="space-y-4">
        {methods.map((m) => {
          const isNew = !originalMethods.find((o) => o.id === m.id);
          const dirty = isDirty(m);

          return (
            <div key={m.id} className="p-4 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.1)", background: m.is_active ? "rgba(255,255,255,.5)" : "rgba(200,200,200,.1)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: m.is_active ? "var(--gold)" : "var(--text-muted)" }}>{isNew ? "Baru" : m.is_active ? "Aktif" : "Nonaktif"}</span>
                <div className="flex items-center gap-2">
                  {!isNew && (
                    <button onClick={() => toggleMethod(m.id, !m.is_active)} className="text-xs px-2 py-1 rounded" style={{ border: "1px solid rgba(64,50,37,.15)", color: m.is_active ? "var(--text-muted)" : "var(--gold)" }}>
                      {m.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  )}
                  {dirty && (
                    <button onClick={() => saveMethod(m)} disabled={savingId === m.id} className="text-xs px-3 py-1 rounded font-semibold" style={{ background: "var(--gold)", color: "white" }}>
                      {savingId === m.id ? "..." : "Simpan"}
                    </button>
                  )}
                  {isNew ? (
                    <button onClick={() => cancelNew(m.id)} className="p-1 rounded hover:bg-red-50" style={{ color: "#e74c3c" }}><X size={14} /></button>
                  ) : (
                    <button onClick={() => deleteMethod(m.id)} className="p-1 rounded hover:bg-red-50" style={{ color: "#e74c3c" }}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Nama Provider *</label>
                  <input value={m.provider_name} onChange={(e) => updateField(m.id, "provider_name", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="QRIS SAMAQU / GoPay / OVO" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Tipe</label>
                  <select value={m.method_type} onChange={(e) => updateField(m.id, "method_type", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}>
                    <option value="qris">QRIS</option>
                    <option value="gopay">GoPay</option>
                    <option value="ovo">OVO</option>
                    <option value="dana">Dana</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  {m.method_type === "qris" ? (
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Gambar QR Code</label>
                      {m.qr_image_url ? (
                        <div className="flex items-start gap-3">
                          <img src={m.qr_image_url} alt="QR Code" className="w-24 h-24 object-contain rounded-lg border" style={{ borderColor: "rgba(64,50,37,.1)" }} />
                          <div className="flex flex-col gap-2">
                            <label className="cursor-pointer text-xs px-3 py-1.5 rounded font-medium text-center inline-block" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>
                              Ganti
                              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQrisImage(m.id, f); }} />
                            </label>
                            <button onClick={() => updateField(m.id, "qr_image_url", "")} className="text-xs px-3 py-1.5 rounded font-medium" style={{ border: "1px solid rgba(64,50,37,.15)", color: "#e74c3c" }}>Hapus</button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl cursor-pointer transition-colors" style={{ border: "2px dashed rgba(64,50,37,.2)", background: "rgba(255,255,255,.3)" }}>
                          <Upload size={18} style={{ color: "var(--text-muted)" }} />
                          <span className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Klik untuk upload QR Code</span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>JPG / PNG / WebP, max 5MB</span>
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQrisImage(m.id, f); }} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Nomor Tujuan / Nama Akun *</label>
                      <input value={m.account_info} onChange={(e) => updateField(m.id, "account_info", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="0812xxxx / a.n. SAMAQU" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, badge, badgeColor }: { icon: React.ReactNode; label: string; value: string; badge: string; badgeColor: string }) {
  const [bg, color] = badgeColor.split(",");
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-secondary)", color: "var(--gold)" }}>{icon}</span>
        <span className="badge" style={{ background: bg, color }}>{badge}</span>
      </div>
      <p className="text-sm mt-4" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: "var(--espresso)" }}>{value}</p>
    </div>
  );
}

export default function AdminPage() {
  return <AdminPageInner />;
}
