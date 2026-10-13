"use client";

import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/lib/ops-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@/lib/ops-router";
import {
  Package,
  TrendingUp,
  TrendingDown,
  BarChart,
  Plus,
  Edit,
  Trash2,
  X,
  Tag,
  Hash,
  DollarSign,
  Percent,
  Calendar,
  Box,
  FileText,
  Search,
  Info,
  AlertCircle,
  AlertTriangle,
  ShoppingCart,
  ClipboardList,
  Eye,
  Archive,
  Warehouse,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Gift,
  ChevronLeft,
  ChevronRight,
  Upload, // Added for import button
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Shield,
  ArrowUpDown
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import ConfirmDeleteModal from "@/components/ops/ConfirmDeleteModal";
import ImportProductModal from "@/components/ops/ImportProductModal"; // Import the new modal
import { useToast } from "@/components/ops/ui/use-toast";
import { createPageUrl } from "@/lib/ops-router";
import { MetricCardSkeleton } from "@/components/ops/ui/skeleton";
import { SIZES, normalizeStock, sumStock, stockStatus } from "@/lib/ops-variants";
import { IconBoxes, IconLayers, IconCalendarClock, IconPackageX, IconArrowDownToLine, IconAlertTriangle } from "@/components/ops/icons";

/**
 * Batas kalender menurut WIB (bukan zona waktu browser): tanggal hari ini,
 * awal bulan, dan akhir bulan berjalan dalam format YYYY-MM-DD.
 */
function wibCalendarRange() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return {
    today: `${y}-${pad(m + 1)}-${pad(now.getUTCDate())}`,
    monthStart: `${y}-${pad(m + 1)}-01`,
    monthEnd: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
  };
}

