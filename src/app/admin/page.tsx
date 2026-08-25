"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getThumbnailFromImages } from "@/lib/product-thumbnail";
import {
  LayoutDashboard, ShoppingBag, Package, Users, FileText, Settings,
  Search, Bell, Menu, X, ChevronDown, Plus, TrendingUp, Eye, Edit,
  DollarSign, ShoppingCart, UserPlus, Box, LogOut, Lock, Mail, Loader2, Trash2, Upload, Ticket, Star, Ruler,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/AdminToast";

type Panel = "dashboard" | "orders" | "products" | "customers" | "content" | "featured" | "settings";

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
  awb_no: string | null;
  created_at: string;
  order_items?: { product_name: string; color: string; size: string; series?: string | null; kain?: string | null; quantity: number; price: number; customer_price: number | null; minimum_price: number | null }[];
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  minimum_price?: number | null;
  create_your_price_enabled?: boolean;
  series?: string | null;
  kain?: string | null;
  colors?: string[];
  jenis_kain?: { name: string } | null;
}

interface AdminCatalogProduct extends Product {
  availableSeries?: string[];
  memberIds?: string[];
}

const navItems = [
  { id: "dashboard" as Panel, label: "Dashboard", icon: LayoutDashboard },
  { id: "orders" as Panel, label: "Pesanan", icon: ShoppingBag, badge: true },
  { id: "products" as Panel, label: "Produk", icon: Package },
  { id: "customers" as Panel, label: "Pelanggan", icon: Users },
  { id: "content" as Panel, label: "Konten Website", icon: FileText },
  { id: "featured" as Panel, label: "Produk Pilihan", icon: Package },
  { id: "settings" as Panel, label: "Pengaturan", icon: Settings },
];

const panelTitles: Record<Panel, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Selamat datang kembali, kelola toko SAMAQU Anda." },
  orders: { title: "Pesanan", sub: "Pantau dan proses seluruh pesanan pelanggan." },
  products: { title: "Produk", sub: "Kelola katalog dan stok koleksi." },
  customers: { title: "Pelanggan", sub: "Data dan riwayat belanja pelanggan." },
  content: { title: "Konten Website", sub: "Atur tampilan halaman publik SAMAQU." },
  featured: { title: "Produk Pilihan Customer", sub: "Pilih produk yang tampil di dashboard customer." },
  settings: { title: "Pengaturan", sub: "Konfigurasi informasi toko." },
};

