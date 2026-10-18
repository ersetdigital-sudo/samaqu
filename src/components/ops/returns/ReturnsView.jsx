"use client";

/**
 * Menu Return — dipakai DUA dashboard:
 *   - /ops/retur       → variant="ops"   (aksen hitam/slate)
 *   - /panel-admin/retur → variant="panel" (aksen pink/rose)
 *
 * Dua tab: Tukar Size & Return. Logikanya satu; yang berbeda hanya warna aksen.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRightLeft,
  Check,
  Clipboard,
  Clock,
  Plus,
  RotateCcw,
  Search,
  Truck,
  X,
} from "lucide-react";
import { base44 } from "@/lib/ops-api";
import { formatRupiah, formatTanggalJamID, formatTanggalSingkatID } from "@/components/ops/transaksi/transaksi-format";

const TYPE_LABEL = { tukar_size: "Tukar Size", return: "Return" };

const STATUS = {
  diajukan: { label: "Diajukan", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900" },
  disetujui: { label: "Disetujui", badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900" },
  barang_diterima: { label: "Barang Diterima", badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900" },
  pengganti_dikirim: { label: "Pengganti Dikirim", badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-900" },
  selesai: { label: "Selesai", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900" },
  ditolak: { label: "Ditolak", badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  dibatalkan: { label: "Dibatalkan", badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900" },
};

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20";
const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1";

function SummaryCard({ icon: Icon, label, value, caption, soft }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1a1d28]">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${soft}`}>
          <Icon size={16} />
        </span>
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-black leading-none text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
  );
}

function Badge({ status }) {
  const meta = STATUS[status] || STATUS.diajukan;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

function itemSummary(items, type) {
  if (!items?.length) return "-";
  const first = items[0];
  const from = `${first.product_name} · ${first.size}`;
  const suffix = type === "tukar_size" && first.replacement_size ? ` → ${first.replacement_size}` : "";
  return `${from}${suffix}${items.length > 1 ? ` +${items.length - 1}` : ""}`;
}

export default function ReturnsView({ variant = "ops" }) {
  const isPanel = variant === "panel";
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("tukar_size");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const accent = isPanel
    ? "bg-[#c2255c] hover:bg-[#9d174d] text-white"
    : "bg-slate-900 hover:bg-slate-800 text-white";
  const accentSoft = isPanel
    ? "border-[#f3c7d6] text-[#c2255c] hover:bg-[#fdf3f7] dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-900/20"
    : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800";
  const tabActive = isPanel ? "bg-[#c2255c] text-white" : "bg-slate-900 text-white";

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["returns"],
    queryFn: () => base44.entities.Return.list({ limit: 500 }),
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["productVariants"],
    queryFn: () => base44.entities.ProductVariant.list(),
  });

  const counts = useMemo(
    () => ({
      tukar_size: returns.filter((row) => row.type === "tukar_size").length,
      return: returns.filter((row) => row.type === "return").length,
    }),
    [returns],
  );

  const summary = useMemo(() => {
    const openStatus = (row) => ["diajukan", "disetujui"].includes(row.status);
    return {
      tukar_size: returns.filter((row) => row.type === "tukar_size").length,
      tukar_open: returns.filter((row) => row.type === "tukar_size" && openStatus(row)).length,
      return: returns.filter((row) => row.type === "return").length,
      return_open: returns.filter((row) => row.type === "return" && openStatus(row)).length,
      action: returns.filter(openStatus).length,
      done: returns.filter((row) => row.status === "selesai").length,
    };
  }, [returns]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return returns
      .filter((row) => row.type === tab)
      .filter((row) => statusFilter === "all" || row.status === statusFilter)
      .filter((row) =>
        query
          ? [row.return_number, row.order_number, row.customer_name, row.customer_whatsapp]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(query))
          : true,
      );
  }, [returns, tab, statusFilter, q]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["returns"] });

  useEffect(() => {
    const locked = createOpen || Boolean(detail);
    if (!locked) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [createOpen, detail]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Return</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Tukar size & retur barang — stok masuk/keluar tercatat otomatis.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${accent}`}
        >
          <Plus size={16} /> Ajukan Retur
        </button>
      </div>

      {/* Kartu informasi: ringkasan retur tanpa harus membaca tabel. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={ArrowRightLeft}
          label="Tukar Size"
          value={summary.tukar_size}
          caption={`${summary.tukar_open} perlu diproses`}
          soft="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
        />
        <SummaryCard
          icon={RotateCcw}
          label="Return"
          value={summary.return}
          caption={`${summary.return_open} perlu diproses`}
          soft="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
        />
        <SummaryCard
          icon={Clock}
          label="Perlu Tindakan"
          value={summary.action}
          caption="Diajukan + disetujui"
          soft={
            isPanel
              ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }
        />
        <SummaryCard
          icon={Check}
          label="Selesai"
          value={summary.done}
          caption="Total retur selesai"
          soft="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
        />
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1a1d28]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {[
              { key: "tukar_size", label: "Tukar Size", icon: ArrowRightLeft },
              { key: "return", label: "Return", icon: RotateCcw },
            ].map((option) => {
              const Icon = option.icon;
              const active = tab === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTab(option.key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    active ? tabActive : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon size={15} />
                  {option.label}
                  <span className={`rounded-full px-1.5 text-[10px] font-black ${active ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`}>
                    {counts[option.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Cari no. retur / pesanan / pelanggan"
                className={`${inputClass} w-64 pl-9`}
                aria-label="Cari retur"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`${inputClass} w-40`}
              aria-label="Filter status"
            >
              <option value="all">Semua status</option>
              {Object.entries(STATUS).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-2.5">No. Retur</th>
                <th className="px-3 py-2.5">Pelanggan</th>
                <th className="px-3 py-2.5">Pesanan</th>
                <th className="px-3 py-2.5">Produk</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Resi</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm font-semibold text-slate-500">
                    Memuat retur…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Belum ada retur di tab ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setDetail(row)}
                    className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-3">
                      <span className={`block font-bold ${isPanel ? "text-[#c2255c]" : "text-slate-900 dark:text-white"}`}>
                        {row.return_number}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {formatTanggalSingkatID(row.created_at)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-bold text-slate-900 dark:text-white">{row.customer_name}</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{row.customer_whatsapp || "-"}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{row.order_number}</td>
                    <td className="px-3 py-3">
                      <span className="block font-semibold text-slate-800 dark:text-slate-100">{itemSummary(row.items, row.type)}</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {row.items?.reduce((sum, item) => sum + (Number(item.qty) || 0), 0) || 0} pcs
                      </span>
                    </td>
                    <td className="px-3 py-3"><Badge status={row.status} /></td>
                    <td className="px-3 py-3 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      {row.shipping_out_awb || row.shipping_in_awb || "-"}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400">›</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen ? (
        <CreateReturnDrawer
          type={tab}
          isPanel={isPanel}
          accent={accent}
          accentSoft={accentSoft}
          variants={variants}
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setCreateOpen(false);
            refresh();
            setDetail(created);
          }}
        />
      ) : null}

      {detail ? (
        <ReturnDetailDrawer
          record={detail}
          isPanel={isPanel}
          accent={accent}
          accentSoft={accentSoft}
          onClose={() => setDetail(null)}
          onChanged={(updated) => {
            setDetail(updated);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/* ───────────────────────── Create drawer ───────────────────────── */

