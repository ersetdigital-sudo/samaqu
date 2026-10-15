"use client";

/**
 * Halaman "Transaksi" dashboard internal (/ops).
 *
 * Tata letaknya mengikuti halaman Leads: kartu header → baris kartu statistik bernomor →
 * keterangan cakupan → kartu daftar (judul + badge jumlah, pencarian, navigasi bulan,
 * filter tanggal/sumber/status) → tabel.
 *
 * Datanya BUKAN tabel baru: baris di sini adalah pesanan di tabel `orders` yang sama
 * dengan website (jadi penjualan dari checkout otomatis muncul), ditambah transaksi
 * manual yang dicatat lewat tombol "Tambah Transaksi".
 */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Ban,
  CalendarDays,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  FileText,
  Package,
  Pencil,
  Plus,
  Search,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { base44 } from "@/lib/ops-api";
import { SALE_STATUSES, STATUS_LABEL } from "@/lib/transaksi";
import DateFilter, { formatTanggalID } from "@/components/ops/leads/DateFilter";
import ConfirmDeleteModal from "@/components/ops/ConfirmDeleteModal";
import TransaksiFormModal from "@/components/ops/transaksi/TransaksiFormModal";
import TransaksiDetailDrawer from "@/components/ops/transaksi/TransaksiDetailDrawer";
import { MONTHS, SOURCE_STYLES, STATUS_STYLES, formatRupiah, pad } from "@/components/ops/transaksi/transaksi-format";
import { useToast } from "@/components/ops/ui/use-toast";

const digits = (value) => String(value ?? "").replace(/\D/g, "");
/** Bandingkan nomor HP tanpa peduli 08… / 628… / 8…. */
const phoneKey = (value) => digits(value).replace(/^0+/, "").replace(/^62/, "");