function AnimatedCounter({ value, prefix = "", suffix = "", duration = 1200, delay = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutBounce = (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      
      const easedProgress = easeOutBounce(progress);
      setCount(Math.floor(value * easedProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    const timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, duration, delay]);

  return (
    <span>
      {prefix}{count.toLocaleString('id-ID')}{suffix}
    </span>
  );
}

function ProductDetailModal({ isOpen, onClose, product, stockIns = [], transactions = [], variants = [] }) {
  if (!isOpen || !product) return null;

  const pv = (variants || []).filter((v) => v.product_id === product.id);
  const totalStock = pv.reduce((s, v) => s + sumStock(v.stock), 0);
  const status = stockStatus(totalStock);
  const statusStyle = {
    habis: "bg-red-100 text-red-700 border-red-200",
    menipis: "bg-amber-100 text-amber-700 border-amber-200",
    aman: "bg-emerald-100 text-emerald-700 border-emerald-200",
  }[status];
  const statusLabel = { habis: "Habis", menipis: "Menipis", aman: "Aman" }[status];

  const productStockIns = (stockIns || []).filter((si) => si.product_id === product.id);
  const productTransactions = (transactions || []).filter((t) => t.product_id === product.id);
  const validTransactions = productTransactions.filter((t) => String(t.status || "") !== "return");
  const totalIn = productStockIns.reduce((s, si) => s + (Number(si.qty) || 0), 0);
  const totalOut = validTransactions.reduce((s, t) => s + (Number(t.qty) || 0), 0);
  const revenue = validTransactions.reduce((s, t) => s + (Number(t.total) || 0), 0);
  const hpp = Number(product.hpp) || 0;
  const price = Number(product.price) || 0;
  const margin = price > 0 ? Math.round(((price - hpp) / price) * 100) : 0;
  const stockValue = totalStock * hpp;

  const Info = ({ label, value, tone = "" }) => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-[15px] font-bold leading-tight ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/45 z-[9998]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 60, opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[540px] bg-white dark:bg-[#141821] z-[9999] shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Detail produk"
          >
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 shrink-0">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Package size={24} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold text-white leading-tight">{product.name}</h2>
                  <p className="text-[11px] text-white/80 font-mono mt-0.5">{product.sku}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${statusStyle}`}>{statusLabel}</span>
                    {product.product_type === "free_gift" && (
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-pink-100 text-pink-600 border border-pink-200">Free Gift</span>
                    )}
                    {product.category && (
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white/15 text-white border border-white/20">{product.category}</span>
                    )}
                    {product.series && (
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white/15 text-white border border-white/20">{product.series}</span>
                    )}
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/15 shrink-0" aria-label="Tutup">
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* Ringkasan */}
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ringkasan</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <Info label="Total Stok" value={`${totalStock.toLocaleString("id-ID")} unit`} />
                  <Info label="Stok Awal" value={`${(product.initial_stock || 0).toLocaleString("id-ID")} unit`} />
                  <Info label="HPP / unit" value={`Rp ${hpp.toLocaleString("id-ID")}`} />
                  <Info label="Harga Jual" value={`Rp ${price.toLocaleString("id-ID")}`} />
                  <Info
                    label="Margin"
                    value={`${margin}%`}
                    tone={margin > 0 ? "text-emerald-600" : margin < 0 ? "text-red-600" : ""}
                  />
                  <Info label="Nilai Stok (HPP)" value={`Rp ${stockValue.toLocaleString("id-ID")}`} />
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <Info label="Kategori" value={product.category || "-"} />
                  <Info label="Series" value={product.series || "Belum diatur"} />
                  <Info label="Kain" value={product.kain || "-"} />
                  {product.weight ? <Info label="Berat" value={`${product.weight} gram`} /> : null}
                  {product.created_at ? (
                    <Info label="Dibuat" value={format(new Date(product.created_at), "dd MMM yyyy")} />
                  ) : null}
                </div>
              </section>

              {/* Stok per varian */}
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Stok per Varian ({pv.length})
                </p>
                {pv.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada varian untuk produk ini.</p>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/60">
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Warna</th>
                            {SIZES.map((s) => (
                              <th key={s} className="px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-500">{s}</th>
                            ))}
                            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-slate-500">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pv.map((v) => {
                            const st = normalizeStock(v.stock);
                            const total = SIZES.reduce((s, sz) => s + st[sz], 0);
                            return (
                              <tr key={v.id} className="border-t border-slate-100 dark:border-slate-800">
                                <td className="px-3 py-2 text-[13px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                  {v.color && String(v.color).toLowerCase() !== "default" ? v.color : <span className="italic text-slate-400">Belum diatur</span>}
                                  {v.series_name ? <span className="block text-[10px] text-slate-400 font-medium">{v.series_name}</span> : null}
                                </td>
                                {SIZES.map((sz) => (
                                  <td key={sz} className={`px-2 py-2 text-center text-[13px] font-semibold ${st[sz] === 0 ? "text-red-400" : "text-slate-700 dark:text-slate-200"}`}>{st[sz]}</td>
                                ))}
                                <td className="px-3 py-2 text-center text-[13px] font-black text-blue-600 dark:text-blue-400">{total}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* Mutasi stok */}
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Mutasi Stok</p>
                <div className="grid grid-cols-3 gap-2.5">
                  <Info label="Masuk" value={`+${totalIn.toLocaleString("id-ID")}`} tone="text-emerald-600" />
                  <Info label="Keluar" value={`-${totalOut.toLocaleString("id-ID")}`} tone="text-red-600" />
                  <Info label="Pencatatan Masuk" value={`${productStockIns.length}x`} />
                </div>
              </section>

              {/* Riwayat barang masuk */}
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Riwayat Barang Masuk (5 terakhir)</p>
                {productStockIns.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada pencatatan barang masuk.</p>
                ) : (
                  <div className="space-y-2">
                    {productStockIns.slice(0, 5).map((si) => (
                      <div key={si.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{format(new Date(si.date), "dd MMM yyyy")}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {[si.variant_color, si.variant_size].filter(Boolean).join(" / ") || si.notes || "-"}
                          </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[13px] font-bold whitespace-nowrap">
                          +{si.qty}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Riwayat penjualan */}
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Riwayat Penjualan (5 terakhir)</p>
                {validTransactions.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada penjualan produk ini.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {validTransactions.slice(-5).reverse().map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{format(new Date(t.date), "dd MMM yyyy")}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {t.order_id || "-"} · {[t.variant_color, t.variant_size].filter(Boolean).join(" / ") || "-"}
                            </p>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="text-[13px] font-bold text-slate-900 dark:text-white">-{t.qty}</p>
                            <p className="text-[11px] text-emerald-600">Rp {Number(t.total || 0).toLocaleString("id-ID")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                      <Info label="Total Omset" value={`Rp ${revenue.toLocaleString("id-ID")}`} />
                      <Info label="Estimasi Laba" value={`Rp ${(revenue - hpp * totalOut).toLocaleString("id-ID")}`} tone="text-emerald-600" />
                    </div>
                  </>
                )}
              </section>
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-400">
                {pv.length} varian · {statusLabel}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all"
              >
                Tutup
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
export default function MasterProduk() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('produk');
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'descending' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false); // State for import modal

  const queryClient = useQueryClient();

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  // ✅ VARIANT: stok per warna + ukuran
  const { data: variants = [], isLoading: isLoadingVariants } = useQuery({
    queryKey: ['productVariants'],
    queryFn: () => base44.entities.ProductVariant.list(),
    initialData: [],
  });

  const { data: stockIns = [], isLoading: isLoadingStockIns } = useQuery({
    queryKey: ['stockIns'],
    queryFn: () => base44.entities.StockIn.list('-created_date'),
    initialData: [],
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date'),
    initialData: [],
  });

  const isLoading = isLoadingProducts || isLoadingStockIns || isLoadingTransactions;

  // ── Ringkasan tab Barang Masuk (dari data stock_in yang sudah dimuat) ──
  // 1 unit = 1 pcs diterima · 1 pencatatan = 1 baris barang masuk · varian = kombinasi produk+warna+ukuran
  const wib = useMemo(() => wibCalendarRange(), []);
  const stockInMonth = useMemo(
    () => (stockIns || []).filter((si) => si.date && si.date >= wib.monthStart && si.date <= wib.monthEnd),
    [stockIns, wib],
  );
  const stockInMonthUnits = useMemo(
    () => stockInMonth.reduce((s, si) => s + (Number(si.qty) || 0), 0),
    [stockInMonth],
  );
  const stockInTodayUnits = useMemo(
    () => stockInMonth.filter((si) => si.date === wib.today).reduce((s, si) => s + (Number(si.qty) || 0), 0),
    [stockInMonth, wib],
  );
  const stockInMonthVariantCount = useMemo(() => {
    const keys = new Set();
    for (const si of stockInMonth) {
      keys.add(si.sku || [si.product_id, si.variant_color || "", si.variant_size || ""].join("|"));
    }
    return keys.size;
  }, [stockInMonth]);
  const stockInMonthRecordCount = stockInMonth.length;

  // ── Ringkasan tab Barang Keluar (dari order website, satuan unit) ──
  const stockOutUnits = useMemo(
    () => (transactions || []).reduce((s, t) => s + (Number(t.qty) || 0), 0),
    [transactions],
  );
  const stockOutTodayUnits = useMemo(
    () => (transactions || [])
      .filter((t) => t.date === wib.today)
      .reduce((s, t) => s + (Number(t.qty) || 0), 0),
    [transactions, wib],
  );
  const stockOutProductCount = useMemo(
    () => new Set((transactions || []).map((t) => t.product_id || t.product_name).filter(Boolean)).size,
    [transactions],
  );

  // ── Ringkasan tab Daftar Produk ──
  // "Aktif" = varian produknya masih punya stok (status dari server: aman/menipis/habis).
  const activeProductCount = useMemo(
    () => (products || []).filter((p) => String(p.status || "aman") !== "habis").length,
    [products],
  );
  // Terlaris = unit terjual dari order website. Order batal (status "return") tidak dihitung.
  const topSeller = useMemo(() => {
    const sold = {};
    for (const t of transactions || []) {
      if (String(t.status || "").toLowerCase() === "return") continue;
      const name = String(t.product_name || "").trim();
      if (!name) continue;
      sold[name] = (sold[name] || 0) + (Number(t.qty) || 0);
    }
    let best = null;
    for (const name of Object.keys(sold)) {
      if (!best || sold[name] > best.units) best = { name, units: sold[name] };
    }
    return best;
  }, [transactions]);

  // ── Ringkasan stok untuk tab Laporan Stok (dihitung dari data yang sudah dimuat,
  //    bukan angka statis). Satuan = unit stok, bukan jumlah produk. ──
  const [stockFilter, setStockFilter] = useState("all"); // all | menipis | habis

  const totalStockUnits = useMemo(
    () => (variants || []).reduce((s, v) => s + sumStock(v.stock), 0),
    [variants],
  );

  // "Menipis" memakai ambang yang sudah dipakai sistem: total 1..5 (0 = habis, lihat lib/ops-variants).
  // Sengaja tidak memakai <= 5 agar tidak menghitung dua kali dengan card "Stok Habis".
  const lowStockVariantCount = useMemo(
    () => (variants || []).filter((v) => { const t = sumStock(v.stock); return t > 0 && t <= 5; }).length,
    [variants],
  );

  const outOfStockVariantCount = useMemo(
    () => (variants || []).filter((v) => sumStock(v.stock) === 0).length,
    [variants],
  );

  const reportVariants = useMemo(() => {
    if (stockFilter === "all") return variants || [];
    return (variants || []).filter((v) => {
      const t = sumStock(v.stock);
      return stockFilter === "habis" ? t === 0 : t > 0 && t <= 5;
    });
  }, [variants, stockFilter]);

  const totalProducts = useMemo(() => products?.length || 0, [products]);
  const totalStock = useMemo(() => (products || []).reduce((sum, p) => sum + (p.stock || 0), 0), [products]);
  const totalValue = useMemo(() => (products || []).reduce((sum, p) => sum + ((p.stock || 0) * (p.hpp || 0)), 0), [products]);
  const lowStockCount = useMemo(() => (products || []).filter(p => p.status === 'menipis').length, [products]);

  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    
    return products.filter(product => {
      const matchSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || product.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [products, searchTerm, statusFilter]);

  // Helper to calculate stock metrics for a product
  const getProductStockMetrics = (product) => {
    const pStockIns = stockIns.filter(si => si.product_id === product.id);
    const pTransactions = transactions.filter(t => t.product_id === product.id && t.status !== 'return');
    const totalIn = pStockIns.reduce((sum, si) => sum + (si.qty || 0), 0);
    const totalOut = pTransactions.reduce((sum, t) => sum + (t.qty || 0), 0);
    const initStock = product.initial_stock || 0;
    const finalStock = initStock + totalIn - totalOut;
    
    let percentage = 0;
    if (initStock > 0) percentage = (finalStock / initStock) * 100;
    else if (finalStock > 0) percentage = 100;
    
    return { finalStock, percentage: Math.min(Math.max(0, Math.round(percentage)), 100) };
  };

  // Sorting Logic
  const sortedProducts = useMemo(() => {
    let sortableItems = [...filteredProducts];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key === 'stockPercentage') {
          aValue = getProductStockMetrics(a).percentage;
          bValue = getProductStockMetrics(b).percentage;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProducts, sortConfig, stockIns, transactions]);

  const handleSort = (key) => {
    let direction = 'descending'; // Default to descending (High to Low)
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, activeTab, sortConfig]);

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // New Render Helper for Stock Indicator
  const renderStockIndicator = (product) => {
    const { percentage } = getProductStockMetrics(product);
    
    // Helper to get color gradient class
    const getColorClass = (pct) => {
      if (pct === 100) return 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400';
      if (pct >= 75) return 'bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400';
      if (pct >= 50) return 'bg-gradient-to-r from-teal-400 via-cyan-500 to-teal-400';
      if (pct >= 20) return 'bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400';
      if (pct > 0) return 'bg-gradient-to-r from-rose-500 via-red-600 to-rose-500';
      return 'bg-red-600';
    };

    // Helper to get status label
    const getStatusLabel = (pct) => {
      if (pct === 100) return 'Full Stock';
      if (pct >= 75) return 'Aman';
      if (pct >= 50) return 'Baik';
      if (pct >= 20) return 'Rendah';
      if (pct > 0) return 'Kritis';
      return 'Habis';
    };

    // Helper to get icon
    const getStockIcon = (pct) => {
      if (pct === 100) {
        return (
          <div className="relative flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-amber-500" />
            <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>
          </div>
        );
      }
      if (pct >= 75) return <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
      if (pct >= 50) return <Shield className="w-5 h-5 text-teal-500 flex-shrink-0" />;
      if (pct >= 20) return <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
      if (pct > 0) return <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      return null;
    };

    return (
      <div 
        className="flex items-center justify-center gap-3 group cursor-help"
        title={`Stok Level: ${percentage}% - ${getStatusLabel(percentage)}`}
      >
        {percentage === 0 ? (
          // 0% Badge
          <div className="flex items-center justify-center gap-2">
            <div className="px-3 py-1 bg-red-100 border border-red-300 rounded-full flex items-center gap-1.5 animate-pulse">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold text-red-600">HABIS</span>
            </div>
            <span className="text-xs font-semibold text-red-600">0%</span>
          </div>
        ) : (
          // Progress Bar Display
          <div className="flex items-center justify-center gap-3 w-full">
            {/* Progress Bar */}
            <div className="flex-1 min-w-[70px] max-w-[100px]">
              <div className="relative w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getColorClass(percentage)}`}
                  style={{ width: `${percentage}%` }}
                >
                  {percentage === 100 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Icon */}
            {getStockIcon(percentage)}
            
            {/* Percentage Text */}
            <span className="text-xs font-semibold text-gray-900 dark:text-slate-100 min-w-[40px] text-right font-inter">
              {percentage}%
            </span>
          </div>
        )}
      </div>
    );
  };

  // NEW: Deadstock products (no transactions in last 60 days)
  const deadstockProducts = useMemo(() => {
    if (!products || !Array.isArray(products) || !transactions || !Array.isArray(transactions)) return [];
    
    const sixtyDaysAgo = subDays(new Date(), 60);
    return products.filter(product => {
      const productTransactions = transactions.filter(t => t.product_id === product.id);
      if (productTransactions.length === 0) return true; // No transactions at all
      
      const latestTransaction = productTransactions.reduce((latest, t) => {
        const tDate = new Date(t.date);
        return tDate > latest ? tDate : latest;
      }, new Date(0));
      
      return latestTransaction < sixtyDaysAgo;
    });
  }, [products, transactions]);

  // NEW: Low stock products (stock < 5)
  const lowStockProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    return products.filter(product => product.stock < 5);
  }, [products]);

  const handleDeleteClick = (item, type) => {
    setProductToDelete(item);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'product') {
      deleteProductMutation.mutate(productToDelete.id);
    } else if (deleteType === 'stockin') {
      deleteStockInMutation.mutate(productToDelete.id);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
    setDeleteType(null);
  };

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setShowDeleteModal(false);
      setProductToDelete(null);
      setDeleteType(null);
      toast({
        title: "🗑️ Produk berhasil dihapus",
        description: "Data produk telah dihapus dari daftar",
        variant: "destructive",
      });
    },
  });

  const deleteStockInMutation = useMutation({
    mutationFn: (id) => base44.entities.StockIn.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['stockIns']);
      setShowDeleteModal(false);
      setProductToDelete(null);
      setDeleteType(null);
      toast({
        title: "🗑️ Data barang masuk dihapus",
        description: "Data barang masuk telah dihapus dari daftar",
        variant: "destructive",
      });
    },
  });

  const handleDetailClick = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    if (status === 'aman') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
        ● Aman
      </span>;
    } else if (status === 'menipis') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full border border-yellow-200">
        ● Menipis
      </span>;
    } else if (status === 'habis') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
        ● Habis
      </span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-full border border-gray-200">
      ● Unknown
    </span>;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-100 dark:bg-[#0f1117] transition-colors duration-300">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap');
        
        .font-inter { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .font-outfit { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .font-tabular { font-variant-numeric: tabular-nums; }
        .tracking-heading { letter-spacing: -0.02em; }
        .tracking-body { letter-spacing: 0.01em; }
        .tracking-label { letter-spacing: 0.02em; }
        .tracking-caps { letter-spacing: 0.05em; }
        .leading-heading { line-height: 1.2; }
        .leading-body { line-height: 1.6; }
        .leading-tight { line-height: 1.3; }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header - SAME AS DASHBOARD */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-[#1a1d28] dark:to-[#1e222d] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden transition-colors duration-300">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            {/* Top Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                  <Package size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight font-jakarta text-white">
                    Master Produk
                  </h1>
                  <p className="text-blue-100 font-medium mt-1 font-inter">
                    Kelola produk dan stok barang
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <motion.button
                  onClick={() => setShowImportModal(true)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/10 text-white rounded-xl transition-all hover:bg-white/20 font-jakarta"
                  style={{ fontSize: '14px', fontWeight: 700 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Upload size={18} />
                  Import
                </motion.button>

                {activeTab !== 'produk' && (
                  <motion.button
                    onClick={() => navigate(createPageUrl('TambahBarangMasuk'))}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/10 text-white rounded-xl transition-all hover:bg-white/20 font-jakarta"
                    style={{ fontSize: '14px', fontWeight: 700 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Plus size={18} />
                    Tambah Stok
                  </motion.button>
                )}

                <motion.button
                  onClick={() => navigate(createPageUrl('TambahProduk'))}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-600 rounded-xl shadow-lg transition-all hover:bg-blue-50 font-jakarta border border-transparent"
                  style={{ fontSize: '14px', fontWeight: 700 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Plus size={18} />
                  Tambah Produk
                </motion.button>
              </div>
            </div>
            {/* Metrics Grid - Custom Mobile Layout */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3 mt-5 md:mt-6">
              {isLoading ? (
                <>
                  <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 h-[92px] animate-pulse"></div>
                  <div className="col-span-1 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 h-[92px] animate-pulse"></div>
                  <div className="col-span-1 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 h-[92px] animate-pulse"></div>
                  <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 h-[92px] animate-pulse"></div>
                </>
              ) : activeTab === 'report' ? (
          <>
            {/* ── Tab Laporan Stok: 4 KPI stok ── */}
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className="col-span-2 lg:col-span-1 text-left bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.99] transition-all duration-300"
              title="Tampilkan semua varian"
            >
              <div className="flex items-center gap-2 text-white">
                <IconBoxes size={15} className="shrink-0 opacity-90" />
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Total Stok</p>
              </div>
              <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                {totalStockUnits.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> unit</span>
              </p>
              <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Total unit tersedia</p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('menipis')}
              className="col-span-1 lg:col-span-1 text-left bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.99] transition-all duration-300"
              title="Filter varian yang perlu restock"
            >
              <div className="flex items-center gap-2 text-white">
                <IconAlertTriangle size={15} className="shrink-0 opacity-90" />
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Stok Menipis</p>
              </div>
              <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                {lowStockVariantCount.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> varian</span>
              </p>
              <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Perlu restock</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stockin')}
              className="col-span-1 lg:col-span-1 text-left bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.99] transition-all duration-300"
              title="Lihat data barang masuk"
            >
              <div className="flex items-center gap-2 text-white">
                <IconArrowDownToLine size={15} className="shrink-0 opacity-90" />
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Barang Masuk</p>
              </div>
              <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                {stockInMonthUnits.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> unit</span>
              </p>
              <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Bulan berjalan (WIB)</p>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('habis')}
              className="col-span-2 lg:col-span-1 text-left bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.99] transition-all duration-300"
              title="Filter varian yang stoknya habis"
            >
              <div className="flex items-center gap-2 text-white">
                <IconPackageX size={15} className="shrink-0 opacity-90" />
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Stok Habis</p>
              </div>
              <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                {outOfStockVariantCount.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> varian</span>
              </p>
              <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Tidak ada stok tersedia</p>
            </button>
          </>
        ) : activeTab === 'produk' ? (
          <>
            {/* ── Tab Daftar Produk: ringkasan katalog ── */}
            <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-2 text-white">
                <Package size={15} className="shrink-0 opacity-90" />
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Total Produk</p>
              </div>
              <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none mt-2">
                {(products || []).length.toLocaleString('id-ID')}
              </p>
              <p className="mt-1.5 text-[10px] md:text-[11px] text-white/85 leading-tight">Produk terdaftar</p>
            </div>

            <div className="col-span-1 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle size={15} className="shrink-0 opacity-90" />
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Produk Aktif</p>
              </div>
              <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none mt-2">
                {activeProductCount.toLocaleString('id-ID')}
              </p>
              <p className="mt-1.5 text-[10px] md:text-[11px] text-white/85 leading-tight">Status aktif</p>
            </div>

            <div className="col-span-1 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-2 text-white">
                <IconLayers size={15} className="shrink-0 opacity-90" />
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Total Varian</p>
              </div>
              <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none mt-2">
                {(variants || []).length.toLocaleString('id-ID')}
              </p>
              <p className="mt-1.5 text-[10px] md:text-[11px] text-white/85 leading-tight">Varian unik</p>
            </div>

            <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-2 text-white">
                <TrendingUp size={15} className="shrink-0 opacity-90" />
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Produk Terlaris</p>
              </div>
              <p
                className="text-lg md:text-2xl font-black text-white font-inter tracking-tight leading-tight break-words mt-2"
                title={topSeller ? `${topSeller.name} - ${topSeller.units} unit` : undefined}
              >
                {topSeller ? topSeller.name : '-'}
              </p>
              <p className="mt-1.5 text-[10px] md:text-[11px] text-white/85 leading-tight">
                {topSeller ? `Terjual ${topSeller.units} unit` : 'Belum ada penjualan'}
              </p>
            </div>
          </>
        ) : activeTab === 'stockin' ? (
                <>
                  {/* ── Tab Barang Masuk: ringkasan penerimaan dari produksi ── */}
                  <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-2 text-white">
                      <IconArrowDownToLine size={15} className="shrink-0 opacity-90" />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Total Barang Masuk</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                      {stockInMonthUnits.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> unit</span>
                    </p>
                    <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Unit diterima bulan ini</p>
                  </div>

                  <div className="col-span-1 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-2 text-white">
                      <IconCalendarClock size={15} className="shrink-0 opacity-90" />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Masuk Hari Ini</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                      {stockInTodayUnits.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> unit</span>
                    </p>
                    <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Diterima hari ini (WIB)</p>
                  </div>

                  <div className="col-span-1 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-2 text-white">
                      <IconBoxes size={15} className="shrink-0 opacity-90" />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Varian Diterima</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                      {stockInMonthVariantCount.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> varian</span>
                    </p>
                    <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">SKU unik bulan ini</p>
                  </div>

                  <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-2 text-white">
                      <ClipboardList size={15} className="shrink-0 opacity-90" />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Total Pencatatan</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                      {stockInMonthRecordCount.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> pencatatan</span>
                    </p>
                    <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Pencatatan bulan ini</p>
                  </div>
                </>
              ) : (
                <>
                  {/* ── Tab Barang Keluar: ringkasan stok yang berkurang ── */}
                  <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-2 text-white">
                      <Package size={15} className="shrink-0 opacity-90" />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Total Barang Keluar</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                      {stockOutUnits.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> unit</span>
                    </p>
                    <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Total unit stok keluar</p>
                  </div>

                  <div className="col-span-1 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-2 text-white">
                      <ClipboardList size={15} className="shrink-0 opacity-90" />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Total Transaksi</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                      {(transactions || []).length.toLocaleString('id-ID')}
                    </p>
                    <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Transaksi penjualan</p>
                  </div>

                  <div className="col-span-1 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-2 text-white">
                      <IconLayers size={15} className="shrink-0 opacity-90" />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Produk Terjual</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                      {stockOutProductCount.toLocaleString('id-ID')}
                    </p>
                    <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Produk berbeda terjual</p>
                  </div>

                  <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3 md:px-4 md:py-3.5 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center gap-2 text-white">
                      <IconCalendarClock size={15} className="shrink-0 opacity-90" />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide leading-tight min-h-[26px] md:min-h-[15px]">Keluar Hari Ini</p>
                    </div>
                    <p className="text-2xl md:text-3xl font-black text-white font-inter tracking-tight leading-none">
                      {stockOutTodayUnits.toLocaleString('id-ID')}<span className="text-xs md:text-sm font-bold"> unit</span>
                    </p>
                    <p className="mt-1 text-[10px] md:text-[11px] text-white/85 leading-tight">Unit keluar hari ini (WIB)</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-[#2d3748]/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200 dark:border-slate-600 shadow-sm transition-colors duration-300">
          <div className="grid grid-cols-2 md:flex md:gap-1">
            <button 
              onClick={() => setActiveTab('produk')}
              className={`flex items-center justify-center gap-2 px-2 md:px-6 py-3 rounded-lg transition-all ${
                activeTab === 'produk'
                  ? 'bg-blue-600 text-white shadow-md font-semibold'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 font-medium'
              }`}
              style={{ fontSize: '13px', letterSpacing: '0.01em' }}
            >
              <Package size={18} className="shrink-0" />
              <span className="truncate">Daftar Produk</span>
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              className={`flex items-center justify-center gap-2 px-2 md:px-6 py-3 rounded-lg transition-all ${
                activeTab === 'report'
                  ? 'bg-blue-600 text-white shadow-md font-semibold'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 font-medium'
              }`}
              style={{ fontSize: '13px', letterSpacing: '0.01em' }}
            >
              <ClipboardList size={18} className="shrink-0" />
              <span className="truncate">Laporan Stok</span>
            </button>
            <button 
              onClick={() => setActiveTab('stockin')}
              className={`flex items-center justify-center gap-2 px-2 md:px-6 py-3 rounded-lg transition-all ${
                activeTab === 'stockin'
                  ? 'bg-blue-600 text-white shadow-md font-semibold'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 font-medium'
              }`}
              style={{ fontSize: '13px', letterSpacing: '0.01em' }}
            >
              <TrendingUp size={18} className="shrink-0" />
              <span className="truncate">Barang Masuk</span>
            </button>
            <button 
              onClick={() => setActiveTab('stockout')}
              className={`flex items-center justify-center gap-2 px-2 md:px-6 py-3 rounded-lg transition-all ${
                activeTab === 'stockout'
                  ? 'bg-blue-600 text-white shadow-md font-semibold'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 font-medium'
              }`}
              style={{ fontSize: '13px', letterSpacing: '0.01em' }}
            >
              <TrendingDown size={18} className="shrink-0" />
              <span className="truncate">Barang Keluar</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'produk' && (
            <motion.div
              key="produk"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col md:flex-row gap-4 mb-6 md:max-w-[720px]">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
                  <input
                    type="text"
                    placeholder="Cari nama produk atau SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-900 dark:text-slate-100 transition-all duration-200 font-inter"
                    style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.01em' }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer min-w-[180px] shadow-sm text-gray-900 dark:text-slate-100 transition-all duration-200 font-inter"
                  style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.01em' }}
                >
                  <option value="all">Semua Status</option>
                  <option value="aman">Stok Aman</option>
                  <option value="menipis">Stok Menipis</option>
                  <option value="habis">Stok Habis</option>
                </select>
              </div>

              {/* DESKTOP: TABLE VIEW */}
              <div className="hidden md:block bg-white dark:bg-[#1a1d28] rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#1e3a5f]">
                        <th className="px-4 py-3.5 text-left font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f]">
                          Nama Produk
                        </th>
                        <th className="px-4 py-3.5 text-center font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f]">
                          Stok Awal
                        </th>
                        <th className="px-4 py-3.5 text-right font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f]">
                          HPP
                        </th>
                        <th className="px-4 py-3.5 text-right font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f]">
                          Harga Jual
                        </th>
                        <th className="px-4 py-3.5 text-center font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f] cursor-pointer hover:bg-[#2d4a6f] transition-colors"
                            onClick={() => handleSort('stockPercentage')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            STATUS
                            <ArrowUpDown className="w-3 h-3 opacity-70" />
                          </div>
                        </th>
                        <th className="px-4 py-3.5 text-center font-inter text-xs font-bold text-white uppercase tracking-wide">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center font-inter text-sm text-gray-400 dark:text-slate-500">
                            {filteredProducts.length === 0 ? "Belum ada produk" : "Tidak ada produk di halaman ini"}
                          </td>
                        </tr>
                      ) : (
                        paginatedProducts.map((product, index) => {
                          const rowBg = index % 2 === 0 ? 'bg-white dark:bg-[#16171d]' : 'bg-blue-50/30 dark:bg-[#1a1d28]';
                          return (
                           <tr 
                             key={product.id} 
                             className={`${rowBg} hover:bg-blue-100/50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800/50 ${product.product_type === 'free_gift' ? 'border-l-4 border-l-indigo-400' : ''}`}
                           >
                              <td className="px-4 py-3.5 text-left align-middle font-inter text-sm font-medium text-gray-700 dark:text-slate-300 border-r border-gray-100 dark:border-slate-800/50">
                                {product.name}
                              </td>
                              <td className="px-4 py-3.5 text-center align-middle font-inter text-sm font-bold text-gray-900 dark:text-white border-r border-gray-100 dark:border-slate-800/50">
                                {product.initial_stock || 0}
                              </td>
                              <td className="px-4 py-3.5 text-right align-middle font-inter text-sm font-medium text-gray-600 dark:text-slate-300 border-r border-gray-100 dark:border-slate-800/50">
                                Rp {product.hpp.toLocaleString('id-ID')}
                              </td>
                              <td className="px-4 py-3.5 text-right align-middle font-inter text-sm font-bold border-r border-gray-100 dark:border-slate-800/50">
                                {product.product_type === 'free_gift' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">
                                    <Gift size={12} /> Free Gift
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">Rp {product.price.toLocaleString('id-ID')}</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center align-middle border-r border-gray-100">
                                {renderStockIndicator(product)}
                              </td>
                              <td className="px-4 py-3.5 text-center align-middle">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDetailClick(product);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                                    title="Lihat Detail"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(createPageUrl('TambahProduk'), { state: { product } });
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                    title="Edit Produk"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(product, 'product');
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                    title="Hapus Produk"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE: CARD LIST VIEW */}
              <div className="md:hidden space-y-3">
                {paginatedProducts.length === 0 ? (
                  <div className="bg-white dark:bg-[#1a1d28] rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-8 text-center transition-colors duration-300">
                    <p className="font-inter text-gray-400 dark:text-slate-500" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.01em' }}>
                      {filteredProducts.length === 0 ? "Belum ada produk" : "Tidak ada produk di halaman ini"}
                    </p>
                  </div>
                ) : (
                  paginatedProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`bg-gradient-to-br from-white to-gray-50/50 dark:from-[#2d3748] dark:to-slate-700/50 rounded-2xl shadow-md border border-gray-200/80 dark:border-slate-600 p-4 backdrop-blur-sm transition-colors duration-300 ${product.product_type === 'free_gift' ? 'border-l-4 border-l-indigo-400' : ''}`}
                      style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)' }}
                    >
                      <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200/60 dark:border-slate-600">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <Package size={14} className="text-white" />
                            </div>
                            <p className="font-outfit text-blue-600 dark:text-blue-400" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.01em' }}>
                              {product.sku}
                            </p>
                          </div>
                          <p className="font-inter text-gray-900 dark:text-slate-100" style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em' }}>
                            {product.name}
                          </p>
                        </div>
                        {renderStockIndicator(product)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-blue-50/50 dark:bg-[#404B5C] rounded-xl p-3 border border-blue-100/60 dark:border-slate-600/50 transition-colors duration-300">
                          <p className="font-inter text-xs text-blue-600 dark:text-blue-400 mb-1 font-semibold">Stok Awal</p>
                          <p className="font-outfit font-tabular text-blue-600 dark:text-blue-400" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.01em' }}>
                            {product.initial_stock || 0}
                          </p>
                        </div>
                        <div className="bg-orange-50/50 dark:bg-[#404B5C] rounded-xl p-3 border border-orange-100/60 dark:border-slate-600/50 transition-colors duration-300">
                          <p className="font-inter text-xs text-orange-600 dark:text-orange-400 mb-1 font-semibold">HPP</p>
                          <p className="font-outfit font-tabular text-orange-600 dark:text-orange-400" style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.01em' }}>
                            Rp {product.hpp.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div className={`rounded-xl p-3 mb-3 border transition-colors duration-300 ${product.product_type === 'free_gift' ? 'bg-indigo-50/80 dark:bg-[#404B5C] border-indigo-100/60 dark:border-slate-600/50' : 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-[#404B5C] dark:to-[#404B5C] border-green-100/60 dark:border-slate-600/50'}`}>
                        <div className="flex justify-between items-center">
                          <p className={`font-inter text-xs font-semibold ${product.product_type === 'free_gift' ? 'text-indigo-700 dark:text-indigo-400' : 'text-green-700 dark:text-green-400'}`}>Harga Jual</p>
                          {product.product_type === 'free_gift' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">
                              <Gift size={12} /> Free Gift
                            </span>
                          ) : (
                            <p className="font-outfit font-tabular text-emerald-600 dark:text-emerald-400" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.01em' }}>
                              Rp {product.price.toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200/60 dark:border-slate-600">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDetailClick(product);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all font-inter border border-indigo-100"
                          style={{ fontSize: '12px', fontWeight: 600 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Eye size={15} />
                          Lihat
                        </motion.button>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(createPageUrl('TambahProduk'), { state: { product } });
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all font-inter border border-blue-100"
                          style={{ fontSize: '12px', fontWeight: 600 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Edit size={15} />
                          Edit
                        </motion.button>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(product, 'product');
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all font-inter border border-red-100"
                          style={{ fontSize: '12px', fontWeight: 600 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Trash2 size={15} />
                          Hapus
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {filteredProducts.length > 0 && (
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6 bg-white dark:bg-[#1a1d28] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-inter">
                    Menampilkan <span className="font-bold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> dari <span className="font-bold text-gray-900 dark:text-white">{filteredProducts.length}</span> produk
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-600/50 hover:bg-gray-50 dark:hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} className="text-gray-600 dark:text-slate-300" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Logic to show simplified page numbers if many pages
                        let pageNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = currentPage - 2 + i;
                          if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-600/50 hover:bg-gray-50 dark:hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} className="text-gray-600 dark:text-slate-300" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: LAPORAN STOK */}
          {activeTab === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Info count + filter aktif */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <p className="text-sm text-gray-600 dark:text-slate-400 font-inter">
                  Menampilkan <span className="text-blue-600 dark:text-blue-400 font-bold">{reportVariants.length}</span> variant (warna) • {products.length} produk
                </p>
                {stockFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStockFilter('all')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                    title="Hapus filter"
                  >
                    Filter: {stockFilter === 'habis' ? 'Stok habis' : 'Perlu restock'} <X size={12} />
                  </button>
                )}
              </div>

              {/* Desktop: Tabel stok per variant & ukuran */}
              <div className="hidden md:block bg-white dark:bg-[#1a1d28] rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#1e3a5f]">
                        <th className="px-4 py-3.5 text-left font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f]">Produk</th>
                        <th className="px-4 py-3.5 text-left font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f]">Series</th>
                        <th className="px-4 py-3.5 text-left font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f]">Warna</th>
                        {SIZES.map((size) => (
                          <th key={size} className="px-3 py-3.5 text-center font-inter text-xs font-bold text-white uppercase tracking-wide border-r border-[#2d4a6f]">{size}</th>
                        ))}
                        <th className="px-4 py-3.5 text-center font-inter text-xs font-bold text-white uppercase tracking-wide">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportVariants.length === 0 ? (
                        <tr>
                          <td colSpan={3 + SIZES.length + 1} className="px-6 py-12 text-center font-inter text-sm text-gray-400 dark:text-slate-500">
                            {stockFilter === 'all'
                              ? 'Belum ada variant — tambahkan produk dengan warna & ukuran dulu'
                              : 'Tidak ada varian yang cocok dengan filter ini'}
                          </td>
                        </tr>
                      ) : (
                        reportVariants.map((v, index) => {
                          const product = products.find(p => p.id === v.product_id);
                          const st = normalizeStock(v.stock);
                          const total = SIZES.reduce((s, sz) => s + st[sz], 0);
                          const rowBg = index % 2 === 0 ? 'bg-white dark:bg-[#16171d]' : 'bg-blue-50/30 dark:bg-[#1a1d28]';
                          return (
                            <tr key={v.id} className={`${rowBg} hover:bg-blue-100/50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800/50`}>
                              <td className="px-4 py-3.5 text-left align-middle font-inter text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-100 dark:border-slate-800/50">
                                {product?.name || v.product_name || '-'}
                              </td>
                              <td className="px-4 py-3.5 text-left align-middle font-inter text-sm text-gray-600 dark:text-slate-300 border-r border-gray-100 dark:border-slate-800/50">
                                {v.series_name || '-'}
                              </td>
                              <td className="px-4 py-3.5 text-left align-middle font-inter text-sm font-medium text-gray-700 dark:text-slate-300 border-r border-gray-100 dark:border-slate-800/50">
                                {v.color && String(v.color).toLowerCase() !== 'default'
                                  ? v.color
                                  : <span className="text-gray-400 dark:text-slate-500 italic">Belum diatur</span>}
                              </td>
                              {SIZES.map((sz) => (
                                <td key={sz} className={`px-3 py-3.5 text-center align-middle font-inter text-sm font-semibold border-r border-gray-100 dark:border-slate-800/50 ${st[sz] === 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-slate-200'}`}>
                                  {st[sz]}
                                </td>
                              ))}
                              <td className="px-4 py-3.5 text-center align-middle font-inter text-sm font-black text-blue-600 dark:text-blue-400">
                                {total}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: Card per variant */}
              <div className="md:hidden space-y-3">
                {reportVariants.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                      <p className="font-inter text-sm text-gray-400">
                        {stockFilter === 'all' ? 'Belum ada variant' : 'Tidak ada varian yang cocok dengan filter ini'}
                      </p>
                  </div>
                ) : (
                  reportVariants.map((v) => {
                    const product = products.find(p => p.id === v.product_id);
                    const st = normalizeStock(v.stock);
                    const total = SIZES.reduce((s, sz) => s + st[sz], 0);
                    return (
                      <div key={v.id} className="bg-white rounded-2xl shadow-md border border-gray-200/80 p-4">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200/60">
                          <div>
                            <p className="font-inter text-sm font-semibold text-gray-900">{product?.name || v.product_name || '-'}</p>
                            <p className="text-xs text-gray-500">
                        {v.color && String(v.color).toLowerCase() !== 'default'
                          ? v.color
                          : <span className="italic">Belum diatur</span>}
                        {v.series_name ? ` • ${v.series_name}` : ''}
                      </p>
                          </div>
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black">{total} pcs</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {SIZES.map((sz) => (
                            <div key={sz} className={`rounded-xl p-2 border text-center ${st[sz] === 0 ? 'bg-red-50/60 border-red-100' : 'bg-gray-50/60 border-gray-200/60'}`}>
                              <p className="text-[10px] font-bold text-gray-500 uppercase">{sz}</p>
                              <p className={`text-base font-black ${st[sz] === 0 ? 'text-red-500' : 'text-gray-700'}`}>{st[sz]}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: BARANG MASUK */}
          {activeTab === 'stockin' && (
            <motion.div
              key="stockin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {(() => {
                const manualStockIns = stockIns.filter(si => si.source === 'manual' || !si.source);
                return (
                  <>
                    {/* Action Button */}
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-600 dark:text-slate-400 font-inter">
                        Menampilkan <span className="text-blue-600 dark:text-blue-400 font-bold">{manualStockIns.length}</span> data barang masuk
                      </p>
                      <motion.button
                        onClick={() => navigate(createPageUrl('TambahBarangMasuk'))}
                        className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus size={18} />
                        Barang Masuk
                      </motion.button>
                    </div>

                    {/* Table - Google Sheet Style */}
                    <div className="bg-white dark:bg-[#1a1d28] rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-[#1e3a5f] dark:bg-[#1e3a5f]">
                              <th className="px-4 py-3.5 text-left font-inter text-xs font-bold text-white uppercase tracking-wide">
                                Tanggal
                              </th>
                              <th className="px-4 py-3.5 text-left font-inter text-xs font-bold text-white uppercase tracking-wide">
                                SKU
                              </th>
                              <th className="px-4 py-3.5 text-left font-inter text-xs font-bold text-white uppercase tracking-wide">
                                Nama Produk
                              </th>
                              <th className="px-4 py-3.5 text-center font-inter text-xs font-bold text-white uppercase tracking-wide">
                                Quantity
                              </th>
                              <th className="px-4 py-3.5 text-center font-inter text-xs font-bold text-white uppercase tracking-wide">
                                Catatan
                              </th>
                              <th className="px-4 py-3.5 text-center font-inter text-xs font-bold text-white uppercase tracking-wide">
                                Aksi
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {manualStockIns.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="px-6 py-12 text-center font-inter text-sm text-gray-400 dark:text-slate-500">
                                  Belum ada data barang masuk
                                </td>
                              </tr>
                            ) : (
                              manualStockIns.map((si, index) => {
                                const product = products.find(p => p.id === si.product_id);
                                const rowBg = index % 2 === 0 ? 'bg-white dark:bg-[#16171d]' : 'bg-blue-50/30 dark:bg-[#1a1d28]';
                                return (
                                  <tr key={si.id} className={`${rowBg} hover:bg-blue-100/50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800/50`}>
                                    <td className="px-4 py-3.5 text-left align-middle font-inter text-sm text-gray-700 dark:text-slate-300">
                                      {format(new Date(si.date), 'dd MMM yyyy')}
                                    </td>
                                    <td className="px-4 py-3.5 text-left align-middle font-inter text-sm font-semibold text-gray-900 dark:text-white">
                                      {si.sku || product?.sku || '-'}
                                    </td>
                                    <td className="px-4 py-3.5 text-left align-middle font-inter text-sm font-medium text-gray-700 dark:text-slate-300">
                                      {si.product_name || product?.name || '-'}
                                    </td>
                                    <td className="px-4 py-3.5 text-center align-middle">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-sm font-bold">
                                        +{si.qty}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-center align-middle font-inter text-sm text-gray-500 dark:text-slate-400">
                                      {si.notes || '-'}
                                    </td>
                                    <td className="px-4 py-3.5 text-center align-middle">
                                      <button
                                        onClick={() => handleDeleteClick(si, 'stockin')}
                                        className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                        title="Hapus"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* TAB: BARANG KELUAR */}
          {activeTab === 'stockout' && (
            <motion.div
              key="stockout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 mb-4 flex items-start gap-3 transition-colors duration-300">
                <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Informasi Barang Keluar</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Data barang keluar diambil otomatis dari transaksi penjualan. Untuk menambah barang keluar, buat transaksi penjualan baru di halaman Transaksi.
                  </p>
                </div>
              </div>

              {/* Info count */}
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 font-inter">
                Menampilkan <span className="text-blue-600 dark:text-blue-400 font-bold">{transactions.length}</span> data barang keluar
              </p>

              {/* Table - Google Sheet Style */}
              <div className="bg-white dark:bg-[#1a1d28] rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse table-fixed min-w-[640px]">
                    <thead>
                    <tr className="bg-[#1e3a5f] dark:bg-[#1e3a5f]">
                    <th className="w-[14%] px-2.5 py-2.5 text-left font-inter text-[11px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                    Tanggal
                    </th>
                    <th className="w-[22%] px-2.5 py-2.5 text-left font-inter text-[11px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                    Order ID
                    </th>
                    <th className="px-2.5 py-2.5 text-left font-inter text-[11px] font-bold text-white uppercase tracking-wide">
                    Produk
                    </th>
                    <th className="w-[12%] px-2.5 py-2.5 text-center font-inter text-[11px] font-bold text-white uppercase tracking-wide">
                    Qty
                    </th>
                    <th className="w-[20%] px-2.5 py-2.5 text-right font-inter text-[11px] font-bold text-white uppercase tracking-wide whitespace-nowrap">
                    Total
                    </th>
                    </tr>
                    </thead>
                    <tbody>
                    {transactions.length === 0 ? (
                    <tr>
                    <td colSpan="5" className="px-4 py-10 text-center font-inter text-sm text-gray-400 dark:text-slate-500">
                    Belum ada data barang keluar
                    </td>
                    </tr>
                    ) : (
                    transactions.map((t, index) => {
                    const product = products.find(p => p.id === t.product_id);
                    const rowBg = index % 2 === 0 ? 'bg-white dark:bg-[#16171d]' : 'bg-blue-50/30 dark:bg-[#1a1d28]';
                    return (
                    <tr key={t.id} className={`${rowBg} hover:bg-blue-100/50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800/50`}>
                    <td className="px-2.5 py-1.5 align-middle font-inter text-[13px] text-gray-600 dark:text-slate-300 whitespace-nowrap">
                    {format(new Date(t.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-2.5 py-1.5 align-middle whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                    <span className="font-inter text-[13px] font-semibold text-gray-900 dark:text-white">
                    {t.order_id || '-'}
                    </span>
                    {String(t.status || '') === 'return' && (
                    <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-bold">Batal</span>
                    )}
                    </span>
                    </td>
                    <td className="px-2.5 py-1.5 align-middle font-inter text-[13px] font-medium text-gray-900 dark:text-white break-words">
                    {t.product_name || product?.name || '-'}
                    </td>
                    <td className="px-2.5 py-1.5 text-center align-middle">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-[13px] font-bold">
                    -{t.qty}
                    </span>
                    </td>
                    <td className="px-2.5 py-1.5 text-right align-middle font-inter text-[13px] font-semibold whitespace-nowrap">
                    {product?.product_type === 'free_gift' || t.is_free_gift ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 rounded-full text-[11px] font-bold border border-pink-200 dark:border-pink-700">
                    <Gift size={11} /> Free Gift
                    </span>
                    ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">Rp {(t.total || 0).toLocaleString('id-ID')}</span>
                    )}
                    </td>
                    </tr>
                    );
                    })
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={deleteType === 'product' ? "Yakin ingin menghapus produk ini?" : "Yakin ingin menghapus data barang masuk ini?"}
        itemName={productToDelete ? (deleteType === 'product' ? productToDelete.name : `${products.find(p => p.id === productToDelete.product_id)?.name || 'Produk'} (${productToDelete.qty} unit)`) : ''}
        isDeleting={deleteProductMutation.isPending || deleteStockInMutation.isPending}
      />

      <ProductDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        product={selectedProduct}
        stockIns={stockIns}
        transactions={transactions}
        variants={variants}
      />

      <ImportProductModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