function CreateReturnDrawer({ type, isPanel, accent, accentSoft, variants, onClose, onCreated }) {
  const isExchange = type === "tukar_size";
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingIn, setShippingIn] = useState("");
  const [shippingOut, setShippingOut] = useState("");
  const [shippingPaid, setShippingPaid] = useState("unpaid");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersBusy, setOrdersBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notFound, setNotFound] = useState("");
  const [manual, setManual] = useState(false);
  const [manualCustomer, setManualCustomer] = useState("");
  const [manualWhatsapp, setManualWhatsapp] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualKecamatan, setManualKecamatan] = useState("");
  const [manualPostal, setManualPostal] = useState("");
  const [manualItems, setManualItems] = useState([]);

  const stockMapOf = (productId, color) => {
    const entry = (variants || []).find(
      (variant) => variant.product_id === productId && (variant.color || "default") === (color || "default"),
    );
    return entry?.stock_efektif || entry?.stock || {};
  };

  const variantOptions = useMemo(
    () =>
      [...(variants || [])].sort((a, b) =>
        `${a.product_name || ""} ${a.color || ""}`.localeCompare(`${b.product_name || ""} ${b.color || ""}`),
      ),
    [variants],
  );

  const variantOf = (variantId) => (variants || []).find((variant) => variant.id === variantId) || null;

  const sizesOf = (variant) => Object.keys(variant?.stock_efektif || variant?.stock || {}).sort();

  const blankManualItem = () => ({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    variant_id: "",
    size: "",
    qty: 1,
    condition: "sellable",
    replacement_size: "",
  });

  const updateManualItem = (key, patch) => {
    setManualItems((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeManualItem = (key) => {
    setManualItems((items) => items.filter((item) => item.key !== key));
  };

  const addManualItem = () => {
    setManualItems((items) => [...items, blankManualItem()]);
  };

  useEffect(() => {
    let cancelled = false;
    setOrdersBusy(true);
    base44.entities.Transaction.recentOrders(60)
      .then((rows) => {
        if (!cancelled) setOrders(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = orders.filter((row) => row.status !== "dibatalkan");
    const matched = needle
      ? list.filter((row) =>
          [row.order_number, row.customer_name, row.customer_whatsapp]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle)),
        )
      : list;
    return matched.slice(0, 8);
  }, [orders, query]);

  const startManual = (orderNo = "") => {
    setManual(true);
    setOrder(null);
    setSelected({});
    setPickerOpen(false);
    setNotFound("");
    setError("");
    if (orderNo) setQuery(orderNo);
    setManualItems((items) => (items.length > 0 ? items : [blankManualItem()]));
  };

  const selectOrder = (found) => {
    setManual(false);
    setOrder(found);
    setQuery(found.order_number || "");
    setPickerOpen(false);
    setNotFound("");
    setError("");
    const next = {};
    for (const item of found.order_items || []) {
      next[item.id] = {
        checked: false,
        qty: Number(item.quantity) || 1,
        replacement_size: "",
        condition: "sellable",
      };
    }
    setSelected(next);
  };

  const loadOrder = async () => {
    const value = query.trim();
    if (!value) return;

    const local = orders.find(
      (row) => String(row.order_number || "").toLowerCase() === value.toLowerCase() && row.status !== "dibatalkan",
    );
    if (local) {
      selectOrder(local);
      return;
    }

    setOrderBusy(true);
    setError("");
    setNotFound("");
    try {
      const found = await base44.entities.Transaction.getOrder(value);
      if (found) {
        selectOrder(found);
      } else {
        setOrder(null);
        setPickerOpen(false);
        setNotFound(value);
      }
    } catch {
      setOrder(null);
      setPickerOpen(false);
      setNotFound(value);
    } finally {
      setOrderBusy(false);
    }
  };

  const updateItem = (id, patch) => {
    setSelected((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const selectedItems = (order?.order_items || []).filter((item) => selected[item.id]?.checked);

  const manualReady =
    manual &&
    Boolean(query.trim()) &&
    Boolean(manualCustomer.trim()) &&
    manualItems.length > 0 &&
    manualItems.every((item) => {
      const variant = variantOf(item.variant_id);
      if (!variant || !item.size) return false;
      if (!isExchange) return true;
      const stock = Number((variant.stock_efektif || {})[item.replacement_size]) || 0;
      return Boolean(item.replacement_size) && item.replacement_size !== item.size && stock >= Number(item.qty);
    });

  const canSubmit = manual
    ? manualReady
    : Boolean(order) &&
      selectedItems.length > 0 &&
      selectedItems.every((item) => {
        const value = selected[item.id];
        if (!value) return false;
        if (isExchange) {
          const stock = Number(stockMapOf(item.product_id, item.color)[value.replacement_size]) || 0;
          return Boolean(value.replacement_size) && stock >= Number(value.qty);
        }
        return true;
      });

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await base44.entities.Return.create(
        manual
          ? {
              type,
              manual: true,
              order_number: query.trim(),
              customer_name: manualCustomer.trim(),
              customer_whatsapp: manualWhatsapp.trim(),
              shipping_address: manualAddress.trim(),
              shipping_city: manualCity.trim(),
              shipping_kecamatan: manualKecamatan.trim(),
              shipping_postal_code: manualPostal.trim(),
              reason: reason.trim(),
              notes: notes.trim(),
              shipping_in_cost: Number(String(shippingIn).replace(/\D/g, "")) || 0,
              shipping_out_cost: Number(String(shippingOut).replace(/\D/g, "")) || 0,
              shipping_payment_status: shippingPaid,
              refund_amount: type === "return" ? Number(String(refundAmount).replace(/\D/g, "")) || 0 : 0,
              refund_method: type === "return" ? refundMethod.trim() : null,
              items: manualItems.map((item) => {
                const [productId, color] = String(item.variant_id).split("||");
                return {
                  product_id: productId,
                  color: color || "default",
                  size: item.size,
                  qty: Number(item.qty) || 1,
                  condition: item.condition === "damaged" ? "damaged" : "sellable",
                  replacement_size: isExchange ? item.replacement_size : null,
                };
              }),
            }
          : {
              type,
              order_number: order.order_number,
              reason: reason.trim(),
              notes: notes.trim(),
              shipping_in_cost: Number(String(shippingIn).replace(/\D/g, "")) || 0,
              shipping_out_cost: Number(String(shippingOut).replace(/\D/g, "")) || 0,
              shipping_payment_status: shippingPaid,
              refund_amount: type === "return" ? Number(String(refundAmount).replace(/\D/g, "")) || 0 : 0,
              refund_method: type === "return" ? refundMethod.trim() : null,
              items: selectedItems.map((item) => ({
                order_item_id: item.id,
                qty: Number(selected[item.id]?.qty) || 1,
                condition: selected[item.id]?.condition === "damaged" ? "damaged" : "sellable",
                replacement_size: isExchange ? selected[item.id]?.replacement_size : null,
              })),
            },
      );
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat retur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerShell
      title={`Ajukan ${TYPE_LABEL[type]}`}
      subtitle="Cari pesanan, pilih produk, lalu simpan."
      onClose={onClose}
      isPanel={isPanel}
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <label className={labelClass}>No. Pesanan</label>

          {manual ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  Pesanan manual
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setManual(false);
                    setOrder(null);
                    setQuery("");
                    setNotFound("");
                  }}
                  className={`text-[11px] font-bold ${isPanel ? "text-[#c2255c]" : "text-slate-700 underline dark:text-slate-200"}`}
                >
                  Cari pesanan
                </button>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="mis. INV-123 / pesanan marketplace"
                className={`${inputClass} mt-2`}
              />
              <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Boleh nomor dari marketplace/IG yang belum tercatat.
              </p>
            </>
          ) : order ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{order.order_number}</p>
                <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {order.customer_name} · {order.customer_whatsapp || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrder(null);
                  setSelected({});
                  setQuery("");
                  setPickerOpen(true);
                }}
                className={`shrink-0 text-[11px] font-bold ${isPanel ? "text-[#c2255c]" : "text-slate-700 underline dark:text-slate-200"}`}
              >
                Ganti
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPickerOpen(true);
                    setNotFound("");
                  }}
                  onFocus={() => setPickerOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      loadOrder();
                    }
                    if (event.key === "Escape") setPickerOpen(false);
                  }}
                  placeholder="Cari no. pesanan / nama / no. HP"
                  className={`${inputClass} pl-9`}
                />
                {orderBusy ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">Mencari…</span>
                ) : null}
              </div>

              {pickerOpen ? (
                <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {query.trim() ? "Hasil pencarian" : "Pesanan terbaru"}
                    </p>
                    <button type="button" onClick={() => setPickerOpen(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">
                      Tutup
                    </button>
                  </div>

                  {ordersBusy ? <p className="px-3 pb-2 text-xs font-semibold text-slate-500">Memuat pesanan…</p> : null}

                  {!ordersBusy && filteredOrders.length === 0 ? (
                    <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pesanan tidak ditemukan.</p>
                      <button type="button" onClick={() => startManual(query.trim())} className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-bold ${accent}`}>
                        + Input pesanan manual
                      </button>
                    </div>
                  ) : null}

                  {filteredOrders.map((row) => (
                    <button
                      key={row.order_number}
                      type="button"
                      onClick={() => selectOrder(row)}
                      className="flex w-full items-start justify-between gap-2 border-t border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{row.order_number}</span>
                        <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {row.customer_name} · {row.customer_whatsapp || "-"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-slate-400">{formatTanggalSingkatID(row.created_at)}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => startManual(query.trim())}
                    className={`flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-2.5 text-left text-xs font-bold dark:border-slate-800 ${
                      isPanel ? "text-[#c2255c]" : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <Plus size={13} /> Pesanan belum tercatat — input manual
                  </button>
                </div>
              ) : null}

              {notFound ? (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-900/20">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Pesanan <span className="font-mono">{notFound}</span> tidak ditemukan.
                  </p>
                  <button type="button" onClick={() => startManual(notFound)} className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">
                    Input manual
                  </button>
                </div>
              ) : null}
            </>
          )}

          {error ? <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400">{error}</p> : null}
        </section>

        {manual ? (
          <>
            <section className="space-y-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pelanggan (pesanan manual)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setManual(false);
                    setOrder(null);
                    setQuery("");
                    setNotFound("");
                  }}
                  className={`text-[11px] font-bold ${isPanel ? "text-[#c2255c]" : "text-slate-700 underline dark:text-slate-200"}`}
                >
                  Cari pesanan
                </button>
              </div>
              <input value={manualCustomer} onChange={(event) => setManualCustomer(event.target.value)} placeholder="Nama penerima *" className={inputClass} />
              <input value={manualWhatsapp} onChange={(event) => setManualWhatsapp(event.target.value)} placeholder="No. WhatsApp" className={inputClass} />
              <input value={manualAddress} onChange={(event) => setManualAddress(event.target.value)} placeholder="Alamat lengkap (opsional)" className={inputClass} />
              <div className="grid grid-cols-3 gap-2">
                <input value={manualCity} onChange={(event) => setManualCity(event.target.value)} placeholder="Kota" className={inputClass} />
                <input value={manualKecamatan} onChange={(event) => setManualKecamatan(event.target.value)} placeholder="Kecamatan" className={inputClass} />
                <input
                  value={manualPostal}
                  onChange={(event) => setManualPostal(event.target.value.replace(/\D/g, "").slice(0, 5))}
                  inputMode="numeric"
                  placeholder="Kode pos"
                  className={inputClass}
                />
              </div>
              {isExchange && (!manualAddress.trim() || !manualCity.trim() || !manualKecamatan.trim() || !manualPostal.trim()) ? (
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Alamat lengkap dianjurkan agar resi pengganti bisa dibuat nanti.
                </p>
              ) : null}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pilih produk</p>
                <button
                  type="button"
                  onClick={addManualItem}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold ${isPanel ? "text-[#c2255c]" : "text-slate-700 dark:text-slate-200"}`}
                >
                  <Plus size={13} /> Tambah produk
                </button>
              </div>
              {manualItems.map((item) => {
                const variant = variantOf(item.variant_id);
                const sizes = variant ? sizesOf(variant) : [];
                const stock = variant?.stock_efektif || variant?.stock || {};
                return (
                  <div key={item.key} className="space-y-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                    <div className="flex items-start gap-2">
                      <select
                        value={item.variant_id}
                        onChange={(event) => updateManualItem(item.key, { variant_id: event.target.value, size: "", replacement_size: "" })}
                        className={inputClass}
                      >
                        <option value="">Pilih produk / warna…</option>
                        {variantOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.product_name} · {option.color && option.color !== "default" ? option.color : "Default"}
                          </option>
                        ))}
                      </select>
                      {manualItems.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeManualItem(item.key)}
                          className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          aria-label="Hapus produk"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>

                    {variant ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelClass}>Ukuran asal</label>
                            <select
                              value={item.size}
                              onChange={(event) => updateManualItem(item.key, { size: event.target.value, replacement_size: "" })}
                              className={inputClass}
                            >
                              <option value="">Pilih ukuran…</option>
                              {sizes.map((size) => (
                                <option key={size} value={size}>
                                  {size} — stok {Number(stock[size]) || 0}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Qty</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.qty}
                              onChange={(event) =>
                                updateManualItem(item.key, {
                                  qty: Math.max(1, Math.min(999, Number(String(event.target.value).replace(/\D/g, "")) || 1)),
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Kondisi</label>
                            <select
                              value={item.condition}
                              onChange={(event) => updateManualItem(item.key, { condition: event.target.value })}
                              className={inputClass}
                            >
                              <option value="sellable">Layak jual</option>
                              <option value="damaged">Rusak / tidak layak</option>
                            </select>
                          </div>
                          {isExchange ? (
                            <div>
                              <label className={labelClass}>Ukuran pengganti</label>
                              <select
                                value={item.replacement_size}
                                onChange={(event) => updateManualItem(item.key, { replacement_size: event.target.value })}
                                className={inputClass}
                              >
                                <option value="">Pilih ukuran…</option>
                                {sizes
                                  .filter((size) => size !== item.size)
                                  .map((size) => (
                                    <option key={size} value={size} disabled={(Number(stock[size]) || 0) < Number(item.qty)}>
                                      {size} — sisa {Number(stock[size]) || 0}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          ) : null}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Harga katalog: Rp {formatRupiah(variant.price || 0)}
                        </p>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </>
        ) : order ? (
          <>
            <section className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pelanggan</p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{order.customer_name}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{order.customer_whatsapp || "-"}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {order.shipping_address}
                {order.shipping_city ? `, ${order.shipping_city}` : ""}
              </p>
            </section>

            <section className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pilih produk</p>
              {(order.order_items || []).map((item) => {
                const value = selected[item.id];
                if (!value) return null;
                const stock = stockMapOf(item.product_id, item.color);
                const sizes = Object.entries(stock)
                  .filter(([size]) => size.toUpperCase() !== String(item.size || "").toUpperCase())
                  .sort(([a], [b]) => String(a).localeCompare(String(b)));
                return (
                  <div key={item.id} className={`rounded-2xl border p-3.5 ${value.checked ? "border-slate-900 dark:border-white" : "border-slate-200 dark:border-slate-800"}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={value.checked}
                        onChange={(event) => updateItem(item.id, { checked: event.target.checked })}
                        className="mt-1 h-4 w-4 shrink-0 accent-slate-900 dark:accent-white"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.product_name}</p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {[item.kain, item.series, item.color && item.color !== "default" ? item.color : null, item.size]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                        Rp {formatRupiah(item.price)}
                      </span>
                    </div>

                    {value.checked ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelClass}>Qty (maks {item.quantity})</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={value.qty}
                            onChange={(event) => {
                              const qty = Math.max(1, Math.min(item.quantity, Number(String(event.target.value).replace(/\D/g, "")) || 1));
                              updateItem(item.id, { qty });
                            }}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Kondisi</label>
                          <select
                            value={value.condition}
                            onChange={(event) => updateItem(item.id, { condition: event.target.value })}
                            className={inputClass}
                          >
                            <option value="sellable">Layak jual</option>
                            <option value="damaged">Rusak / tidak layak</option>
                          </select>
                        </div>
                        {isExchange ? (
                          <div className="col-span-2">
                            <label className={labelClass}>Ukuran pengganti</label>
                            <select
                              value={value.replacement_size}
                              onChange={(event) => updateItem(item.id, { replacement_size: event.target.value })}
                              className={inputClass}
                            >
                              <option value="">Pilih ukuran…</option>
                              {sizes.map(([size, valueStock]) => (
                                <option key={size} value={size} disabled={Number(valueStock) < Number(value.qty)}>
                                  {size} — sisa {Number(valueStock) || 0}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Stok asal {item.size}: {Number(stock[item.size] || 0)}
                              {value.replacement_size
                                ? ` → ${value.replacement_size}: ${Number(stock[value.replacement_size] || 0)}`
                                : ""}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </>
        ) : null}

        {order || manual ? (
          <>
            <section className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Ongkir balik</label>
                  <input value={shippingIn} onChange={(event) => setShippingIn(event.target.value)} inputMode="numeric" placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Ongkir pengganti</label>
                  <input value={shippingOut} onChange={(event) => setShippingOut(event.target.value)} inputMode="numeric" placeholder="0" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Ongkir dibayar customer?</label>
                  <select value={shippingPaid} onChange={(event) => setShippingPaid(event.target.value)} className={inputClass}>
                    <option value="unpaid">Belum dibayar</option>
                    <option value="paid">Sudah dibayar</option>
                  </select>
                </div>
                {type === "return" ? (
                  <>
                    <div>
                      <label className={labelClass}>Refund</label>
                      <input value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} inputMode="numeric" placeholder="0" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Metode refund</label>
                      <input value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)} placeholder="Transfer / Mayar" className={inputClass} />
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <section className="space-y-2">
              <div>
                <label className={labelClass}>Alasan</label>
                <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="mis. ukuran kekecilan" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Catatan</label>
                <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} />
              </div>
            </section>

            <div className={`rounded-2xl border p-3.5 ${isPanel ? "border-[#f3c7d6] bg-[#fdf3f7]" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"}`}>
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <AlertCircle size={14} /> Stok baru berubah setelah barang lama diterima.
              </p>
              {isExchange && selectedItems.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {selectedItems.map((item) => {
                    const value = selected[item.id];
                    const stock = stockMapOf(item.product_id, item.color);
                    if (!value?.replacement_size) return null;
                    return (
                      <p key={item.id} className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {item.size} +{value.qty} (jadi {Number(stock[item.size] || 0) + Number(value.qty)}) ·{" "}
                        {value.replacement_size} −{value.qty} (jadi {Number(stock[value.replacement_size] || 0) - Number(value.qty)})
                      </p>
                    );
                  })}
                </div>
              ) : null}
              {isExchange && manual ? (
                <div className="mt-2 space-y-1">
                  {manualItems.map((item) => {
                    const variant = variantOf(item.variant_id);
                    if (!variant || !item.size || !item.replacement_size) return null;
                    const stock = variant.stock_efektif || variant.stock || {};
                    return (
                      <p key={item.key} className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {item.size} +{item.qty} (jadi {Number(stock[item.size] || 0) + Number(item.qty)}) ·{" "}
                        {item.replacement_size} −{item.qty} (jadi {Number(stock[item.replacement_size] || 0) - Number(item.qty)})
                      </p>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-auto flex items-center gap-2 border-t border-slate-200 bg-white px-5 pb-1 pt-4 dark:border-slate-800 dark:bg-[#1a1d28]">
        <button type="button" onClick={onClose} className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          Batal
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || saving}
          className={`ml-auto rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${accent}`}
        >
          {saving ? "Menyimpan…" : "Ajukan Retur"}
        </button>
      </div>
    </DrawerShell>
  );
}

/* ───────────────────────── Detail drawer ───────────────────────── */

function ReturnDetailDrawer({ record, isPanel, accent, accentSoft, onClose, onChanged }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [editing, setEditing] = useState(false);
  const [shippingIn, setShippingIn] = useState(String(record.shipping_in_cost || ""));
  const [shippingOut, setShippingOut] = useState(String(record.shipping_out_cost || ""));
  const [shippingPaid, setShippingPaid] = useState(record.shipping_payment_status || "unpaid");
  const [inAwb, setInAwb] = useState(record.shipping_in_awb || "");
  const [refundAmount, setRefundAmount] = useState(String(record.refund_amount || ""));
  const [refundMethod, setRefundMethod] = useState(record.refund_method || "");
  const [refundStatus, setRefundStatus] = useState(record.refund_status || "");
  const [addr, setAddr] = useState(record.shipping_address || "");
  const [city, setCity] = useState(record.shipping_city || "");
  const [kec, setKec] = useState(record.shipping_kecamatan || "");
  const [postal, setPostal] = useState(record.shipping_postal_code || "");

  const isExchange = record.type === "tukar_size";
  const final = ["selesai", "ditolak", "dibatalkan"].includes(record.status);

  const run = async (action, label) => {
    setBusy(action);
    setError("");
    try {
      const updated = await base44.entities.Return.update(record.return_number, action);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Gagal ${label}`);
    } finally {
      setBusy("");
    }
  };

  const saveSettings = async () => {
    setBusy("update");
    setError("");
    try {
      const updated = await base44.entities.Return.update(record.return_number, "update", {
        shipping_in_cost: Number(String(shippingIn).replace(/\D/g, "")) || 0,
        shipping_out_cost: Number(String(shippingOut).replace(/\D/g, "")) || 0,
        shipping_payment_status: shippingPaid,
        shipping_in_awb: inAwb,
        refund_amount: Number(String(refundAmount).replace(/\D/g, "")) || 0,
        refund_method: refundMethod,
        refund_status: refundStatus,
        ...(!record.order_id
          ? {
              shipping_address: addr,
              shipping_city: city,
              shipping_kecamatan: kec,
              shipping_postal_code: postal,
            }
          : {}),
      });
      onChanged(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy("");
    }
  };

  const createResi = async () => {
    setBusy("resi");
    setError("");
    try {
      const result = await base44.entities.Return.createResi(record.return_number);
      onChanged(result.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat resi");
    } finally {
      setBusy("");
    }
  };

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(""), 1400);
    } catch {
      /* abaikan */
    }
  };

  return (
    <DrawerShell
      title={`Retur ${record.return_number}`}
      subtitle={`${TYPE_LABEL[record.type]} · ${formatTanggalJamID(record.created_at)}`}
      onClose={onClose}
      isPanel={isPanel}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={record.status} />
          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{record.order_number}</span>
          {!record.order_id ? (
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Manual
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="flex items-start gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle size={14} className="mt-px shrink-0" /> {error}
          </p>
        ) : null}

        <section className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pelanggan</p>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{record.customer_name}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{record.customer_whatsapp || "-"}</p>
          {record.shipping_address ? (
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {record.shipping_address}
              {record.shipping_city ? `, ${record.shipping_city}` : ""}
              {record.shipping_kecamatan ? `, ${record.shipping_kecamatan}` : ""}
              {record.shipping_postal_code ? ` ${record.shipping_postal_code}` : ""}
            </p>
          ) : null}
          {record.reason ? <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Alasan: {record.reason}</p> : null}
          {record.notes ? <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{record.notes}</p> : null}
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produk</p>
          {(record.items || []).map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 px-3.5 py-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{item.product_name}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {[item.color && item.color !== "default" ? item.color : null, item.size, item.condition === "damaged" ? "rusak" : "layak jual"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">×{item.qty}</p>
                  {isExchange && item.replacement_size ? (
                    <p className={`text-[11px] font-bold ${isPanel ? "text-[#c2255c]" : "text-slate-700 dark:text-slate-200"}`}>
                      → {item.replacement_size}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pengiriman & Refund</p>
            {!final ? (
              <button type="button" onClick={() => setEditing((v) => !v)} className={`text-[11px] font-bold ${isPanel ? "text-[#c2255c]" : "text-slate-700 underline dark:text-slate-200"}`}>
                {editing ? "Tutup" : "Ubah"}
              </button>
            ) : null}
          </div>

          {editing ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Ongkir balik</label>
                <input value={shippingIn} onChange={(event) => setShippingIn(event.target.value)} inputMode="numeric" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ongkir pengganti</label>
                <input value={shippingOut} onChange={(event) => setShippingOut(event.target.value)} inputMode="numeric" className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Status bayar ongkir</label>
                <select value={shippingPaid} onChange={(event) => setShippingPaid(event.target.value)} className={inputClass}>
                  <option value="unpaid">Belum dibayar</option>
                  <option value="paid">Sudah dibayar</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>AWB barang balik (dari customer)</label>
                <input value={inAwb} onChange={(event) => setInAwb(event.target.value)} className={inputClass} />
              </div>
              {!record.order_id ? (
                <>
                  <div className="col-span-2">
                    <label className={labelClass}>Alamat pengganti</label>
                    <input value={addr} onChange={(event) => setAddr(event.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Kota</label>
                    <input value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Kecamatan</label>
                    <input value={kec} onChange={(event) => setKec(event.target.value)} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Kode pos</label>
                    <input value={postal} onChange={(event) => setPostal(event.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" className={inputClass} />
                  </div>
                </>
              ) : null}
              {record.type === "return" ? (
                <>
                  <div>
                    <label className={labelClass}>Refund</label>
                    <input value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} inputMode="numeric" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Metode</label>
                    <input value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Status refund</label>
                    <input value={refundStatus} onChange={(event) => setRefundStatus(event.target.value)} placeholder="mis. diproses / selesai" className={inputClass} />
                  </div>
                </>
              ) : null}
              <button
                type="button"
                onClick={saveSettings}
                disabled={busy === "update"}
                className={`col-span-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${accent}`}
              >
                {busy === "update" ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-1.5 text-sm">
              <Row label="Ongkir balik" value={`Rp ${formatRupiah(record.shipping_in_cost || 0)}`} />
              <Row label="Ongkir pengganti" value={`Rp ${formatRupiah(record.shipping_out_cost || 0)}`} />
              <Row label="Ongkir dibayar" value={record.shipping_payment_status === "paid" ? "Sudah" : "Belum"} />
              <Row label="AWB balik" value={record.shipping_in_awb || "-"} />
              {isExchange ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">AWB pengganti</span>
                  <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {record.shipping_out_awb || "-"}
                    {record.shipping_out_awb ? (
                      <button type="button" onClick={() => copy(record.shipping_out_awb, "out")} className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Salin resi">
                        {copied === "out" ? <Check size={12} /> : <Clipboard size={12} />}
                      </button>
                    ) : null}
                  </span>
                </div>
              ) : null}
              {record.type === "return" ? (
                <>
                  <Row label="Refund" value={`Rp ${formatRupiah(record.refund_amount || 0)}`} />
                  <Row label="Metode refund" value={record.refund_method || "-"} />
                  <Row label="Status refund" value={record.refund_status || "-"} />
                </>
              ) : null}
              {!record.order_id && isExchange && !record.shipping_address ? (
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Isi alamat lewat tombol Ubah agar resi pengganti bisa dibuat.
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Riwayat</p>
          <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <p>Diajukan: {formatTanggalJamID(record.created_at)}</p>
            {record.approved_at ? <p>Disetujui: {formatTanggalJamID(record.approved_at)}</p> : null}
            {record.received_at ? <p>Barang diterima: {formatTanggalJamID(record.received_at)}</p> : null}
            {record.completed_at ? <p>Selesai: {formatTanggalJamID(record.completed_at)}</p> : null}
            {record.cancelled_at ? <p>Dibatalkan: {formatTanggalJamID(record.cancelled_at)}</p> : null}
            <p>Pergerakan stok: {record.stock_applied_at ? "sudah diterapkan" : "belum"}</p>
          </div>
        </section>

        {!final ? (
          <div className="space-y-2">
            {record.status === "diajukan" ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => run("reject", "menolak")} disabled={Boolean(busy)} className="rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20">
                  Tolak
                </button>
                <button type="button" onClick={() => run("approve", "menyetujui")} disabled={Boolean(busy)} className={`ml-auto rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${accent}`}>
                  {busy === "approve" ? "Menyetujui…" : "Setujui"}
                </button>
              </div>
            ) : null}

            {record.status === "disetujui" ? (
              <button type="button" onClick={() => run("receive", "menerima barang")} disabled={Boolean(busy)} className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${accent}`}>
                {busy === "receive" ? "Memproses stok…" : "Barang Diterima & Terapkan Stok"}
              </button>
            ) : null}

            {record.status === "barang_diterima" && isExchange && !record.shipping_out_awb ? (
              <button type="button" onClick={createResi} disabled={Boolean(busy)} className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${accent}`}>
                <Truck size={15} className="mr-1.5 inline" /> {busy === "resi" ? "Membuat resi…" : "Buat Resi Pengganti"}
              </button>
            ) : null}

            {["barang_diterima", "pengganti_dikirim"].includes(record.status) ? (
              <button type="button" onClick={() => run("complete", "menyelesaikan")} disabled={Boolean(busy) || (isExchange && !record.shipping_out_awb)} className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${accent}`}>
                {busy === "complete" ? "Menyelesaikan…" : "Selesaikan"}
              </button>
            ) : null}

            <button type="button" onClick={() => run("cancel", "membatalkan")} disabled={Boolean(busy)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              {busy === "cancel" ? "Membatalkan…" : "Batalkan Retur"}
            </button>
          </div>
        ) : null}
      </div>
    </DrawerShell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function DrawerShell({ title, subtitle, onClose, isPanel, children }) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative flex h-full w-full flex-col bg-white shadow-2xl dark:bg-[#1a1d28] sm:max-w-[560px]">
        <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}
