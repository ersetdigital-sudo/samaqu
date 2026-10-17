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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  FileText,
  Package,
  Plus,
  Search,
  Trash2,
  Truck,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { base44 } from "@/lib/ops-api";
import { SALE_STATUSES, STATUS_LABEL } from "@/lib/transaksi";
import { ORDER_STAGE_TABS, matchesStage, orderStage } from "@/lib/order-flow";
import DateFilter, { formatTanggalID } from "@/components/ops/leads/DateFilter";
import ConfirmDeleteModal from "@/components/ops/ConfirmDeleteModal";
import TransaksiFormModal from "@/components/ops/transaksi/TransaksiFormModal";
import TransaksiDetailDrawer from "@/components/ops/transaksi/TransaksiDetailDrawer";
import GlassCard from "@/components/ops/GlassCard";
import { MONTHS, SOURCE_STYLES, STATUS_STYLES, formatRupiah, formatTanggalSingkatID, itemVariantText, pad } from "@/components/ops/transaksi/transaksi-format";
import { useToast } from "@/components/ops/ui/use-toast";

const digits = (value) => String(value ?? "").replace(/\D/g, "");
/** Bandingkan nomor HP tanpa peduli 08… / 628… / 8…. */
const phoneKey = (value) => digits(value).replace(/^0+/, "").replace(/^62/, "");

/** Ikon per tab tahap (gaya tab menu Produk) — SVG inline, tanpa dependensi baru. */
function StageIcon({ stage }) {
  switch (stage) {
    case "belum_bayar":
      return (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M7 15h3" />
        </svg>
      );
    case "belum_dipacking":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
        </svg>
      );
    case "sudah_dipacking":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
        </svg>
      );
    case "dikirim":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M2 7h12v10H2zM14 10h4l3 3v4h-7" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      );
    case "selesai":
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l3 3 5-6" />
        </svg>
      );
    case "dibatalkan":
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
  }
}

