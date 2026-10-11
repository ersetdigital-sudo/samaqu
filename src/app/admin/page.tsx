"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getThumbnailFromImages } from "@/lib/product-thumbnail";
import {
  LayoutDashboard, ShoppingBag, Package, Users, FileText, Settings,
  Search, Bell, Menu, X, ChevronDown, Plus, TrendingUp, Eye, Edit,
  DollarSign, ShoppingCart, UserPlus, Box, LogOut, Lock, Mail, Loader2, Trash2, Ticket, Star, Ruler, Image, Shirt, MessageCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/AdminToast";
import PaymentMethodsManager, { PaymentMethodValue } from "@/components/admin/PaymentMethodsManager";
import JntCredentialsForm from "@/components/admin/JntCredentialsForm";
import OrderDetailContent from "@/components/admin/OrderDetailContent";
import OrdersMobileList from "@/components/admin/OrdersMobileList";
import DashboardView from "@/components/admin/DashboardView";
import ProductsCatalog from "@/components/admin/ProductsCatalog";
import { ADMIN_WF_VARS } from "@/components/admin/admin-theme";

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
  order_items?: { product_name: string; color: string; size: string; series?: string | null; kain?: string | null; quantity: number; price: number; customer_price: number | null; minimum_price: number | null; product_image?: string | null }[];
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
  totalStock?: number;
  matchedSeries?: string;
  seriesStock?: { name: string; stock: number; isDerived: boolean; follows?: string }[];
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
  // Pill status ala wireframe: hijau = selesai/sukses, amber = proses/menunggu,
  // abu = dibatalkan. Pairing teks-atas-fill dipilih agar kontras lolos.
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    selesai: { bg: "#ecfdf5", color: "#047857", border: "#d1fae5" },
    diproses: { bg: "#fffbeb", color: "#b45309", border: "#fef3c7" },
    dikirim: { bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe" },
    menunggu: { bg: "#fffbeb", color: "#b45309", border: "#fef3c7" },
    pending: { bg: "#fffbeb", color: "#b45309", border: "#fef3c7" },
    dibatalkan: { bg: "#f4f4f5", color: "#52525b", border: "#e4e4e7" },
  };
  const s = styles[status.toLowerCase()] || styles.pending;
  return <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{status}</span>;
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
  const [orderSource, setOrderSource] = useState<"website" | "open">("website");

  // Pesanan Open Order (Create Your Price) bernomor `CYO-`; sisanya pesanan checkout website.
  const sourceOrders = orders.filter((o) =>
    orderSource === "open" ? o.order_number.startsWith("CYO-") : !o.order_number.startsWith("CYO-")
  );
  const visibleOrders = sourceOrders.filter((o) => orderFilter === "Semua" || o.status === orderFilter);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [productVariants, setProductVariants] = useState<{ product_id: string; stock: number; base_product_id: string | null }[]>([]);
  const [hoveredSeriesCard, setHoveredSeriesCard] = useState<string | null>(null);

  // All useMemo/useCallback hooks
  const stats = useMemo(() => ({
    revenue: orders.filter((o) => o.status !== "pending").reduce((sum, o) => sum + o.total, 0),
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    totalProducts: products.length,
  }), [orders, products]);

  const topProducts = useMemo(() => {
    // Grup per SERIES + WARNA, bukan per nama produk: satu thobe dijual per
    // series (Imron, Jiharkah, …), jadi "Thobe Broken White" menggabungkan
    // pembelian yang sebenarnya produk berbeda.
    const counts: Record<string, { name: string; sub: string | null; count: number }> = {};
    orders.forEach((o) => {
      o.order_items?.forEach((item) => {
        const series = (item.series || "").trim();
        const color = (item.color || "").trim();
        // Produk tanpa series (mis. Kandora) tetap tampil memakai nama produknya.
        const name = series || item.product_name || "Tanpa nama";
        const key = `${name}||${color.toLowerCase()}`;
        if (!counts[key]) {
          // "default" = placeholder karena pembeli tidak memilih warna, jadi
          // jangan ditampilkan; dan bila nama produk sudah memuat warnanya,
          // jangan ditulis dua kali.
          const showColor =
            !!color && color.toLowerCase() !== "default" && !name.toLowerCase().includes(color.toLowerCase());
          counts[key] = { name, sub: showColor ? color : null, count: 0 };
        }
        counts[key].count += item.quantity;
      });
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  const catalogItems = useMemo(() => groupByMainProduct(products), [products]);

  const catalogItemsWithStock = useMemo(() => {
    // Build lookup maps
    const seriesByName: Record<string, string> = {}; // product_id → series name
    for (const p of products) {
      if (p.series) seriesByName[p.id] = p.series;
    }
    const stockByProduct: Record<string, number> = {};
    const baseLinkByProduct: Record<string, string> = {}; // product_id → base_product_id
    for (const v of productVariants) {
      if (v.base_product_id) {
        baseLinkByProduct[v.product_id] = v.base_product_id;
      } else {
        stockByProduct[v.product_id] = (stockByProduct[v.product_id] || 0) + v.stock;
      }
    }
    return catalogItems.map((p) => {
      let totalStock = 0;
      const seriesStock: { name: string; stock: number; isDerived: boolean; follows?: string }[] = [];
      for (const mid of p.memberIds || []) {
        const sName = seriesByName[mid] || mid;
        const baseId = baseLinkByProduct[mid];
        if (baseId) {
          // Derived product — stock comes from base
          const baseStock = stockByProduct[baseId] || 0;
          const baseSeries = seriesByName[baseId] || baseId;
          seriesStock.push({ name: sName, stock: baseStock, isDerived: true, follows: baseSeries });
          totalStock += baseStock;
        } else {
          // Base product — has its own stock
          const st = stockByProduct[mid] || 0;
          seriesStock.push({ name: sName, stock: st, isDerived: false });
          totalStock += st;
        }
      }
      seriesStock.sort((a, b) => a.name.localeCompare(b.name));
      return { ...p, totalStock, seriesStock };
    });
  }, [catalogItems, productVariants, products]);

  const filteredCatalogItems = useMemo(() => {
    if (!debouncedSearch.trim()) return catalogItemsWithStock;
    const q = debouncedSearch.toLowerCase();
    return catalogItemsWithStock.map((p) => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const catMatch = p.category.toLowerCase().includes(q);
      if (nameMatch || catMatch) return { ...p, matchedSeries: undefined };
      const seriesHit = p.availableSeries?.find((s) => s.toLowerCase().includes(q));
      if (seriesHit) return { ...p, matchedSeries: seriesHit };
      return null;
    }).filter(Boolean) as AdminCatalogProduct[];
  }, [catalogItemsWithStock, debouncedSearch]);

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
        const [ordersRes, productsRes, variantsRes] = await Promise.all([
          supabase.from("orders").select("*, order_items(product_name, color, size, series, kain, quantity, price, customer_price, minimum_price, product_image)").order("created_at", { ascending: false }).limit(50),
          supabase.from("products").select("*").order("created_at", { ascending: true }),
          supabase.from("product_variants").select("product_id, stock, base_product_id"),
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
          if (variantsRes.data) setProductVariants(variantsRes.data as { product_id: string; stock: number; base_product_id: string | null }[]);
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

  // Debounce product search (200ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(productSearch), 200);
    return () => clearTimeout(timer);
  }, [productSearch]);

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
      <section className="min-h-screen flex items-center justify-center" style={{ background: "#f8f9fb" }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#e4e4e7", borderTopColor: "#18181b" }} />
      </section>
    );
  }

  if (user && role !== "admin") {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "#f8f9fb" }}>
        <div className="text-center px-6 max-w-sm">
          <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(220,38,38,.1)", border: "2px solid rgba(220,38,38,.3)" }}>
            <Lock size={28} style={{ color: "#dc2626" }} />
          </div>
          <h1 className="text-2xl font-medium mb-2" style={{ color: "#18181b" }}>Akses Ditolak</h1>
          <p className="text-sm mb-6" style={{ color: "#71717a" }}>
            Akun Anda tidak memiliki akses ke dashboard admin. Hubungi pemilik toko untuk mendapatkan akses.
          </p>
          <p className="text-xs mb-6" style={{ color: "#a1a1aa" }}>Login sebagai: {user.email}</p>
          <button onClick={handleLogout} className="px-6 py-2.5 rounded-xl text-sm font-semibold" style={{ border: "1px solid #e4e4e7", color: "#18181b" }}>
            Keluar & Login Ulang
          </button>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="min-h-screen flex" style={{ background: "#f8f9fb" }}>
        {/* Desktop: panel gelap kiri (zinc-900) */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden" style={{ background: "#18181b" }}>
          <div className="absolute inset-0" style={{
            clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)",
            background: "linear-gradient(135deg, rgba(63,63,70,.6) 0%, rgba(24,24,27,.98) 50%, rgba(9,9,11,1) 100%)",
          }} />
          <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 w-full">
            <div>
              <span className="text-3xl tracking-[0.2em] font-medium" style={{ color: "#fafafa" }}>SAMAQU</span>
              <p className="text-[11px] tracking-[0.28em] uppercase mt-2" style={{ color: "#a1a1aa" }}>Admin Panel</p>
            </div>
            <div className="max-w-md">
              <h1 className="text-4xl lg:text-5xl font-medium leading-tight mb-4" style={{ color: "#fafafa" }}>
                Kelola Toko<br /><em style={{ color: "#d4d4d8" }}>SAMAQU</em> Anda
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "#a1a1aa" }}>
                Dashboard admin untuk mengelola pesanan, produk, pelanggan, dan konten website SAMAQU.
              </p>
            </div>
            <p className="text-xs" style={{ color: "#71717a" }}>© 2026 SAMAQU. Semua hak cipta dilindungi.</p>
          </div>
        </div>

        {/* Right: form panel */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-sm">
            {/* Mobile: brand header */}
            <div className="lg:hidden text-center mb-10">
              <span className="text-3xl tracking-[0.2em] font-medium" style={{ color: "#18181b" }}>SAMAQU</span>
              <p className="text-[11px] tracking-[0.28em] uppercase mt-2" style={{ color: "#a1a1aa" }}>Admin Panel</p>
            </div>

            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-medium mb-2" style={{ color: "#18181b" }}>Selamat Datang</h2>
              <p className="text-sm" style={{ color: "#71717a" }}>Masuk ke dashboard admin SAMAQU</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#18181b" }}>Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#a1a1aa" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@samaqu.id"
                    className="w-full rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all focus:ring-2"
                    style={{ border: "1px solid #e4e4e7", background: "white", color: "#18181b", "--tw-ring-color": "#d4d4d8" } as React.CSSProperties}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#18181b" }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ border: "1px solid #e4e4e7", background: "white", color: "#18181b", "--tw-ring-color": "#d4d4d8" } as React.CSSProperties}
                  required
                  minLength={6}
                />
              </div>
              {authError && (
                <p className="text-[13px]" style={{ color: "#dc2626" }}>{authError}</p>
              )}
              <button type="submit" className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: "#18181b", boxShadow: "0 4px 14px -4px rgba(0,0,0,.4)" }}>
                Masuk
              </button>
            </form>

            <p className="mt-8 text-center text-xs" style={{ color: "#a1a1aa" }}>
              Butuh akses? Hubungi pemilik toko.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div id="admin-root" className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Sidebar — dikelompokkan per section, item ringkas supaya muat tanpa scroll */}
      <aside
        className={`fixed lg:sticky z-40 top-0 left-0 h-screen lg:self-start w-64 shrink-0 transition-transform duration-300 flex flex-col admin-sidebar ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--card)", borderRight: "1px solid var(--bd)" }}
      >
        <div className="h-16 flex items-center gap-2.5 px-4 shrink-0" style={{ borderBottom: "1px solid var(--bd)" }}>
          <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: "var(--fg)", borderRadius: "var(--rad3)" }}>
            <span className="text-white font-extrabold text-sm">S</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold leading-tight truncate" style={{ color: "var(--fg)" }}>SAMAQU</p>
            <p className="text-[10px] font-bold" style={{ color: "var(--fg3)" }}>Admin Panel</p>
          </div>
        </div>

        {/* min-h-0 wajib: tanpa itu flex item nggak bisa mengecil dari isinya,
            jadi nav luber dan menutup footer (menu & "Keluar" jadi kepotong). */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 no-scrollbar">
          <div>
            <p className="px-2 mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--fg3)" }}>Menu Utama</p>
            <ul className="space-y-0.5">
              {navItems.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <button onClick={() => go(item.id)} className={`sidebar-link ${activePanel === item.id ? "active" : ""}`}>
                    <item.icon size={16} strokeWidth={1.9} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge && orders.filter((o) => o.status === "pending").length > 0 && (
                      <span className="badge" style={{ background: "var(--sub)", color: "var(--fg)" }}>
                        {orders.filter((o) => o.status === "pending").length}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--bd)" }}>
            <p className="px-2 mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--fg3)" }}>Biolink</p>
            <ul className="space-y-0.5">
              <li><Link href="/admin/biolink" className="sidebar-link" onClick={() => setSidebarOpen(false)}><FileText size={16} strokeWidth={1.9} /><span className="flex-1">Biolink</span></Link></li>
              <li><Link href="/admin/bio-carousel" className="sidebar-link" onClick={() => setSidebarOpen(false)}><Image size={16} strokeWidth={1.9} /><span className="flex-1">Foto Carousel</span></Link></li>
            </ul>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--bd)" }}>
            <p className="px-2 mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--fg3)" }}>Lainnya</p>
            <ul className="space-y-0.5">
              {navItems.slice(4).map((item) => (
                <li key={item.id}>
                  <button onClick={() => go(item.id)} className={`sidebar-link ${activePanel === item.id ? "active" : ""}`}>
                    <item.icon size={16} strokeWidth={1.9} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  </button>
                </li>
              ))}
              <li><Link href="/admin/voucher" className="sidebar-link" onClick={() => setSidebarOpen(false)}><Ticket size={16} strokeWidth={1.9} /><span className="flex-1">Voucher</span></Link></li>
              <li><Link href="/admin/testimoni" className="sidebar-link" onClick={() => setSidebarOpen(false)}><Star size={16} strokeWidth={1.9} /><span className="flex-1">Testimoni</span></Link></li>
              <li><Link href="/admin/ukuran-produk" className="sidebar-link" onClick={() => setSidebarOpen(false)}><Ruler size={16} strokeWidth={1.9} /><span className="flex-1">Panduan Ukuran</span></Link></li>
              <li><Link href="/admin/garansi-retur-page" className="sidebar-link" onClick={() => setSidebarOpen(false)}><FileText size={16} strokeWidth={1.9} /><span className="flex-1">Halaman Garansi &amp; Retur</span></Link></li>
              <li><Link href="/admin/open-order" className="sidebar-link" onClick={() => setSidebarOpen(false)}><Shirt size={16} strokeWidth={1.9} /><span className="flex-1">Open Order</span></Link></li>
            </ul>
          </div>
        </nav>

        {/* Footer sidebar — bantuan + keluar, ala wireframe */}
        <div className="shrink-0 px-3 py-3 space-y-0.5" style={{ borderTop: "1px solid var(--bd)" }}>
          <a
            href="https://wa.me/6285212150100?text=Halo,%20saya%20ingin%20bertanya%20seputar%20dashboard%20admin%20SAMAQU."
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link"
          >
            <MessageCircle size={16} strokeWidth={1.9} />
            <span className="flex-1">Butuh Bantuan?</span>
          </a>
          <button onClick={handleLogout} className="sidebar-link w-full" style={{ color: "#ef4444" }}>
            <LogOut size={16} strokeWidth={1.9} />
            <span className="flex-1 text-left">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20" style={{ background: "var(--card)", borderBottom: "1px solid var(--bd)" }}>
          <div className="flex items-center gap-4 px-5 lg:px-8 h-20">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg" style={{ color: "var(--fg)" }}>
              <Menu size={24} strokeWidth={1.8} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-extrabold leading-tight truncate" style={{ color: "var(--fg)" }}>{panelTitles[activePanel].title}</h1>
              <p className="text-xs mt-1 hidden sm:block truncate" style={{ color: "var(--fg3)" }}>{panelTitles[activePanel].sub}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} strokeWidth={1.9} style={{ color: "var(--fg3)" }} />
                <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Cari produk..." className="pl-9 pr-8 py-2 w-56 rounded-lg text-sm outline-none" style={{ border: "1px solid var(--bd)", background: "var(--sub)", color: "var(--fg)" }} />
                {productSearch && (
                  <button onClick={() => setProductSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg3)" }}>
                    <X size={15} />
                  </button>
                )}
              </div>
              <button className="relative p-2.5 rounded-lg" style={{ border: "1px solid var(--bd)", background: "var(--card)" }}>
                <Bell size={19} strokeWidth={1.8} style={{ color: "var(--fg2)" }} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "var(--fg)" }} />
              </button>
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 pl-2 cursor-pointer">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: "#18181b" }}>
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
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl z-50 overflow-hidden" style={{ background: "white", border: "1px solid #e4e4e7", boxShadow: "0 12px 40px -8px rgba(0,0,0,.12)" }}>
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid #f1f1f3" }}>
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
                <DashboardView
                  revenue={stats.revenue}
                  orders={orders}
                  products={products}
                  topProducts={topProducts}
                  loading={loading}
                />
              )}

              {/* ORDERS */}
              {activePanel === "orders" && (
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
                  <div className="flex flex-wrap items-center gap-3 justify-between p-5" style={{ borderBottom: "1px solid #f1f1f3" }}>
                    <h2 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>{orderSource === "open" ? "Pesanan Open Order" : "Semua Pesanan"}</h2>
                    <div className="flex flex-wrap gap-2">
                      {["Semua", "pending", "diproses", "selesai"].map((s) => (
                        <button key={s} onClick={() => setOrderFilter(s)} className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors" style={{ background: orderFilter === s ? "var(--gold)" : "transparent", color: orderFilter === s ? "#fff" : "var(--text-secondary)", border: orderFilter === s ? "none" : "1px solid #d4d4d8" }}>
                          {s === "Semua" ? "Semua" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <OrdersMobileList
                      orders={visibleOrders}
                      onSelect={setSelectedOrder}
                      emptyText={orderSource === "open" ? "Belum ada pesanan Open Order" : "Tidak ada pesanan"}
                      renderStatus={(s) => <StatusBadge status={s} />}
                    />
                    <table className="w-full text-sm min-w-[720px] hidden lg:table">
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
                        {visibleOrders.map((o) => (
                          <tr key={o.id} className="cursor-pointer transition-colors hover:bg-[#fafafa]" style={{ borderTop: "1px solid #f1f1f3" }} onClick={() => setSelectedOrder(o)}>
                            <td className="px-5 py-3.5 font-semibold">{o.order_number}</td>
                            <td className="px-5 py-3.5">{o.customer_name}</td>
                            <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>{new Date(o.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                            <td className="px-5 py-3.5 font-semibold">{money(o.total)}</td>
                            <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                            <td className="px-5 py-3.5 text-right">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ border: "1px solid #d4d4d8", color: "var(--gold)" }}>Detail</button>
                            </td>
                          </tr>
                        ))}
                        {visibleOrders.length === 0 && (
                          <tr><td colSpan={6} className="px-5 py-8 text-center" style={{ color: "var(--text-muted)" }}>{orderSource === "open" ? "Belum ada pesanan Open Order" : "Tidak ada pesanan"}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PRODUCTS */}
              {activePanel === "products" && (
                <ProductsCatalog
                  items={filteredCatalogItems}
                  total={catalogItemsWithStock.length}
                  thumbnails={productThumbnails}
                  search={productSearch}
                  setSearch={setProductSearch}
                  onDelete={handleDeleteProduct}
                  loading={loading}
                />
              )}

              {/* CUSTOMERS */}
              {activePanel === "customers" && (
                <div className="card overflow-hidden">
                  <div className="p-5" style={{ borderBottom: "1px solid #f1f1f3" }}>
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
                          <tr key={i} style={{ borderTop: "1px solid #f1f1f3" }}>
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

                  {/* Kredensial J&T Express */}
                  <JntCredentialsForm />

                  {/* Social Media */}
                  <SocialMediaSection />

                  {/* Meta Pixel */}
                  <MetaPixelSection />

                  {/* Payment Methods — bank / QRIS / e-wallet / COD */}
                  <PaymentMethodsManager />
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center md:pt-10 md:px-4 md:pb-10 overflow-y-auto" style={{ background: "rgba(42,33,27,.4)", backdropFilter: "blur(4px)" }} onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} transition={{ duration: 0.25 }} className="w-full max-w-2xl rounded-none md:rounded-2xl overflow-hidden min-h-full md:min-h-0" style={{ background: "var(--cream)", boxShadow: "0 25px 60px -12px rgba(42,33,27,.5)" }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="px-4 py-4 md:px-6 md:py-5 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f1f3" }}>
                <div>
                  <h2 className="text-xl font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{selectedOrder.order_number}</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{new Date(selectedOrder.created_at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-lg hover:bg-[#f4f4f5]" style={{ color: "var(--text-muted)" }}><X size={18} /></button>
              </div>

              {/* Isi detail memakai susunan & gaya yang sama dengan halaman detail pesanan customer. */}
              <OrderDetailContent
                order={selectedOrder}
                onStatusChange={(status) => updateOrderStatus(selectedOrder.order_number, status)}
                onCancelJnt={() => cancelJntOrder(selectedOrder)}
                onDelete={() => deleteOrder(selectedOrder.order_number)}
              />
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

      {/* Token tema admin (wireframe-accurate "Sales Analytics View") — satu sumber
          yang sama dengan AdminShell & dashboard /id/admin, supaya tidak drift. */}
      <style jsx global>{ADMIN_WF_VARS}</style>
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
            <div className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm" style={{ border: "1px solid #e4e4e7" }}>
              {findName(provinces, form.origin_province_id) || "Memuat..."}
            </div>
          ) : (
            <select value={form.origin_province_id} onChange={(e) => handleProvChange(e.target.value)} className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid #e4e4e7" }}>
              <option value="">Pilih</option>
              {provinces.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Kota / Kabupaten</label>
          {dropdownsLoading && form.origin_city_id ? (
            <div className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm" style={{ border: "1px solid #e4e4e7", opacity: !form.origin_province_id ? 0.5 : 1 }}>
              {findName(cities, form.origin_city_id) || "Memuat..."}
            </div>
          ) : (
            <select value={form.origin_city_id} onChange={(e) => handleCityChange(e.target.value)} disabled={!form.origin_province_id} className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid #e4e4e7", opacity: !form.origin_province_id ? 0.5 : 1 }}>
              <option value="">Pilih</option>
              {cities.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Kecamatan</label>
          {dropdownsLoading && form.origin_district_id ? (
            <div className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm" style={{ border: "1px solid #e4e4e7", opacity: !form.origin_city_id ? 0.5 : 1 }}>
              {findName(districts, form.origin_district_id) || "Memuat..."}
            </div>
          ) : (
            <select value={form.origin_district_id} onChange={(e) => setForm((f) => ({ ...f, origin_district_id: e.target.value }))} disabled={!form.origin_city_id} className="mt-1 w-full rounded-xl px-3 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid #e4e4e7", opacity: !form.origin_city_id ? 0.5 : 1 }}>
              <option value="">Pilih</option>
              {districts.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        {form.origin_district_id && (
          <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "#18181b" }}>
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
          <label key={opt.value} className="flex-1 flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${provider === opt.value ? "var(--gold)" : "#d4d4d8"}`, background: provider === opt.value ? "#fafafa" : "white" }}>
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
        <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "#18181b" }}>
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
          <label key={c.code} className="flex items-center gap-2.5 rounded-xl px-4 py-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${enabled.includes(c.code) ? "var(--gold)" : "#d4d4d8"}`, background: enabled.includes(c.code) ? "#fafafa" : "white" }}>
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
          <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "#18181b" }}>
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
          <span className="px-2 py-1 rounded" style={{ background: "#f1f1f3" }}>{masked}</span>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 pr-10 bg-white text-sm outline-none font-mono"
            style={{ border: "1px solid #e4e4e7" }}
            placeholder={masked ? "Masukkan key baru untuk mengganti" : "Masukkan API key RajaOngkir"}
          />
          <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
            {showKey ? "🙈" : "👁️"}
          </button>
        </div>
        <button onClick={handleSave} disabled={saving || !apiKey.trim()} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white disabled:opacity-40" style={{ background: "#18181b" }}>
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
          style={{ border: "1px solid #e4e4e7" }}
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
        <input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid #e4e4e7" }} />
      </div>
      <div>
        <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>Tagline</label>
        <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid #e4e4e7" }} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid #e4e4e7" }} />
        </div>
        <div>
          <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>WhatsApp</label>
          <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none" style={{ border: "1px solid #e4e4e7" }} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>Teks Microcopy Create Your Price</label>
        <p className="text-[11px] font-ui mt-0.5 mb-1.5" style={{ color: "var(--text-muted)" }}>Teks kecil yang muncul di bawah pilihan harga pada halaman produk CYP. Kosongkan untuk gunakan default.</p>
        <textarea value={form.cyp_microcopy} onChange={(e) => setForm({ ...form, cyp_microcopy: e.target.value })} rows={2} className="w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none resize-none" style={{ border: "1px solid #e4e4e7" }} placeholder="Harga Minimum boleh dipilih. Itulah alasan kami membuat Create Your Price." />
      </div>
      <div className="flex gap-3 pt-2">
        {dirty && (
          <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "#18181b" }}>
            {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan Perubahan
          </button>
        )}
        <button onClick={handleReset} className="text-sm font-semibold px-5 py-2.5 rounded-xl" style={{ border: "1px solid #d4d4d8" }}>Batal</button>
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
        <button onClick={save} disabled={saving || featuredIds.length === 0} className="text-xs px-4 py-2 rounded-xl font-semibold text-white" style={{ background: saved ? "#3f3f46" : "var(--gold)", opacity: saving || featuredIds.length === 0 ? 0.5 : 1 }}>
          {saving ? "..." : saved ? "Tersimpan" : "Simpan"}
        </button>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Dipilih: {featuredIds.length} / 8 produk</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {allProducts.map((p) => {
          const selected = featuredIds.includes(p.id);
          return (
            <button key={p.id} onClick={() => { if (!selected && featuredIds.length >= 8) return; toggleProduct(p.id); }} className="rounded-xl overflow-hidden text-left transition-all" style={{ border: selected ? "2px solid var(--gold)" : "1px solid #e4e4e7", opacity: !selected && featuredIds.length >= 8 ? 0.4 : 1 }}>
              <div className="aspect-square" style={{ background: "#f4f4f5" }}>
                <img src={productThumbnails[p.id] || p.image || ""} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate" style={{ color: "var(--espresso)" }}>{p.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.category}</p>
              </div>
              {selected && <div className="text-center text-[10px] py-1 font-medium" style={{ background: "#f4f4f5", color: "var(--gold)" }}>Dipilih</div>}
            </button>
          );
        })}
      </div>
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
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: enabled ? "#f4f4f5" : "#f1f1f3", color: enabled ? "#3f3f46" : "var(--text-muted)" }}>
          {enabled ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setEnabled(!enabled)} className="relative w-11 h-6 rounded-full transition-colors duration-200" style={{ background: enabled ? "var(--gold)" : "#d4d4d8" }}>
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
          style={{ border: "1px solid #e4e4e7" }}
          placeholder="contoh: 123456789012345"
        />
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Temukan di Meta Events Manager → Settings → Pixel ID.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Access Token (CAPI)</label>
        {maskedToken && (
          <div className="flex items-center gap-2 text-sm font-mono mb-2" style={{ color: "var(--text-secondary)" }}>
            <span>Token tersimpan:</span>
            <span className="px-2 py-1 rounded" style={{ background: "#f1f1f3" }}>{maskedToken}</span>
          </div>
        )}
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 pr-10 bg-white text-sm outline-none font-mono"
            style={{ border: "1px solid #e4e4e7" }}
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
          style={{ border: "1px solid #e4e4e7" }}
          placeholder="contoh: TEST12345"
        />
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Untuk testing di Meta Events Manager → Test Events. Kosongkan di production.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "#18181b" }}>
          {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <AdminPageInner />;
}
