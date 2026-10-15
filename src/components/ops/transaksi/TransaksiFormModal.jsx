"use client";

/**
 * Form transaksi manual (Tambah / Ubah) — drawer dari sisi kanan.
 *
 * Bentuknya sengaja seperti panel samping: header & footer menempel (footer tidak ikut
 * ter-scroll), hanya isi tengahnya yang bisa di-scroll, dan latar digelapkan tipis.
 * Kalau sudah ada isian lalu drawer ditutup, muncul konfirmasi singkat supaya isian
 * tidak hilang karena salah klik.
 *
 * Pemilihan produk bertahap mengikuti urutan Laporan Stok di ops
 * (Kategori → Jenis Kain → Warna → Series → Ukuran → Qty). Urutan & "warna dari nama produk"
 * diambil dari `src/lib/ops-order.ts` — aturan yang sama dengan Daftar Produk & Laporan Stok —
 * jadi tidak ada daftar kedua yang bisa berbeda.
 *
 * Catatan: harga & stok di sini hanya untuk tampilan/peringatan. Saat Simpan, server tetap
 * membaca ulang harga dari database dan memotong stok lewat RPC yang sama dengan checkout.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { base44 } from "@/lib/ops-api";
import { MANUAL_SOURCE_KEYS, SOURCE_LABEL } from "@/lib/transaksi";
import { OPS_STOCK_SIZES } from "@/lib/ops-stock";
import { categoryRank, seriesRank, variantSortKey } from "@/lib/ops-order";
import { formatRupiah, isoToWibInput, wibNow, wibToIso } from "@/components/ops/transaksi/transaksi-format";
import { useToast } from "@/components/ops/ui/use-toast";

const inputClass =
  "w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5";
const sectionClass = "text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500";
const cmpId = (a, b) => String(a).localeCompare(String(b), "id", { sensitivity: "base" });

const digits = (value) => String(value ?? "").replace(/\D/g, "");

/** Satu baris item yang masih kosong (semua langkah belum dipilih). */
const emptyRow = () => ({
  category: "",
  kain: "",
  warna: "",
  series: null,
  variant: "",
  quantity: 1,
  editing: true,
});

const sizeRank = (size) => {
  const index = OPS_STOCK_SIZES.indexOf(String(size || "").toUpperCase());
  return index === -1 ? OPS_STOCK_SIZES.length : index;
};