export default function Transaksi({ variant = "ops" }) {
  // `variant="panel"` merender tampilan ala mockup (panel admin). Default "ops" = tak berubah.
  const isPanel = variant === "panel";
  const now = new Date();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput).trim();
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // Filter TAHAP khusus tampilan panel (`order-flow`: Belum Bayar / Belum di Packing / …).
  const [stageFilter, setStageFilter] = useState("semua");

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
      // Panel: saring per TAHAP (order-flow, sama seperti halaman Pesanan admin). Ops: per status tersimpan (perilaku lama).
      if (isPanel ? !matchesStage(order, stageFilter) : statusFilter !== "all" && order.status !== statusFilter) return false;
      if (selectedDate && order.date_wib !== selectedDate) return false;
      if (!query) return true;
      if (String(order.customer_name || "").toLowerCase().includes(query)) return true;
      if (String(order.order_number || "").toLowerCase().includes(query)) return true;
      if (String(order.customer_whatsapp || "").includes(search)) return true;
      // Cari juga lewat isi kolom Produk (nama produk + kain/series/ukuran) — sumber datanya
      // sama dengan kolom itu, jadi yang terlihat di tabel itulah yang bisa dicari.
      if ((order.items || []).some((item) => `${item.product_name || ""} ${itemVariantText(item)}`.toLowerCase().includes(query))) return true;
      return queryPhone.length >= 4 && phoneKey(order.customer_whatsapp).includes(queryPhone);
    });
  }, [orders, search, sourceFilter, statusFilter, stageFilter, selectedDate, isPanel]);

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
      cancelled: visibleOrders.filter((order) => order.status === "dibatalkan").length,
    };
  }, [visibleOrders]);

  const markedDates = useMemo(() => [...new Set(orders.map((o) => o.date_wib).filter(Boolean))], [orders]);

  const filtersActive =
    Boolean(search) ||
    sourceFilter !== "all" ||
    statusFilter !== "all" ||
    (isPanel && stageFilter !== "semua") ||
    Boolean(selectedDate);

  const resetFilters = () => {
    setSearchInput("");
    setSourceFilter("all");
    setStatusFilter("all");
    setStageFilter("semua");
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
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  /**
   * Hapus transaksi manual (untuk membuang data uji). Server menolak kalau pesanan sudah punya
   * resi J&T atau kalau itu pesanan website, dan mengembalikan stok lebih dulu.
   */
  const deleteMutation = useMutation({
    mutationFn: (order) => base44.entities.Transaction.deleteOrder(order.order_number),
    onSuccess: (result, order) => {
      queryClient.invalidateQueries({ queryKey: ["transaksi"] });
      setDeleteTarget(null);
      setDetail((current) => (current?.order_number === order.order_number ? null : current));
      toast({
        title: "✅ Transaksi dihapus",
        description: `${result?.order_number || order.order_number} · stok sudah dikembalikan`,
        variant: "success",
      });
    },
    onError: (error) =>
      toast({
        title: "Gagal menghapus",
        description: error instanceof Error ? error.message : "Coba lagi.",
        variant: "destructive",
      }),
  });

  /**
   * Setelah aksi resi di drawer Detail:
   * - sukses → baris yang sedang dibuka langsung diperbarui (nomor resi + status kirim), lalu
   *   daftar disegarkan supaya penanda resi muncul tanpa reload;
   * - kondisi "resi terbit tapi gagal dicatat" → data transaksi diambil ulang dari server
   *   supaya admin melihat kondisi sebenarnya.
   */
  const handleResiCreated = async (patch, refreshFromServer = false) => {
    if (patch && !refreshFromServer) {
      setDetail((current) => (current ? { ...current, ...patch } : current));
      // Perbarui baris tabel SEKARANG, tanpa menunggu refetch. Dulu tabel baru berubah
      // setelah reload karena cache daftar masih dianggap segar (staleTime 60 detik).
      queryClient.setQueryData(["transaksi", "orders", start, end], (rows) =>
        Array.isArray(rows)
          ? rows.map((row) => (row.order_number === detail?.order_number ? { ...row, ...patch } : row))
          : rows,
      );
    }
    try {
      // `staleTime: 0` memaksa ambil data server — bukan mengembalikan cache yang masih segar.
      const fresh = await queryClient.fetchQuery({ queryKey: ["transaksi", "orders", start, end], staleTime: 0 });
      if (refreshFromServer) {
        const found = (fresh || []).find((row) => row.order_number === detail?.order_number);
        if (found) setDetail(found);
      }
    } catch {
      // daftar tetap disegarkan lewat invalidasi di bawah
    }
    queryClient.invalidateQueries({ queryKey: ["transaksi"] });
  };

  const statCards = [
    { label: "Total Transaksi", value: String(stats.count), icon: FileText, caption: "pesanan sesuai filter" },
    { label: "Total Omset", value: `Rp ${formatRupiah(stats.revenue)}`, icon: Wallet, caption: "hanya yang sudah dibayar" },
    { label: "Total Pcs Terjual", value: String(stats.pieces), icon: Package, caption: "dari pesanan sudah dibayar" },
    { label: "Transaksi Dibatalkan", value: String(stats.cancelled), icon: XCircle, caption: "tidak dihitung omset" },
  ];

  // ── Data khusus tampilan panel (ala mockup) ──
  // KPI dihitung dari SELURUH data bulan (bukan hasil filter) — sama seperti mockup.
  // Omset tetap memakai aturan `SALE_STATUSES` (bukan sekadar "bukan batal") supaya angkanya
  // sama dengan menu lain, bukan angka karangan.
  const panelKpis = useMemo(() => {
    const sold = orders.filter((order) => SALE_STATUSES.includes(order.status));
    return {
      total: orders.length,
      revenue: sold.reduce((sum, order) => sum + (order.total || 0), 0),
      unpaid: orders.filter((order) => orderStage(order) === "belum_bayar").length,
      toProcess: orders.filter((order) => orderStage(order) === "belum_dipacking" || orderStage(order) === "sudah_dipacking").length,
    };
  }, [orders]);

  // Tab = TAHAP resmi aplikasi (`ORDER_STAGE_TABS` order-flow — SAMA dengan halaman Pesanan admin):
  // Semua · Belum Bayar · Belum di Packing · Sudah di Packing · Dikirim · Selesai · Dibatalkan.
  const stageTabs = useMemo(
    () =>
      ORDER_STAGE_TABS.map((tab) => ({
        ...tab,
        count: tab.key === "semua" ? orders.length : orders.filter((order) => orderStage(order) === tab.key).length,
      })),
    [orders],
  );

  // Warna badge STATUS pesanan (bukan tahap packing) untuk tabel panel.
  const PANEL_STATUS_COLOR = { pending: "bayar", diproses: "siap", dikirim: "kirim", selesai: "selesai", dibatalkan: "batal" };

  // Modal/overlay dipakai bersama oleh tampilan ops & panel supaya tidak ada logika kembar.
  const overlays = (
    <>
      <TransaksiFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        initialData={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["transaksi"] })}
        variant={isPanel ? "panel" : "ops"}
      />

      <TransaksiDetailDrawer
        open={!!detail}
        order={detail}
        variant={isPanel ? "panel" : "ops"}
        onResiCreated={handleResiCreated}
        onClose={() => setDetail(null)}
        onEdit={(order) => {
          setDetail(null);
          setEditing(order);
          setFormOpen(true);
        }}
        onCancel={(order) => setCancelTarget(order)}
        onDelete={(order) => setDeleteTarget(order)}
      />

      <ConfirmDeleteModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMutation.mutate(cancelTarget)}
        title="Batalkan transaksi ini?"
        itemName={cancelTarget ? `${cancelTarget.order_number} · ${cancelTarget.customer_name}` : undefined}
        message={
          cancelTarget?.awb_no
            ? `Resi J&T ${cancelTarget.awb_no} akan dibatalkan (void) LEBIH DULU di J&T. Kalau paketnya sudah dijemput/diproses J&T, pembatalan akan ditolak dan stok tidak dikembalikan.`
            : "Stok produk dikembalikan kalau pesanannya belum dikirim."
        }
        confirmLabel="Batalkan"
        busyLabel="Membatalkan..."
        isDeleting={cancelMutation.isPending}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Hapus transaksi ini?"
        itemName={deleteTarget ? `${deleteTarget.order_number} · ${deleteTarget.customer_name}` : undefined}
        message={
          deleteTarget?.awb_no
            ? "Transaksi, produk, dan riwayat resinya dihapus permanen. Resinya sudah di-void saat pembatalan — kalau ragu, cek dulu di J&T. Tindakan ini tidak bisa dibatalkan."
            : "Transaksi dan produknya dihapus permanen, dan stok dikembalikan lebih dulu. Tindakan ini tidak bisa dibatalkan."
        }
        confirmLabel="Hapus"
        busyLabel="Menghapus..."
        isDeleting={deleteMutation.isPending}
      />
    </>
  );

  // ── Tampilan PANEL (ala mockup) ──
  if (isPanel) {
    return (
      <div>
        <section className="ks">
          <div className="card k">
            <small>Total transaksi</small>
            <b>{panelKpis.total}</b>
            <i>{coverageLabel}</i>
          </div>
          <div className="card k">
            <small>Omset bulan ini</small>
            <b>Rp {formatRupiah(panelKpis.revenue)}</b>
            <i>Tidak termasuk dibatalkan</i>
          </div>
          <div className="card k">
            <small>Belum bayar</small>
            <b style={{ color: "#c76f00" }}>{panelKpis.unpaid}</b>
            <i>Perlu follow-up</i>
          </div>
          <div className="card k">
            <small>Perlu diproses</small>
            <b style={{ color: "#2e64c9" }}>{panelKpis.toProcess}</b>
            <i>Packing + siap kirim</i>
          </div>
        </section>

        <div className="bar">
          <div className="tabs">
            {stageTabs.filter((tab) => tab.key !== "belum_dipacking" && tab.key !== "sudah_dipacking").map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tab${stageFilter === tab.key ? " on" : ""}`}
                onClick={() => setStageFilter(tab.key)}
              >
                <span className="ti">
                  <StageIcon stage={tab.key} />
                </span>
                <span className="tl2">{tab.label}</span>
                <em>{tab.count}</em>
              </button>
            ))}
          </div>

          <div className="f">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari nama / nomor HP / No. Order..."
              aria-label="Cari transaksi"
            />
            {/* Filter cepat khusus admin: antrean pesanan yang belum dipacking.
                Bukan tab — packing adalah sub-status dari pesanan `diproses`. */}
            <button
              type="button"
              className={`packf${stageFilter === "belum_dipacking" ? " on" : ""}`}
              onClick={() => setStageFilter((current) => (current === "belum_dipacking" ? "semua" : "belum_dipacking"))}
              aria-pressed={stageFilter === "belum_dipacking"}
              title="Tampilkan hanya pesanan yang belum dipacking"
            >
              Belum di packing
              <em>{stageTabs.find((tab) => tab.key === "belum_dipacking")?.count ?? 0}</em>
            </button>
            <div className="ptx-month">
              <button type="button" onClick={prevMonth} aria-label="Bulan sebelumnya">
                ‹
              </button>
              <b>
                {MONTHS[month]} {year}
              </b>
              <button type="button" onClick={nextMonth} aria-label="Bulan berikutnya">
                ›
              </button>
            </div>
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
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Filter sumber">
              <option value="all">Semua sumber</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {SOURCE_STYLES[source]?.label || source}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Tambah Transaksi
            </button>
          </div>
        </div>

        <div className="card tw">
          {isLoading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#8a7d83" }}>Memuat…</div>
          ) : visibleOrders.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#8a7d83" }}>
              <b style={{ color: "#2a1a22" }}>
                {filtersActive ? "Tidak ada transaksi yang cocok" : `Belum ada transaksi di ${MONTHS[month]} ${year}`}
              </b>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {filtersActive ? "Ubah pencarian atau filter, atau tampilkan semua." : 'Klik "Tambah Transaksi" untuk mencatat penjualan manual.'}
              </p>
            </div>
          ) : (
            <table>
              {/* Lebar kolom dipatok di sini (`table-layout: fixed`) supaya semua tab tampil sama. */}
              <colgroup>
                <col style={{ width: "17%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>No. Pesanan</th>
                  <th>Pelanggan</th>
                  <th>Produk</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th>No. Resi</th>
                  <th>Status</th>
                  <th className="chev" />
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const firstItem = order.items?.[0] || null;
                  const extraItems = Math.max(0, (order.items?.length || 0) - 1);
                  const variantText = itemVariantText(firstItem);
                  return (
                    <tr key={order.id} onClick={() => setDetail(order)}>
                      <td>
                        <span className="id">{order.order_number}</span>
                        <small>
                          {formatTanggalSingkatID(order.date_wib)} · {order.time_wib}
                        </small>
                      </td>
                      <td>
                        <b>{order.customer_name}</b>
                        <small>{order.customer_whatsapp || "-"}</small>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{firstItem ? firstItem.product_name : order.item_summary}</span>
                        <small>
                          {variantText ? `${variantText} × ${firstItem?.quantity}` : `× ${order.qty_total}`}
                          {extraItems > 0 ? ` · +${extraItems} lainnya` : ""}
                        </small>
                      </td>
                      <td className="mono" style={{ textAlign: "right" }}>
                        Rp {formatRupiah(order.total)}
                        <small style={{ textAlign: "right" }}>
                          {SOURCE_STYLES[order.source]?.label || order.source_label}
                        </small>
                      </td>
                      <td>
                        {order.awb_no ? (
                          <span
                            className={`resi-no${order.status === "dibatalkan" ? " resi-void" : ""}`}
                            title={
                              order.status === "dibatalkan"
                                ? `Resi ${order.awb_no} sudah di-void (pesanan dibatalkan)`
                                : `No. Resi J&T ${order.awb_no}`
                            }
                          >
                            {order.awb_no}
                          </span>
                        ) : (
                          <span className="resi-empty">–</span>
                        )}
                        {/* Penanda packing khusus pesanan lunas yang belum dikirim:
                            "Sudah di packing" = resi J&T sudah dibuat. */}
                        {order.status === "diproses" ? (
                          <small className={order.awb_no ? "pack-done" : "pack-todo"}>
                            {order.awb_no ? "Sudah di packing" : "Belum di packing"}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <span className={`bd s-${PANEL_STATUS_COLOR[order.status] || "batal"}`}>{order.status_label}</span>
                      </td>
                      <td className="chev" style={{ textAlign: "right" }}>
                        ›
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {overlays}
      </div>
    );
  }

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

      {/* Kartu statistik — memakai komponen kartu bersama dashboard ops
          (`@/components/ops/GlassCard`) supaya bentuknya sama persis. */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <GlassCard key={card.label} icon={card.icon} label={card.label} value={card.value} caption={card.caption} />
        ))}
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
              placeholder="Cari nama / nomor HP / No. Order / produk..."
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
                  <th className="w-[11%] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggal</th>
                  <th className="w-[20%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pelanggan</th>
                  <th className="w-[27%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produk</th>
                  <th className="w-[11%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Total</th>
                  <th className="w-[12%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="w-[19%] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order, index) => {
                  const status = STATUS_STYLES[order.status];
                  // Baris produk memakai item PERTAMA dari data yang sama dengan Detail Transaksi
                  // (`order.items` dari /api/ops/transaksi) — bukan ringkasan terpisah.
                  const firstItem = order.items?.[0] || null;
                  const extraItems = Math.max(0, (order.items?.length || 0) - 1);
                  const variantText = itemVariantText(firstItem);
                  const itemLine = firstItem
                    ? `${firstItem.product_name}${variantText ? ` · ${variantText}` : ""} × ${firstItem.quantity}`
                    : order.item_summary || "";
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                      onClick={() => setDetail(order)}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
                    >
                      <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap truncate" title={`${formatTanggalID(order.date_wib)} · ${order.time_wib || "-"} WIB`}>
                        {formatTanggalSingkatID(order.date_wib)}
                      </td>
                      <td className="px-2 py-3 font-semibold text-slate-900 dark:text-white truncate" title={`${order.customer_name} · ${order.customer_whatsapp}`}>
                        {order.customer_name}
                      </td>
                      <td className="px-2 py-3">
                        {/* Satu baris per transaksi: nama produk (tebal) · kain · series · ukuran × qty.
                            Dianggap "satu baris" walau isinya <span>, jadi tinggi baris tabel tidak berubah. */}
                        <div className="flex items-center gap-1.5 min-w-0" title={extraItems > 0 ? `${itemLine} +${extraItems} item lainnya` : itemLine}>
                          <p className="min-w-0 truncate">
                            <span className="font-bold text-slate-900 dark:text-white">{firstItem ? firstItem.product_name : order.item_summary}</span>
                            {variantText ? <span className="text-slate-500 dark:text-slate-400"> · {variantText}</span> : null}
                            {firstItem ? <span className="text-slate-500 dark:text-slate-400"> × {firstItem.quantity}</span> : null}
                          </p>
                          {extraItems > 0 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDetail(order);
                              }}
                              title={`Lihat ${extraItems} item lainnya di Detail Transaksi`}
                              className="shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              +{extraItems}
                            </button>
                          )}
                          {/* Penanda kecil kalau pesanan sudah punya resi J&T — tanpa kolom baru,
                              dan tingginya di bawah tinggi baris jadi tabel tetap setinggi sekarang. */}
                          {order.awb_no ? (
                            <span
                              title={`Resi J&T ${order.awb_no}`}
                              className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            >
                              <Truck size={11} /> Resi
                            </span>
                          ) : null}
                        </div>
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
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setDetail(order);
                            }}
                            title="Lihat Detail Transaksi"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye size={14} />
                            Detail
                          </button>
                          {order.can_cancel && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setCancelTarget(order);
                              }}
                              title="Batalkan transaksi — stok dikembalikan kalau belum dikirim"
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Batalkan
                            </button>
                          )}
                          {/* Hapus hanya untuk transaksi manual. Kalau resinya masih AKTIF
                              (status belum dibatalkan), tombolnya disembunyikan — admin
                              diarahkan "Batalkan" dulu supaya resinya ikut di-void di J&T. */}
                          {(!order.awb_no || order.status === "dibatalkan") && order.source !== "website" && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteTarget(order);
                              }}
                              title="Hapus transaksi (stok dikembalikan lebih dulu)"
                              aria-label="Hapus transaksi"
                              className="p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
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

      {overlays}
    </div>
  );
}