export default function Transaksi() {
  const now = new Date();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput).trim();
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter TANGGAL (satu hari, WIB) — disimpan di URL seperti halaman Leads.
  const [selectedDate, setSelectedDate] = useState("");
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tanggal") || "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
      setSelectedDate(param);
      setYear(Number(param.slice(0, 4)));
      setMonth(Number(param.slice(5, 7)) - 1);
    }
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedDate) params.set("tanggal", selectedDate);
    else params.delete("tanggal");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [selectedDate]);

  const start = `${year}-${pad(month + 1)}-01`;
  const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["transaksi", "orders", start, end],
    queryFn: () => base44.entities.Transaction.orders({ start, end }),
    initialData: [],
  });

  const visibleOrders = useMemo(() => {
    const query = search.toLowerCase();
    const queryPhone = phoneKey(search);
    return orders.filter((order) => {
      if (sourceFilter !== "all" && order.source !== sourceFilter) return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (selectedDate && order.date_wib !== selectedDate) return false;
      if (!query) return true;
      if (String(order.customer_name || "").toLowerCase().includes(query)) return true;
      if (String(order.order_number || "").toLowerCase().includes(query)) return true;
      if (String(order.customer_whatsapp || "").includes(search)) return true;
      return queryPhone.length >= 4 && phoneKey(order.customer_whatsapp).includes(queryPhone);
    });
  }, [orders, search, sourceFilter, statusFilter, selectedDate]);

  // Opsi filter diambil dari data yang benar-benar ada di bulan itu.
  const sourceOptions = useMemo(() => [...new Set(orders.map((o) => o.source))], [orders]);
  const statusOptions = useMemo(() => [...new Set(orders.map((o) => o.status))], [orders]);

  const stats = useMemo(() => {
    const sold = visibleOrders.filter((order) => SALE_STATUSES.includes(order.status));
    const revenue = sold.reduce((sum, order) => sum + (order.total || 0), 0);
    return {
      count: visibleOrders.length,
      revenue,
      pieces: sold.reduce((sum, order) => sum + (order.qty_total || 0), 0),
      average: sold.length ? Math.round(revenue / sold.length) : 0,
      cancelled: visibleOrders.filter((order) => order.status === "dibatalkan").length,
    };
  }, [visibleOrders]);

  const markedDates = useMemo(() => [...new Set(orders.map((o) => o.date_wib).filter(Boolean))], [orders]);

  const filtersActive =
    Boolean(search) || sourceFilter !== "all" || statusFilter !== "all" || Boolean(selectedDate);

  const resetFilters = () => {
    setSearchInput("");
    setSourceFilter("all");
    setStatusFilter("all");
    setSelectedDate("");
  };

  const coverageLabel = selectedDate ? formatTanggalID(selectedDate) : `${MONTHS[month]} ${year}`;

  const prevMonth = () => {
    setSelectedDate("");
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    setSelectedDate("");
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const cancelMutation = useMutation({
    mutationFn: (order) => base44.entities.Transaction.cancel(order.order_number),
    onSuccess: (result) => {
      // Stok dikembalikan oleh jalur pembatalan yang sama dengan panel admin.
      queryClient.invalidateQueries({ queryKey: ["transaksi"] });
      toast({ title: "✅ Transaksi dibatalkan", description: `No. Order ${result?.order_number ?? ""}`, variant: "success" });
      setCancelTarget(null);
      setDetail(null);
    },
    onError: (error) =>
      toast({
        title: "Gagal membatalkan",
        description: error instanceof Error ? error.message : "Coba lagi.",
        variant: "destructive",
      }),
  });

  const statCards = [
    { label: "Total Transaksi", value: stats.count, icon: FileText },
    { label: "Total Omset", value: `Rp ${formatRupiah(stats.revenue)}`, icon: Wallet },
    { label: "Total Pcs Terjual", value: stats.pieces, icon: Package },
    { label: "Rata-rata per Transaksi", value: `Rp ${formatRupiah(stats.average)}`, icon: Calculator },
    { label: "Transaksi Dibatalkan", value: stats.cancelled, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1d28] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <FileText size={28} className="text-slate-900 dark:text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">Transaksi</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Catat penjualan &amp; pantau pesanan</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm transition-all active:scale-95"
          >
            <Plus size={18} />
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Icon size={19} className="text-slate-700 dark:text-slate-200" />
                </div>
                <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 tracking-widest">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="text-2xl font-black font-heading text-slate-900 dark:text-white mt-0.5 tracking-tight whitespace-nowrap">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 px-1 -mt-3">
        Cakupan: <span className="font-bold text-slate-900 dark:text-white">{coverageLabel}</span>
        {search ? ` · pencarian "${search}"` : ""}
      </p>

      {/* Daftar transaksi */}
      <div className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white">Daftar Transaksi</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {filtersActive ? `${visibleOrders.length} dari ${orders.length} transaksi` : `${orders.length} transaksi`}
            </span>
          </div>

          <div className="relative ml-auto mr-2 w-full sm:w-auto sm:max-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari nama / nomor HP / No. Order..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Bulan sebelumnya">
              <ChevronLeft size={16} className="text-slate-600 dark:text-slate-300" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-900 dark:text-white min-w-[130px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Bulan berikutnya">
              <ChevronRight size={16} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Filter tanggal + sumber + status (semuanya bisa dipakai bersamaan) */}
          <DateFilter
            value={selectedDate}
            onChange={setSelectedDate}
            month={month}
            year={year}
            onMonthChange={(nextYear, nextMonthIndex) => {
              setYear(nextYear);
              setMonth(nextMonthIndex);
            }}
            markedDates={markedDates}
            markedLabel="ada transaksi"
          />

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            aria-label="Filter sumber"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua sumber</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {SOURCE_STYLES[source]?.label || source}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status] || status}
              </option>
            ))}
          </select>

          {filtersActive && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Reset
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {selectedDate ? (
                <CalendarDays size={26} className="text-slate-400" />
              ) : filtersActive ? (
                <Search size={26} className="text-slate-400" />
              ) : (
                <Database size={26} className="text-slate-400" />
              )}
            </div>
            <p className="font-bold text-slate-900 dark:text-white">
              {filtersActive ? "Tidak ada transaksi yang cocok" : `Belum ada transaksi di ${MONTHS[month]} ${year}`}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {filtersActive
                ? "Ubah pencarian atau filter, atau tampilkan semua"
                : 'Klik "Tambah Transaksi" untuk mencatat penjualan manual'}
            </p>
            {filtersActive ? (
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <X size={16} />
                Tampilkan semua
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
              >
                <Plus size={16} />
                Tambah Transaksi
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-left">
                  <th className="w-[12%] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggal</th>
                  <th className="w-[6%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jam</th>
                  <th className="w-[13%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">No. Order</th>
                  <th className="w-[14%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pelanggan</th>
                  <th className="w-[9%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sumber</th>
                  <th className="w-[16%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produk</th>
                  <th className="w-[11%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Total</th>
                  <th className="w-[9%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="w-[10%] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order, index) => {
                  const status = STATUS_STYLES[order.status];
                  const source = SOURCE_STYLES[order.source];
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                      onClick={() => setDetail(order)}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
                    >
                      <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap truncate" title={formatTanggalID(order.date_wib)}>
                        {formatTanggalID(order.date_wib)}
                      </td>
                      <td className="px-2 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{order.time_wib || "-"}</td>
                      <td className="px-2 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap truncate" title={order.order_number}>
                        {order.order_number}
                      </td>
                      <td className="px-2 py-3">
                        <span className="block font-semibold text-slate-900 dark:text-white truncate" title={order.customer_name}>
                          {order.customer_name}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{order.customer_whatsapp}</span>
                      </td>
                      <td className="px-2 py-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${source?.badge || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                          {order.source_label}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-700 dark:text-slate-200 truncate" title={order.item_summary}>
                        {order.item_summary}
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        Rp {formatRupiah(order.total)}
                      </td>
                      <td className="px-2 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${status?.badge || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                          {status?.icon ? <status.icon size={12} /> : null}
                          {order.status_label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setDetail(order);
                            }}
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            aria-label="Lihat detail"
                          >
                            <Eye size={15} />
                          </button>
                          {order.can_edit && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditing(order);
                                setFormOpen(true);
                              }}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              aria-label="Ubah transaksi"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {order.can_cancel && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setCancelTarget(order);
                              }}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              aria-label="Batalkan transaksi"
                            >
                              <Ban size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransaksiFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        initialData={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["transaksi"] })}
      />

      <TransaksiDetailDrawer
        open={!!detail}
        order={detail}
        onClose={() => setDetail(null)}
        onEdit={(order) => {
          setDetail(null);
          setEditing(order);
          setFormOpen(true);
        }}
        onCancel={(order) => setCancelTarget(order)}
      />

      <ConfirmDeleteModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMutation.mutate(cancelTarget)}
        title="Batalkan transaksi ini?"
        itemName={cancelTarget ? `${cancelTarget.order_number} · ${cancelTarget.customer_name}` : undefined}
        isDeleting={cancelMutation.isPending}
      />
    </div>
  );
}