function money(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function effectivePrice(p: Product): number {
  return p.create_your_price_enabled && p.minimum_price ? p.minimum_price : p.price;
}

function groupByMainProduct(raw: Product[]): AdminCatalogProduct[] {
  const groups = new Map<string, Product[]>();
  for (const p of raw) {
    const key = `${p.category}::${p.name}`;
    const list = groups.get(key) || [];
    list.push(p);
    groups.set(key, list);
  }

  const items: AdminCatalogProduct[] = [];
  for (const group of groups.values()) {
    const rep: AdminCatalogProduct = { ...group[0], memberIds: group.map((m) => m.id) };

    if (group.length > 1) {
      let cheapest = group[0];
      let cheapestValue = effectivePrice(group[0]);
      for (const member of group) {
        const value = effectivePrice(member);
        if (value < cheapestValue) {
          cheapestValue = value;
          cheapest = member;
        }
      }
      rep.price = cheapestValue;
      rep.minimum_price = cheapest.minimum_price;
      rep.create_your_price_enabled = cheapest.create_your_price_enabled;
      rep.availableSeries = [...new Set(group.map((m) => m.series).filter((s): s is string => !!s))].sort();
    }

    items.push(rep);
  }

  return items;
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
  const [productThumbnails, setProductThumbnails] = useState<Record<string, string>>({});
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
    // Match product images (use thumbnails to skip videos)
    const result = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
    result.forEach((item) => {
      const product = products.find((p) => p.name === item.name);
      if (product) item.image = productThumbnails[product.id] || product.image || "";
    });
    return result;
  }, [orders, products]);

  const catalogItems = useMemo(() => groupByMainProduct(products), [products]);

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
          supabase.from("orders").select("*, order_items(product_name, color, size, series, kain, quantity, price, customer_price, minimum_price)").order("created_at", { ascending: false }).limit(50),
          supabase.from("products").select("*").order("created_at", { ascending: true }),
        ]);
        if (mounted) {
          if (ordersRes.data) setOrders(ordersRes.data as Order[]);
          if (productsRes.data) {
            setProducts(productsRes.data as Product[]);
            // Fetch thumbnails: first non-video image from product_images, fallback to product.image
            const thumbs: Record<string, string> = {};
            const productIds = (productsRes.data as Product[]).map((p) => p.id);
            if (productIds.length > 0) {
              const { data: allImgs } = await supabase
                .from("product_images")
                .select("product_id, url, is_video")
                .in("product_id", productIds)
                .order("display_order");
              if (allImgs) {
                for (const p of productsRes.data as Product[]) {
                  thumbs[p.id] = getThumbnailFromImages(p.id, p.image, allImgs);
                }
              }
            }
            setProductThumbnails(thumbs);
          }
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
    // Sign out any existing session first (customer might be logged in)
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return;
    }
    const u = data.user;
    const { data: adminData } = await supabase.from("admins").select("role").eq("user_id", u.id).single();
    if (!adminData) {
      await supabase.auth.signOut();
      setAuthError("Akun ini bukan akun admin. Silakan gunakan akun admin yang benar.");
      return;
    }
    setUser(u);
    setRole(adminData.role);
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

  async function handleDeleteProduct(id: string, name: string, memberIds?: string[]) {
    const ids = memberIds && memberIds.length > 0 ? memberIds : [id];
    const label = ids.length > 1 ? `"${name}" (${ids.length} produk)` : `"${name}"`;
    showConfirm("Hapus Produk?", `Yakin ingin menghapus ${label}? Tindakan ini tidak bisa dibatalkan.`, async () => {
      try {
        await supabase.from("product_images").delete().in("product_id", ids);
        await supabase.from("product_variants").delete().in("product_id", ids);
        await supabase.from("products").delete().in("id", ids);
        setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
        toast.showToast("success", "Produk berhasil dihapus");
      } catch (err) {
        console.error("Delete error:", err);
        toast.showToast("error", "Gagal menghapus produk, coba lagi");
      }
    });
  }

  async function updateOrderStatus(orderNumber: string, newStatus: string) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.showToast("error", data.error || "Gagal memperbarui status");
        return;
      }
      setOrders((prev) => prev.map((o) => o.order_number === orderNumber ? { ...o, status: newStatus } : o));
      setSelectedOrder((prev) => prev && prev.order_number === orderNumber ? { ...prev, status: newStatus } : prev);
      toast.showToast("success", "Status pesanan berhasil diperbarui");
    } catch (err) {
      console.error("Update status error:", err);
      toast.showToast("error", "Gagal memperbarui status, coba lagi");
    }
  }

  async function deleteOrder(orderNumber: string) {
    showConfirm("Hapus Pesanan?", "Yakin ingin menghapus pesanan ini? Tindakan ini tidak bisa dibatalkan.", async () => {
      try {
        const res = await fetch("/api/admin/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.showToast("error", data.error || "Gagal menghapus pesanan");
          return;
        }
        setOrders((prev) => prev.filter((o) => o.order_number !== orderNumber));
        setSelectedOrder(null);
        setDeleteConfirmOrder(null);
        toast.showToast("success", "Pesanan berhasil dihapus");
      } catch (err) {
        console.error("Delete order error:", err);
        toast.showToast("error", "Gagal menghapus pesanan, coba lagi");
      }
    });
  }

  async function cancelJntOrder(order: Order) {
    showConfirm("Batalkan di J&T?", `Yakin ingin membatalkan pengiriman J&T untuk pesanan ${order.order_number}? AWB ${order.awb_no || "-"} akan dicancel.`, async () => {
      try {
        const res = await fetch("/api/admin/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber: order.order_number, action: "cancelJnt" }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.showToast("error", data.error || "Gagal membatalkan J&T");
          return;
        }
        setOrders((prev) => prev.map((o) => o.order_number === order.order_number ? { ...o, status: "dibatalkan" } : o));
        setSelectedOrder((prev) => prev && prev.order_number === order.order_number ? { ...prev, status: "dibatalkan" } : prev);
        toast.showToast("success", "Berhasil membatalkan pesanan di J&T");
      } catch (err) {
        console.error("Cancel J&T error:", err);
        toast.showToast("error", "Gagal membatalkan J&T, coba lagi");
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
          <Link
            href="/admin/testimoni"
            className="sidebar-link w-full text-left"
            onClick={() => setSidebarOpen(false)}
          >
            <Star size={20} strokeWidth={1.6} />
            <span>Testimoni</span>
          </Link>
          <Link
            href="/admin/ukuran-produk"
            className="sidebar-link w-full text-left"
            onClick={() => setSidebarOpen(false)}
          >
            <Ruler size={20} strokeWidth={1.6} />
            <span>Panduan Ukuran</span>
          </Link>
          <Link
            href="/admin/garansi-retur-page"
            className="sidebar-link w-full text-left"
            onClick={() => setSidebarOpen(false)}
          >
            <FileText size={20} strokeWidth={1.6} />
            <span>Halaman Garansi &amp; Retur</span>
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
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                              ) : null}
                              <div className={`w-full h-full ${p.image ? "hidden" : ""}`} style={{ background: `linear-gradient(135deg, ${["#c8b18a,#8b6f42", "#e0d3bd,#b58c4a", "#9c8468,#403225", "#d4a574,#8b6f42", "#bfa789,#6b5d50"][i]})` }} />
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
                    {catalogItems.map((p) => (
                      <div key={p.id} className="card overflow-hidden group">
                        {/* Image */}
                        <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "#e8dfd1" }}>
                          <img src={productThumbnails[p.id] || p.image || ""} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                          <span className="absolute top-3 left-3 badge" style={{ background: "rgba(255,255,255,.8)", color: "var(--espresso)" }}>{p.category}</span>
                        </div>
                        {/* Info */}
                        <div className="p-4 flex flex-col">
                          {/* Name */}
                          <h3 className="font-semibold text-sm leading-snug" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
                            {p.name}
                          </h3>
                          {/* Kain */}
                          {(p.jenis_kain?.name || p.kain) && (
                            <p className="mt-1 text-[11px] font-ui" style={{ color: "var(--gold)" }}>
                              Kain {p.jenis_kain?.name || p.kain}
                            </p>
                          )}
                          {/* Series info */}
                          {p.availableSeries && p.availableSeries.length > 1 && (
                            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10.5px] font-ui" style={{ color: "var(--text-muted)" }}>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(181,140,74,.08)", border: "1px solid rgba(181,140,74,.2)" }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: "var(--gold)" }}>
                                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                  <path d="m3.3 7 8.7 5 8.7-5" />
                                  <path d="M12 22V12" />
                                </svg>
                                {p.availableSeries.length} series tersedia
                              </span>
                            </p>
                          )}
                          {/* Price */}
                          <p className="mt-2 text-[12.5px] font-ui" style={{ color: "var(--text-muted)" }}>
                            Mulai{" "}
                            <span className="font-medium" style={{ color: "var(--espresso)" }}>
                              {p.create_your_price_enabled && p.minimum_price
                                ? `Rp ${p.minimum_price.toLocaleString("id-ID")}`
                                : `Rp ${p.price.toLocaleString("id-ID")}`}
                            </span>
                          </p>
                          {/* Actions */}
                          <div className="flex gap-2 mt-3">
                            <Link href={`/admin/produk/edit/${p.id}`} className="flex-1 text-xs font-semibold py-2 rounded-lg text-center" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Edit</Link>
                            <Link href={`/admin/produk/detail/${p.id}`} className="flex-1 text-xs font-semibold py-2 rounded-lg text-center text-white" style={{ background: "var(--gold)" }}>Detail</Link>
                            <button onClick={() => handleDeleteProduct(p.id, p.name, p.memberIds)} className="flex-1 text-xs font-semibold py-2 rounded-lg text-center" style={{ border: "1px solid rgba(231,76,60,.3)", color: "#e74c3c" }}>Hapus</button>
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

                  {/* Shipping Origin */}
                  <ShippingOriginSection />

                  {/* Shipping Provider */}
                  <ShippingProviderSection />

                  {/* Courier Selection */}
                  <CourierSettingsSection />

                  {/* RajaOngkir API Key */}
                  <ApiKeySection />

                  {/* Social Media */}
                  <SocialMediaSection />

                  {/* Meta Pixel */}
                  <MetaPixelSection />

                  {/* Payment Methods */}
                  <PaymentMethodsSection />
                  <QrisEwalletSection />
                </div>
              )}

              {/* PRODUCTS PRIORITY */}
              {activePanel === "featured" && (
                <div className="space-y-6">
                  <CustomerProductsSection />
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
                       <button key={s} onClick={() => updateOrderStatus(selectedOrder.order_number, s)} className="text-xs px-4 py-2 rounded-lg font-medium transition-all" style={{ background: selectedOrder.status === s ? "var(--gold)" : "transparent", color: selectedOrder.status === s ? "#fff" : "var(--text-secondary)", border: selectedOrder.status === s ? "none" : "1px solid rgba(64,50,37,.15)" }}>
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
                    <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Metode Pembayaran</span><span className="font-medium" style={{ color: "var(--espresso)" }}>{selectedOrder.payment_method === "bank" || selectedOrder.payment_method?.startsWith?.("pm_") || /^[0-9a-f]{8}-/.test(selectedOrder.payment_method || "") ? "Transfer Bank" : selectedOrder.payment_method === "qris" ? "QRIS / E-Wallet" : selectedOrder.payment_method === "cod" ? "COD" : selectedOrder.payment_method || "-"}</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Metode Pengiriman</span><span className="font-medium" style={{ color: "var(--espresso)" }}>{selectedOrder.shipping_method || "-"}</span></div>
                  </div>
                </div>

                {/* Expedition + Shipping Cost */}
                {selectedOrder.shipping_method && selectedOrder.shipping_method !== "manual" && (
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
                    <p className="text-[11px] tracking-[0.15em] uppercase mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Pengiriman</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium" style={{ color: "var(--espresso)" }}>{selectedOrder.shipping_method}</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>{money(selectedOrder.shipping_cost)}</span>
                    </div>
                    {selectedOrder.awb_no && (
                      <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}>
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>No. Resi</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--gold)", fontFamily: "'Consolas', 'Courier New', monospace", letterSpacing: "1px" }}>{selectedOrder.awb_no}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Items */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(64,50,37,.06)" }}>
                  <p className="text-[11px] tracking-[0.15em] uppercase mb-3 font-medium" style={{ color: "var(--text-muted)" }}>Produk Dipesan</p>
                  {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.order_items.map((item, i) => (
                        <div key={i} className="flex justify-between items-start text-sm">
                          <div>
                            <p className="font-medium" style={{ color: "var(--espresso)" }}>{item.product_name}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                              {[item.kain ? `Kain ${item.kain}` : null, item.series, item.color && item.color !== "default" ? item.color : null, item.size].filter(Boolean).join(' · ')} &times; {item.quantity}
                            </p>
                            {/* CYP info */}
                            {item.customer_price && item.minimum_price && (
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--gold)" }}>
                                Min: {money(item.minimum_price)} · Dipilih: {money(item.customer_price)}
                              </p>
                            )}
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
                <div className="flex items-center gap-2">
                   {selectedOrder.awb_no && selectedOrder.status !== "dibatalkan" && (
                    <button onClick={(e) => { e.stopPropagation(); cancelJntOrder(selectedOrder); }} className="text-xs font-medium px-4 py-2 rounded-lg" style={{ border: "1px solid rgba(231,76,60,.3)", color: "#e74c3c" }}>
                      Batalkan J&T
                    </button>
                  )}
                  {selectedOrder.awb_no && (
                    <a href={`/admin/label/${selectedOrder.order_number}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs font-medium px-4 py-2 rounded-lg" style={{ border: "1px solid rgba(64,50,37,.3)", color: "var(--gold)", textDecoration: "none" }}>
                      Cetak Label
                    </a>
                  )}
                   <button onClick={(e) => { e.stopPropagation(); deleteOrder(selectedOrder.order_number); }} className="text-xs font-medium px-4 py-2 rounded-lg" style={{ border: "1px solid rgba(231,76,60,.3)", color: "#e74c3c" }}>
                    Hapus Pesanan
                  </button>
                </div>
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

const AVAILABLE_COURIERS = [
  { code: "jne", name: "JNE" },
  { code: "sicepat", name: "SiCepat" },
  { code: "jnt", name: "J&T Express" },
  { code: "ninja", name: "Ninja" },
  { code: "tiki", name: "TIKI" },
  { code: "wahana", name: "Wahana" },
  { code: "pos", name: "POS Indonesia" },
  { code: "lion", name: "Lion Parcel" },
  { code: "anteraja", name: "AnterAja" },
];

function ShippingOriginSection() {
  const [form, setForm] = useState({ origin_district_id: "", origin_province_id: "", origin_city_id: "" });
  const [provinces, setProvinces] = useState<{ id: number; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownsLoading, setDropdownsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedDistrictId, setSavedDistrictId] = useState<string | null>(null);
  const toast = useToast();

  // Effect 1: Load saved IDs + show form + fetch dropdown data
  useEffect(() => {
    async function init() {
      console.log("[ADMIN] ShippingOriginSection init start");

      // Load saved origin IDs from Supabase
      const { data } = await supabase.from("store_settings").select("origin_district_id, origin_province_id, origin_city_id, origin_district_step_id").eq("id", 1).single();
      console.log("[ADMIN] Saved origin:", data);

      // Set province + city immediately (dropdowns exist or will exist soon)
      if (data?.origin_province_id && data?.origin_city_id) {
        setForm({
          origin_province_id: String(data.origin_province_id),
          origin_city_id: String(data.origin_city_id),
          origin_district_id: "", // NOT set yet — wait for districts to load
        });
        // Use step-by-step ID for dropdown (falls back to direct search ID for legacy data)
        const stepId = data.origin_district_step_id || data.origin_district_id;
        if (stepId) {
          setSavedDistrictId(String(stepId));
        }
      }

      setLoading(false);

      // Load dropdown data
      try {
        const provRes = await fetch("/api/shipping/provinces");
        const provJson = await provRes.json();
        setProvinces(provJson.data || []);
        console.log("[ADMIN] Provinces loaded:", provJson.data?.length, "| cache:", provRes.headers.get("X-Cache"));

        if (data?.origin_province_id && data?.origin_city_id) {
          const [cityRes, distRes] = await Promise.all([
            fetch(`/api/shipping/districts?provinceId=${data.origin_province_id}`),
            fetch(`/api/shipping/districts?cityId=${data.origin_city_id}`),
          ]);
          const [cityJson, distJson] = await Promise.all([cityRes.json(), distRes.json()]);
          setCities(cityJson.data || []);
          setDistricts(distJson.data || []);
          console.log("[ADMIN] Cities loaded:", cityJson.data?.length, "| cache:", cityRes.headers.get("X-Cache"));
          console.log("[ADMIN] Districts loaded:", distJson.data?.length, "| cache:", distRes.headers.get("X-Cache"));
        }
      } catch (e) {
        console.error("[ADMIN] Load error:", e);
      } finally {
        setDropdownsLoading(false);
      }
    }
    init();
  }, []);

  // Effect 2: Set district value ONLY AFTER districts array is populated
  useEffect(() => {
    if (savedDistrictId && districts.length > 0) {
      console.log("[ADMIN] Setting district value after districts loaded:", savedDistrictId);
      setForm((f) => ({ ...f, origin_district_id: savedDistrictId }));
      setSavedDistrictId(null);
    }
  }, [districts, savedDistrictId]);

  async function handleProvChange(provId: string) {
    const selectedProv = provinces.find((p) => String(p.id) === provId);
    console.log("[ADMIN] Province selected:", { id: provId, name: selectedProv?.name });
    setForm({ origin_province_id: provId, origin_city_id: "", origin_district_id: "" });
    setCities([]);
    setDistricts([]);
    if (!provId) return;
    console.log("[ADMIN] Loading cities for province:", provId, selectedProv?.name);
    const res = await fetch(`/api/shipping/districts?provinceId=${provId}`);
    const json = await res.json();
    setCities(json.data || []);
    console.log("[ADMIN] Cities loaded:", json.data?.length);
  }

  async function handleCityChange(cityId: string) {
    const selectedCity = cities.find((c) => String(c.id) === cityId);
    console.log("[ADMIN] City selected:", { id: cityId, name: selectedCity?.name });
    setForm((f) => ({ ...f, origin_city_id: cityId, origin_district_id: "" }));
    setDistricts([]);
    if (!cityId) return;
    console.log("[ADMIN] Loading districts for city:", cityId, selectedCity?.name);
    const res = await fetch(`/api/shipping/districts?cityId=${cityId}`);
    const json = await res.json();
    setDistricts(json.data || []);
    console.log("[ADMIN] Districts loaded:", json.data?.length);
  }

  async function handleSave() {
    setSaving(true);
    const selectedProv = provinces.find((p) => String(p.id) === form.origin_province_id);
    const selectedCity = cities.find((c) => String(c.id) === form.origin_city_id);
    const selectedDist = districts.find((d) => String(d.id) === form.origin_district_id);
    console.log("[ADMIN] === SAVE ORIGIN START ===");
    console.log("[ADMIN] Step-by-step IDs:", {
      province: `${form.origin_province_id} (${selectedProv?.name})`,
      city: `${form.origin_city_id} (${selectedCity?.name})`,
      district: `${form.origin_district_id} (${selectedDist?.name})`,
    });

    // IMPORTANT: Resolve step-by-step district ID to direct search subdistrict ID
    // RajaOngkir V2 has 2 different ID systems — cost calculation needs direct search IDs
    let directSearchId = form.origin_district_id ? Number(form.origin_district_id) : null;

    if (selectedDist?.name && selectedCity?.name && selectedProv?.name) {
      console.log("[ADMIN] Resolving direct search ID for:", selectedDist.name, selectedCity.name, selectedProv.name);
      try {
        const searchQuery = encodeURIComponent(selectedDist.name);
        const searchRes = await fetch(`/api/shipping/search-destination?search=${searchQuery}&city=${encodeURIComponent(selectedCity.name)}&province=${encodeURIComponent(selectedProv.name)}&limit=5`);
        const searchJson = await searchRes.json();
        console.log("[ADMIN] Search results:", searchJson);

        if (searchJson.match?.id) {
          directSearchId = searchJson.match.id;
          console.log("[ADMIN] ✅ Direct search ID resolved:", directSearchId, "(", searchJson.match.subdistrict_name || searchJson.match.name, ")");
        } else {
          console.warn("[ADMIN] ⚠️ No direct search match found, using step-by-step ID:", directSearchId);
        }
      } catch (e) {
        console.error("[ADMIN] ❌ Direct search failed, using step-by-step ID:", e);
      }
    }

    console.log("[ADMIN] Final origin_district_id to save:", directSearchId);
    await supabase.from("store_settings").upsert({
      id: 1,
      origin_province_id: form.origin_province_id ? Number(form.origin_province_id) : null,
      origin_city_id: form.origin_city_id ? Number(form.origin_city_id) : null,
      origin_district_id: directSearchId, // direct search ID (for shipping cost)
      origin_district_step_id: form.origin_district_id ? Number(form.origin_district_id) : null, // step-by-step ID (for dropdown)
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    console.log("[ADMIN] === SAVE ORIGIN DONE ===");
    toast.showToast("success", "Alamat pengiriman toko disimpan");
  }

  // Helper: find name from list by ID
  const findName = (list: { id: number; name: string }[], id: string) => list.find((i) => String(i.id) === id)?.name;

  if (loading) return <div className="card p-6 max-w-2xl"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Alamat Pengiriman Toko (Origin)</h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Lokasi toko Anda, digunakan sebagai asal pengiriman saat hitung ongkir.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Provinsi</label>
          {dropdownsLoading && form.origin_province_id ? (
            <div className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm" style={{ border: "1px solid rgba(64,50,37,.1)" }}>
              {findName(provinces, form.origin_province_id) || "Memuat..."}
            </div>
          ) : (
            <select value={form.origin_province_id} onChange={(e) => handleProvChange(e.target.value)} className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.1)" }}>
              <option value="">Pilih</option>
              {provinces.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Kota / Kabupaten</label>
          {dropdownsLoading && form.origin_city_id ? (
            <div className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm" style={{ border: "1px solid rgba(64,50,37,.1)", opacity: !form.origin_province_id ? 0.5 : 1 }}>
              {findName(cities, form.origin_city_id) || "Memuat..."}
            </div>
          ) : (
            <select value={form.origin_city_id} onChange={(e) => handleCityChange(e.target.value)} disabled={!form.origin_province_id} className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.1)", opacity: !form.origin_province_id ? 0.5 : 1 }}>
              <option value="">Pilih</option>
              {cities.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Kecamatan</label>
          {dropdownsLoading && form.origin_district_id ? (
            <div className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm" style={{ border: "1px solid rgba(64,50,37,.1)", opacity: !form.origin_city_id ? 0.5 : 1 }}>
              {findName(districts, form.origin_district_id) || "Memuat..."}
            </div>
          ) : (
            <select value={form.origin_district_id} onChange={(e) => setForm((f) => ({ ...f, origin_district_id: e.target.value }))} disabled={!form.origin_city_id} className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.1)", opacity: !form.origin_city_id ? 0.5 : 1 }}>
              <option value="">Pilih</option>
              {districts.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        {form.origin_district_id && (
          <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
            {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
          </button>
        )}
      </div>
    </div>
  );
}

function ShippingProviderSection() {
  const [provider, setProvider] = useState<"rajaongkir" | "jnt">("rajaongkir");
  const [original, setOriginal] = useState<"rajaongkir" | "jnt">("rajaongkir");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    supabase.from("store_settings").select("shipping_provider").eq("id", 1).single().then(({ data }) => {
      if (data?.shipping_provider) {
        setProvider(data.shipping_provider);
        setOriginal(data.shipping_provider);
      }
      setLoading(false);
    });
  }, []);

  const dirty = provider !== original;

  async function handleSave() {
    setSaving(true);
    await supabase.from("store_settings").upsert({ id: 1, shipping_provider: provider, updated_at: new Date().toISOString() });
    setOriginal(provider);
    setSaving(false);
    toast.showToast("success", "Provider pengiriman disimpan");
  }

  if (loading) return <div className="card p-6 max-w-2xl"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Provider Pengiriman</h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pilih provider ongkir yang dipakai di checkout. J&T API = langsung ke J&T tanpa perantara. RajaOngkir = semua ekspedisi via RajaOngkir.</p>
      <div className="flex gap-3">
        {([
          { value: "rajaongkir" as const, label: "RajaOngkir", desc: "Semua ekspedisi (JNE, SiCepat, J&T, dll)" },
          { value: "jnt" as const, label: "J&T API Langsung", desc: "Hanya J&T, tanpa perantara" },
        ]).map((opt) => (
          <label key={opt.value} className="flex-1 flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${provider === opt.value ? "var(--gold)" : "rgba(64,50,37,.15)"}`, background: provider === opt.value ? "rgba(181,140,74,.04)" : "white" }}>
            <input type="radio" name="shipping_provider" checked={provider === opt.value} onChange={() => setProvider(opt.value)} className="sr-only" />
            <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: `2px solid ${provider === opt.value ? "var(--gold)" : "var(--text-muted)"}`, background: provider === opt.value ? "var(--gold)" : "transparent" }}>
              {provider === opt.value && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
            <div>
              <span className="text-sm font-medium" style={{ color: "var(--espresso)" }}>{opt.label}</span>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>
      {dirty && (
        <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
          {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan Perubahan
        </button>
      )}
    </div>
  );
}

function CourierSettingsSection() {
  const [enabled, setEnabled] = useState<string[]>([]);
  const [original, setOriginal] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    console.log("[ADMIN] CourierSettingsSection init start");
    supabase.from("store_settings").select("enabled_couriers").eq("id", 1).single().then(({ data, error }) => {
      if (error) console.error("[ADMIN] CourierSettings fetch error:", error);
      console.log("[ADMIN] Enabled couriers raw:", data?.enabled_couriers);
      if (data?.enabled_couriers) {
        try {
          const list = typeof data.enabled_couriers === "string" ? JSON.parse(data.enabled_couriers) : data.enabled_couriers;
          console.log("[ADMIN] Enabled couriers parsed:", list);
          setEnabled(list);
          setOriginal(list);
        } catch (e) {
          console.error("[ADMIN] Failed to parse couriers, using defaults:", e);
          setEnabled(["jne", "sicepat", "jnt", "ninja", "tiki", "wahana", "pos", "lion", "anteraja"]);
        }
      }
      setLoading(false);
    });
  }, []);

  function toggle(code: string) {
    console.log("[ADMIN] Toggle courier:", code);
    setEnabled((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  }

  const dirty = JSON.stringify(enabled) !== JSON.stringify(original);

  async function handleSave() {
    setSaving(true);
    console.log("[ADMIN] Saving couriers:", enabled);
    await supabase.from("store_settings").upsert({ id: 1, enabled_couriers: JSON.stringify(enabled), updated_at: new Date().toISOString() });
    setOriginal([...enabled]);
    setSaving(false);
    console.log("[ADMIN] Couriers saved successfully");
    toast.showToast("success", "Pilihan ekspedisi disimpan");
  }

  if (loading) return <div className="card p-6 max-w-2xl"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Ekspedisi Aktif</h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pilih ekspedisi yang ingin ditampilkan di halaman checkout.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {AVAILABLE_COURIERS.map((c) => (
          <label key={c.code} className="flex items-center gap-2.5 rounded-xl px-4 py-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${enabled.includes(c.code) ? "var(--gold)" : "rgba(64,50,37,.15)"}`, background: enabled.includes(c.code) ? "rgba(181,140,74,.04)" : "white" }}>
            <input type="checkbox" checked={enabled.includes(c.code)} onChange={() => toggle(c.code)} className="sr-only" />
            <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ border: `2px solid ${enabled.includes(c.code) ? "var(--gold)" : "var(--text-muted)"}`, background: enabled.includes(c.code) ? "var(--gold)" : "transparent" }}>
              {enabled.includes(c.code) && <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="M5 12l5 5L20 7" /></svg>}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--espresso)" }}>{c.name}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        {dirty && (
          <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
            {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan Perubahan
          </button>
        )}
      </div>
    </div>
  );
}

function ApiKeySection() {
  const [apiKey, setApiKey] = useState("");
  const [masked, setMasked] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const toast = useToast();

  useEffect(() => {
    console.log("[ADMIN] ApiKeySection init");
    supabase.from("store_settings").select("rajaongkir_api_key").eq("id", 1).single().then(({ data }) => {
      const key = data?.rajaongkir_api_key || "";
      console.log("[ADMIN] API key loaded:", key ? `${key.slice(0, 6)}...${key.slice(-4)}` : "(not set)");
      setMasked(key ? `${key.slice(0, 6)}${"*".repeat(Math.max(0, key.length - 10))}${key.slice(-4)}` : "");
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!apiKey.trim()) { toast.showToast("error", "API key tidak boleh kosong"); return; }
    setSaving(true);
    console.log("[ADMIN] Saving API key:", `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
    await supabase.from("store_settings").upsert({ id: 1, rajaongkir_api_key: apiKey.trim(), updated_at: new Date().toISOString() });
    setMasked(`${apiKey.slice(0, 6)}${"*".repeat(Math.max(0, apiKey.length - 10))}${apiKey.slice(-4)}`);
    setApiKey("");
    setShowKey(false);
    setSaving(false);
    console.log("[ADMIN] API key saved successfully");
    toast.showToast("success", "API key RajaOngkir disimpan");
  }

  if (loading) return <div className="card p-6 max-w-2xl"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>API Key RajaOngkir</h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>API key untuk integrasi RajaOngkir (Shipping Cost). Disimpan aman di database, tidak pernah dikirim ke browser customer.</p>

      {masked && (
        <div className="flex items-center gap-2 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
          <span>Key tersimpan:</span>
          <span className="px-2 py-1 rounded" style={{ background: "rgba(64,50,37,.06)" }}>{masked}</span>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 pr-10 bg-white text-sm outline-none font-mono"
            style={{ border: "1px solid rgba(64,50,37,.1)" }}
            placeholder={masked ? "Masukkan key baru untuk mengganti" : "Masukkan API key RajaOngkir"}
          />
          <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
            {showKey ? "🙈" : "👁️"}
          </button>
        </div>
        <button onClick={handleSave} disabled={saving || !apiKey.trim()} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
          {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
        </button>
      </div>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Jika tidak diisi, sistem akan menggunakan API key dari environment variable (RAJAONGKIR_API_KEY).
      </p>
    </div>
  );
}

function SocialMediaSection() {
  const [instagramUrl, setInstagramUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    console.log("[ADMIN] SocialMediaSection init");
    supabase.from("store_settings").select("instagram_url").eq("id", 1).single().then(({ data }) => {
      setInstagramUrl(data?.instagram_url || "");
      console.log("[ADMIN] Instagram URL loaded:", data?.instagram_url || "(empty)");
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    console.log("[ADMIN] Saving instagram_url:", instagramUrl);
    await supabase.from("store_settings").upsert({ id: 1, instagram_url: instagramUrl || null, updated_at: new Date().toISOString() });
    setSaving(false);
    toast.showToast("success", "Link Instagram disimpan");
  }

  if (loading) return <div className="card p-6 max-w-2xl"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Sosial Media</h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Link yang muncul di footer website (kolom &quot;Terhubung&quot;).</p>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Link Instagram</label>
        <input
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none"
          style={{ border: "1px solid rgba(64,50,37,.1)" }}
          placeholder="https://instagram.com/samaqu.id"
        />
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Kosongkan untuk menyembunyikan icon Instagram di footer.</p>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "var(--gold)" }}>
          {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
        </button>
      </div>
    </div>
  );
}

function StoreInfoSection() {
  const [form, setForm] = useState({ store_name: "", tagline: "", email: "", whatsapp: "", cyp_microcopy: "" });
  const [original, setOriginal] = useState({ store_name: "", tagline: "", email: "", whatsapp: "", cyp_microcopy: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    supabase.from("store_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        const s = { store_name: data.store_name || "", tagline: data.tagline || "", email: data.email || "", whatsapp: data.whatsapp || "", cyp_microcopy: data.cyp_microcopy || "" };
        setForm(s); setOriginal(s);
      }
      setLoading(false);
    });
  }, []);

  const dirty = form.store_name !== original.store_name || form.tagline !== original.tagline || form.email !== original.email || form.whatsapp !== original.whatsapp || form.cyp_microcopy !== original.cyp_microcopy;

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
      <div>
        <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>Teks Microcopy Create Your Price</label>
        <p className="text-[11px] font-ui mt-0.5 mb-1.5" style={{ color: "var(--text-muted)" }}>Teks kecil yang muncul di bawah pilihan harga pada halaman produk CYP. Kosongkan untuk gunakan default.</p>
        <textarea value={form.cyp_microcopy} onChange={(e) => setForm({ ...form, cyp_microcopy: e.target.value })} rows={2} className="w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.1)" }} placeholder="Harga Minimum boleh dipilih. Itulah alasan kami membuat Create Your Price." />
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
  const [productThumbnails, setProductThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      supabase.from("customer_featured_products").select("product_id, display_order").order("display_order"),
      supabase.from("products").select("id, name, image, category").order("created_at", { ascending: false }),
    ]).then(async ([fpRes, pRes]) => {
      if (fpRes.data) setFeaturedIds(fpRes.data.map((r) => r.product_id));
      if (pRes.data) {
        setAllProducts(pRes.data);
        // Fetch thumbnails (skip videos)
        const ids = pRes.data.map((p) => p.id);
        const { data: imgs } = await supabase.from("product_images").select("product_id, url, is_video").in("product_id", ids).order("display_order");
        if (imgs) {
          const thumbs: Record<string, string> = {};
          for (const p of pRes.data) {
            const firstImage = imgs.find((img: any) => img.product_id === p.id && !img.is_video);
            thumbs[p.id] = firstImage?.url || (p.image && !p.image.match(/\.(mp4|webm|ogg)$/i) ? p.image : "");
          }
          setProductThumbnails(thumbs);
        }
      }
      setLoading(false);
    });
  }, []);

  function toggleProduct(id: string) {
    setSaved(false);
    setFeaturedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function save() {
    setSaving(true);
    const { data: existingIds } = await supabase.from("customer_featured_products").select("id");
    if (existingIds && existingIds.length > 0) {
      for (const row of existingIds) await supabase.from("customer_featured_products").delete().eq("id", row.id);
    }
    if (featuredIds.length > 0) {
      await supabase.from("customer_featured_products").insert(featuredIds.map((id, i) => ({ product_id: id, display_order: i })));
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
                <img src={productThumbnails[p.id] || p.image || ""} alt={p.name} className="w-full h-full object-cover" />
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

function MetaPixelSection() {
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [testEventCode, setTestEventCode] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [maskedToken, setMaskedToken] = useState("");
  const toast = useToast();

  useEffect(() => {
    supabase.from("store_settings").select("meta_pixel_id, meta_access_token, meta_pixel_enabled, meta_test_event_code").eq("id", 1).single().then(({ data }) => {
      if (data) {
        setPixelId(data.meta_pixel_id || "");
        setEnabled(data.meta_pixel_enabled || false);
        setTestEventCode(data.meta_test_event_code || "");
        const token = data.meta_access_token || "";
        if (token) {
          setMaskedToken(`${token.slice(0, 10)}${"*".repeat(Math.max(0, token.length - 14))}${token.slice(-4)}`);
        }
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (enabled && !pixelId.trim()) {
      toast.showToast("error", "Pixel ID wajib diisi jika tracking diaktifkan");
      return;
    }
    setSaving(true);
    const updates: Record<string, any> = {
      id: 1,
      meta_pixel_id: pixelId.trim() || null,
      meta_pixel_enabled: enabled,
      meta_test_event_code: testEventCode.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (accessToken.trim()) {
      updates.meta_access_token = accessToken.trim();
    }
    const { error } = await supabase.from("store_settings").upsert(updates);
    if (error) {
      toast.showToast("error", "Gagal menyimpan pengaturan Meta Pixel");
    } else {
      if (accessToken.trim()) {
        const token = accessToken.trim();
        setMaskedToken(`${token.slice(0, 10)}${"*".repeat(Math.max(0, token.length - 14))}${token.slice(-4)}`);
        setAccessToken("");
        setShowToken(false);
      }
      toast.showToast("success", "Pengaturan Meta Pixel disimpan");
    }
    setSaving(false);
  }

  if (loading) return <div className="card p-6 max-w-2xl"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Meta Pixel</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Konfigurasi Meta Pixel untuk tracking iklan Facebook/Instagram.</p>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: enabled ? "#e7ecdf" : "rgba(64,50,37,.06)", color: enabled ? "#5b6b45" : "var(--text-muted)" }}>
          {enabled ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setEnabled(!enabled)} className="relative w-11 h-6 rounded-full transition-colors duration-200" style={{ background: enabled ? "var(--gold)" : "rgba(64,50,37,.15)" }}>
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }} />
        </button>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{enabled ? "Tracking aktif di seluruh website" : "Tracking nonaktif"}</span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Pixel ID</label>
        <input
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none font-mono"
          style={{ border: "1px solid rgba(64,50,37,.1)" }}
          placeholder="contoh: 123456789012345"
        />
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Temukan di Meta Events Manager → Settings → Pixel ID.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Access Token (CAPI)</label>
        {maskedToken && (
          <div className="flex items-center gap-2 text-sm font-mono mb-2" style={{ color: "var(--text-secondary)" }}>
            <span>Token tersimpan:</span>
            <span className="px-2 py-1 rounded" style={{ background: "rgba(64,50,37,.06)" }}>{maskedToken}</span>
          </div>
        )}
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 pr-10 bg-white text-sm outline-none font-mono"
            style={{ border: "1px solid rgba(64,50,37,.1)" }}
            placeholder={maskedToken ? "Masukkan token baru untuk mengganti" : "Masukkan System User Access Token"}
          />
          <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
            {showToken ? "🙈" : "👁️"}
          </button>
        </div>
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Digunakan untuk Conversions API (CAPI). Buat di Meta Business Suite → System Users.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Test Event Code</label>
        <input
          value={testEventCode}
          onChange={(e) => setTestEventCode(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none font-mono"
          style={{ border: "1px solid rgba(64,50,37,.1)" }}
          placeholder="contoh: TEST12345"
        />
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Untuk testing di Meta Events Manager → Test Events. Kosongkan di production.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
          {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <AdminPageInner />;
}