export default function TransaksiFormModal({ isOpen, onClose, initialData = null, onSaved }) {
  const isEdit = !!initialData;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(null);
  const [items, setItems] = useState([emptyRow()]);
  const [saveError, setSaveError] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const prefilledFor = useRef(null);

  const { data: variants = [] } = useQuery({
    queryKey: ["transaksi", "variants"],
    queryFn: () => base44.entities.ProductVariant.list(),
    enabled: isOpen,
    staleTime: 30_000,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["transaksi", "customers"],
    queryFn: () => base44.entities.Customer.list(),
    enabled: isOpen,
    staleTime: 60_000,
  });

  /**
   * Satu baris data per (produk + warna). Urutan & "warna" memakai aturan bersama
   * `variantSortKey` — sama dengan Daftar Produk & Laporan Stok (varian Thobe menyimpan
   * warna `default`, jadi warnanya diambil dari nama produk).
   */
  const dataset = useMemo(
    () =>
      (variants || []).map((variant) => ({
        product_id: variant.product_id,
        product_name: variant.product_name,
        category: variant.category || "",
        kain: variant.jenis_kain_name || "",
        warna: variantSortKey(variant).warna,
        series: variant.series_name || "",
        color: String(variant.color || "").trim() || "default",
        price: Number(variant.price) || 0,
        sizes: variant.stock_efektif || variant.stock || {},
        linkedTo: variant.base_series_name || variant.base_product_name || null,
      })),
    [variants],
  );

  /* ── Nilai awal: transaksi baru (waktu sekarang) atau yang sedang diubah ── */
  useEffect(() => {
    if (!isOpen) {
      prefilledFor.current = null;
      setConfirmClose(false);
      return;
    }
    setSaveError("");
    setTouched(false);
    if (initialData) {
      const parts = isoToWibInput(initialData.created_at);
      setForm({
        customer_mode: initialData.customer_id ? "existing" : "new",
        customer_id: initialData.customer_id || "",
        customer_name: initialData.customer_name || "",
        customer_whatsapp: initialData.customer_whatsapp || "",
        source: initialData.source || "whatsapp",
        date: parts.date,
        time: parts.time,
        shipping_cost: String(initialData.shipping_cost || ""),
        discount: String(initialData.discount || ""),
        notes: initialData.notes || "",
      });
    } else {
      const now = wibNow();
      setForm({
        customer_mode: "existing",
        customer_id: "",
        customer_name: "",
        customer_whatsapp: "",
        source: "whatsapp",
        date: now.date,
        time: now.time,
        shipping_cost: "",
        discount: "",
        notes: "",
      });
      setItems([emptyRow()]);
      prefilledFor.current = null;
    }
  }, [isOpen, initialData]);

  /* ── Baris item diubah → telusuri balik jadi langkah bertahapnya ── */
  useEffect(() => {
    if (!isOpen || dataset.length === 0) return;
    const marker = initialData?.order_number || "__new__";
    if (prefilledFor.current === marker) return;
    prefilledFor.current = marker;
    if (!initialData) return;

    const rows = (initialData.items || []).map((item) => {
      const groups = dataset.filter((entry) => entry.product_id === item.product_id);
      const group = groups.find((entry) => entry.color === (item.color || "default")) || groups[0];
      if (!group) {
        return { ...emptyRow(), variant: `${item.color || "default"}||${String(item.size).toUpperCase()}`, quantity: item.quantity };
      }
      return {
        category: group.category,
        kain: group.kain,
        warna: group.warna,
        series: group.series || "",
        variant: `${group.color}||${String(item.size).toUpperCase()}`,
        quantity: item.quantity,
        editing: false,
      };
    });
    setItems(rows.length > 0 ? rows : [emptyRow()]);
  }, [isOpen, initialData, dataset]);

  /* ── Opsi bertahap: tiap langkah hanya berisi opsi yang valid dari langkah sebelumnya ── */
  const categoryOptions = useMemo(
    () => [...new Set(dataset.map((row) => row.category))].sort((a, b) => categoryRank(a) - categoryRank(b)),
    [dataset],
  );

  const rowsFor = (category, kain, warna) =>
    dataset.filter((row) => row.category === category && row.kain === kain && row.warna === warna);

  const kainOptions = (category) =>
    [...new Set(dataset.filter((row) => row.category === category).map((row) => row.kain))].sort(cmpId);

  const warnaOptions = (category, kain) =>
    [...new Set(dataset.filter((row) => row.category === category && row.kain === kain).map((row) => row.warna))].sort(cmpId);

  /** Series hanya jadi langkah kalau produk di kombinasi itu memang punya series. */
  const seriesStep = (category, kain, warna) => {
    if (!category || !kain || !warna) return { show: false, options: [] };
    const rows = rowsFor(category, kain, warna);
    const options = [...new Set(rows.map((row) => row.series))].sort((a, b) => seriesRank(a) - seriesRank(b));
    return { show: options.some(Boolean), options };
  };

  /** Produk yang cocok dengan seluruh langkah yang sudah dipilih. */
  const resolveProduct = (row) => {
    if (!row.category || !row.kain || !row.warna) return null;
    const step = seriesStep(row.category, row.kain, row.warna);
    if (step.show && row.series === null) return null;
    const series = step.show ? row.series : "";
    const rows = rowsFor(row.category, row.kain, row.warna).filter((entry) => (entry.series || "") === series);
    return rows.length === 1 ? rows[0] : rows[0] || null;
  };

  /** Pilihan ukuran + stok tersedia; turunan memakai stok induknya (bawaan /api/ops). */
  const sizeOptions = (product) => {
    if (!product) return [];
    const groups = dataset.filter((entry) => entry.product_id === product.product_id);
    const multiColor = new Set(groups.map((entry) => entry.color)).size > 1;
    return groups
      .flatMap((entry) =>
        Object.keys(entry.sizes || {}).map((size) => ({
          value: `${entry.color}||${size}`,
          size,
          color: entry.color,
          showColor: multiColor,
          stock: Number(entry.sizes?.[size]) || 0,
          price: entry.price,
          linkedTo: entry.linkedTo,
        })),
      )
      .sort((a, b) => sizeRank(a.size) - sizeRank(b.size) || cmpId(a.color, b.color));
  };

  const rowComplete = (row) => Boolean(resolveProduct(row) && row.variant && Number(row.quantity) >= 1);

  /** Total permintaan per varian; baris kembar ikut dihitung supaya peringatan jujur. */
  const requested = useMemo(() => {
    const map = {};
    for (const row of items) {
      const product = resolveProduct(row);
      if (!product || !row.variant) continue;
      const option = sizeOptions(product).find((entry) => entry.value === row.variant);
      if (!option) continue;
      const key = `${product.product_id}||${row.variant}`;
      const entry = map[key] || { option, total: 0 };
      entry.total += Number(row.quantity) || 0;
      map[key] = entry;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, dataset]);

  const rowInfo = items.map((row) => {
    const product = resolveProduct(row);
    const options = sizeOptions(product);
    const chosen = options.find((entry) => entry.value === row.variant) || null;
    const quantity = Number(row.quantity) || 0;
    let issue = null;
    if (!product) issue = "Pilih produk dulu (kategori → jenis kain → warna → series)";
    else if (!row.variant) issue = "Ukuran belum dipilih";
    else if (quantity < 1) issue = "Jumlah minimal 1";
    else {
      const entry = requested[`${product.product_id}||${row.variant}`];
      if (entry && entry.total > entry.option.stock) {
        issue = `Stok ${entry.option.size} tinggal ${entry.option.stock}, diminta ${entry.total}`;
      }
    }
    return { product, options, chosen, quantity, issue, subtotal: (chosen?.price || 0) * quantity };
  });

  const stockIssues = rowInfo.filter((info) => info.issue && info.product && info.chosen).map((info) => info.issue);
  const incomplete = rowInfo.some((info) => info.issue);

  const subtotal = rowInfo.reduce((sum, info) => sum + info.subtotal, 0);
  const discountValue = Number(digits(form?.discount)) || 0;
  const shippingValue = Number(digits(form?.shipping_cost)) || 0;
  const total = Math.max(0, subtotal - Math.min(discountValue, subtotal)) + shippingValue;

  const customerOptions = useMemo(
    () => [...customers].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id-ID")),
    [customers],
  );

  /* ── Aksi ── */
  const updateForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setTouched(true);
  };

  const updateRow = (index, patch, { collapse = false } = {}) => {
    setTouched(true);
    setItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch, ...(collapse ? { editing: false } : {}) } : row)),
    );
  };

  const removeRow = (index) => {
    setTouched(true);
    setItems((rows) => rows.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.Transaction.updateManual({ order_number: initialData.order_number, ...data })
        : base44.entities.Transaction.createManual(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["transaksi"] });
      toast({
        title: isEdit ? "✅ Transaksi diperbarui" : "✅ Transaksi tercatat",
        description: `No. Order ${result?.order_number ?? ""}`,
        variant: "success",
      });
      onSaved?.();
      setTouched(false);
      onClose();
    },
    onError: (error) =>
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan transaksi. Coba lagi."),
  });

  const save = () => {
    if (!form) return;
    setSaveError("");
    if (incomplete) {
      setSaveError("Lengkapi dulu produknya (dan periksa baris yang stoknya tidak cukup).");
      return;
    }
    if (!form.customer_name.trim()) return setSaveError("Nama pelanggan wajib diisi.");
    if (!form.customer_whatsapp.trim()) return setSaveError("Nomor HP pelanggan wajib diisi.");
    const createdAt = wibToIso(form.date, form.time);
    if (!createdAt) return setSaveError("Tanggal/jam transaksi tidak valid.");

    mutation.mutate({
      customer_id: form.customer_mode === "existing" ? form.customer_id || null : null,
      customer_name: form.customer_name.trim(),
      customer_whatsapp: form.customer_whatsapp.trim(),
      source: form.source,
      created_at: createdAt,
      shipping_cost: shippingValue,
      discount: Math.min(discountValue, subtotal),
      notes: form.notes.trim(),
      items: items.map((row) => {
        const product = resolveProduct(row);
        const [color, size] = String(row.variant).split("||");
        return {
          product_id: product?.product_id || "",
          color: color || "default",
          size,
          quantity: Number(row.quantity) || 0,
        };
      }),
    });
  };

  const requestClose = () => {
    if (mutation.isPending) return;
    if (touched) setConfirmClose(true);
    else onClose();
  };

  // Escape = tombol X (ikut minta konfirmasi kalau ada isian).
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (confirmClose) setConfirmClose(false);
      else requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, confirmClose, touched, mutation.isPending]);

  return (
    <AnimatePresence>
      {isOpen && form && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={requestClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.24, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-[9999] w-full sm:w-[600px] bg-white dark:bg-[#1a1d28] shadow-2xl flex flex-col"
            role="dialog"
            aria-label={isEdit ? "Ubah transaksi" : "Tambah transaksi"}
          >
            {/* Header menempel */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                  {isEdit ? "Ubah Transaksi" : "Tambah Transaksi"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isEdit ? `No. Order ${initialData?.order_number}` : "Transaksi manual langsung berstatus Lunas"}
                </p>
              </div>
              <button
                onClick={requestClose}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Tutup"
              >
                <X size={18} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Hanya bagian ini yang bisa di-scroll */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
              className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-6"
            >
              {/* Pelanggan */}
              <section className="space-y-2">
                <h4 className={sectionClass}>Pelanggan</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateForm({ customer_mode: "existing", customer_id: "", customer_name: "", customer_whatsapp: "" })}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
                      form.customer_mode === "existing"
                        ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Pelanggan terdaftar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm({ customer_mode: "new", customer_id: "" })}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
                      form.customer_mode === "new"
                        ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Pelanggan baru
                  </button>
                </div>

                {form.customer_mode === "existing" ? (
                  <select
                    value={form.customer_id}
                    onChange={(event) => {
                      const picked = customerOptions.find((entry) => (entry.id || entry.key) === event.target.value);
                      updateForm({
                        customer_id: picked?.id || "",
                        customer_name: picked?.name || "",
                        customer_whatsapp: picked?.whatsapp || "",
                      });
                    }}
                    className={inputClass}
                  >
                    <option value="">— Pilih pelanggan —</option>
                    {customerOptions.map((customer) => (
                      <option key={customer.id || customer.key} value={customer.id || customer.key}>
                        {customer.name}
                        {customer.whatsapp ? ` · ${customer.whatsapp}` : ""}
                        {customer.registered ? "" : " (belum daftar)"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={(event) => updateForm({ customer_name: event.target.value })}
                      placeholder="Nama pelanggan"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={form.customer_whatsapp}
                      onChange={(event) => updateForm({ customer_whatsapp: event.target.value })}
                      placeholder="Nomor HP (08…)"
                      className={inputClass}
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {form.customer_mode === "existing"
                    ? form.customer_name
                      ? `Terpilih: ${form.customer_name} · ${form.customer_whatsapp || "nomor belum ada"}`
                      : "Pilih salah satu pelanggan, atau ganti ke Pelanggan baru."
                    : "Pelanggan baru otomatis muncul di menu Pelanggan."}
                </p>
              </section>

              {/* Sumber & waktu */}
              <section className="space-y-2">
                <h4 className={sectionClass}>Sumber &amp; Waktu</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>
                      Sumber <span className="text-red-500">*</span>
                    </label>
                    <select value={form.source} onChange={(event) => updateForm({ source: event.target.value })} className={inputClass}>
                      {MANUAL_SOURCE_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {SOURCE_LABEL[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Tanggal <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Jam (WIB)</label>
                    <input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} className={inputClass} />
                  </div>
                </div>
              </section>

              {/* Produk bertahap */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={sectionClass}>Produk</h4>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    Kategori → Jenis Kain → Warna → Series → Ukuran → Qty
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((row, index) => {
                    const info = rowInfo[index];
                    const step = seriesStep(row.category, row.kain, row.warna);

                    if (!row.editing && rowComplete(row) && info.chosen) {
                      const product = info.product;
                      const summary = [row.category, row.warna, step.show ? row.series : "", info.chosen.size, `x${info.quantity}`]
                        .filter(Boolean)
                        .join(" | ");
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={summary}>
                              {summary}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Rp {formatRupiah(info.subtotal)}
                              {product?.kain ? ` · kain ${product.kain}` : ""}
                              {` · stok ${info.chosen.stock}`}
                              {info.chosen.linkedTo ? ` · stok mengikuti ${info.chosen.linkedTo}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateRow(index, { editing: true })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                              <Pencil size={13} /> Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                              aria-label="Hapus produk"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        className={`rounded-xl border-2 p-3 ${info.issue ? "border-slate-200 dark:border-slate-700" : "border-slate-200 dark:border-slate-700"}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Produk {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            disabled={items.length === 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label="Hapus produk"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <label className={labelClass}>Kategori</label>
                            <select
                              value={row.category}
                              onChange={(event) =>
                                updateRow(index, { category: event.target.value, kain: "", warna: "", series: null, variant: "" })
                              }
                              className={inputClass}
                            >
                              <option value="">— Pilih —</option>
                              {categoryOptions.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Jenis Kain</label>
                            <select
                              value={row.kain}
                              disabled={!row.category}
                              onChange={(event) => updateRow(index, { kain: event.target.value, warna: "", series: null, variant: "" })}
                              className={inputClass}
                            >
                              <option value="">— Pilih —</option>
                              {kainOptions(row.category).map((kain) => (
                                <option key={kain} value={kain}>
                                  {kain}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Warna</label>
                            <select
                              value={row.warna}
                              disabled={!row.kain}
                              onChange={(event) => updateRow(index, { warna: event.target.value, series: null, variant: "" })}
                              className={inputClass}
                            >
                              <option value="">— Pilih —</option>
                              {warnaOptions(row.category, row.kain).map((warna) => (
                                <option key={warna} value={warna}>
                                  {warna}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Produk tanpa series (mis. Kandora Superblack) langsung lewati langkah ini */}
                          {step.show && (
                            <div>
                              <label className={labelClass}>Series</label>
                              <select
                                value={row.series ?? ""}
                                disabled={!row.warna}
                                onChange={(event) => updateRow(index, { series: event.target.value, variant: "" })}
                                className={inputClass}
                              >
                                <option value="">— Pilih —</option>
                                {step.options.map((series) => (
                                  <option key={series || "tanpa-series"} value={series}>
                                    {series || "Tanpa series"}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div>
                            <label className={labelClass}>Ukuran</label>
                            <select
                              value={row.variant}
                              disabled={!info.product}
                              onChange={(event) =>
                                updateRow(index, { variant: event.target.value }, { collapse: Boolean(event.target.value) })
                              }
                              className={inputClass}
                            >
                              <option value="">— Pilih —</option>
                              {info.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.size}
                                  {option.showColor ? ` (${option.color})` : ""} · sisa {option.stock}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Qty</label>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={row.quantity}
                              onChange={(event) => updateRow(index, { quantity: event.target.value })}
                              onBlur={() => {
                                if (rowComplete(row)) updateRow(index, {}, { collapse: true });
                              }}
                              className={inputClass}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {info.chosen
                              ? `Rp ${formatRupiah(info.chosen.price)} / pcs · subtotal Rp ${formatRupiah(info.subtotal)}`
                              : info.product
                                ? `Kain ${info.product.kain || "-"} · pilih ukuran`
                                : "Pilih bertahap dari kiri ke kanan"}
                            {info.chosen?.linkedTo ? ` · stok mengikuti ${info.chosen.linkedTo}` : ""}
                          </p>
                          {info.issue ? (
                            <p
                              className={`text-xs font-bold ${
                                info.chosen ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {info.issue}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTouched(true);
                    setItems((rows) => [...rows, emptyRow()]);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <Plus size={15} /> Tambah produk
                </button>
              </section>

              {/* Ongkir & diskon */}
              <section className="space-y-2">
                <h4 className={sectionClass}>Ongkir &amp; Diskon</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Ongkir</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-semibold text-sm">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.shipping_cost}
                        onChange={(event) => updateForm({ shipping_cost: digits(event.target.value) })}
                        placeholder="0"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Diskon (opsional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-semibold text-sm">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.discount}
                        onChange={(event) => updateForm({ discount: digits(event.target.value) })}
                        placeholder="0"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Catatan */}
              <section className="space-y-2">
                <h4 className={sectionClass}>Catatan</h4>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(event) => updateForm({ notes: event.target.value })}
                  placeholder="Catatan transaksi (opsional)"
                  className={inputClass}
                />
              </section>

              {stockIssues.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border-2 border-red-200 bg-red-50 px-3.5 py-3" role="alert">
                  <AlertCircle size={16} className="mt-px shrink-0 text-red-600" />
                  <div className="text-sm font-medium leading-snug text-red-700">
                    <p>Stok tidak mencukupi, transaksi ini belum bisa disimpan:</p>
                    <ul className="list-disc ml-4 mt-1">
                      {stockIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="flex items-start gap-2.5 rounded-xl border-2 border-red-200 bg-red-50 px-3.5 py-3" role="alert">
                  <AlertCircle size={16} className="mt-px shrink-0 text-red-600" />
                  <p className="text-sm font-medium leading-snug text-red-700">{saveError}</p>
                </div>
              )}

              {/* Tombol simpan untuk Enter; tombol aslinya ada di footer yang menempel */}
              <button type="submit" className="hidden" aria-hidden="true" />
            </form>

            {/* Footer menempel: Total di kiri, aksi di kanan — tidak ikut ter-scroll */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d28]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-lg font-black font-heading text-slate-900 dark:text-white whitespace-nowrap">
                  Rp {formatRupiah(total)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={mutation.isPending || incomplete}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all"
                >
                  <Save size={16} />
                  {mutation.isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Transaksi"}
                </button>
              </div>
            </div>

            {/* Konfirmasi tutup: isian belum disimpan tidak hilang karena salah klik */}
            <AnimatePresence>
              {confirmClose && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-white/80 dark:bg-[#1a1d28]/80 backdrop-blur-sm flex items-center justify-center p-5"
                  onClick={() => setConfirmClose(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d28] p-5 shadow-xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h4 className="font-heading font-bold text-slate-900 dark:text-white">Isian belum disimpan</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Tutup drawer dan buang isian transaksi ini?
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setConfirmClose(false)}
                        className="flex-1 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
                      >
                        Lanjut isi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmClose(false);
                          setTouched(false);
                          onClose();
                        }}
                        className="flex-1 px-4 py-2.5 border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        Buang &amp; tutup
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
