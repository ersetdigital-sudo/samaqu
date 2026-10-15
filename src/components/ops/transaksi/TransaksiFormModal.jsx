"use client";

/**
 * Form transaksi manual (Tambah / Ubah) untuk menu Transaksi.
 *
 * Sumber "Website" tidak ada di pilihan — baris itu otomatis dari checkout website.
 * Harga produk mengikuti Master Produk, dan stok diperiksa lebih dulu di sini (perhitungan
 * yang sama dipakai server), jadi peringatan stok muncul sebelum tombol Simpan ditekan.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, Plus, Save, Trash2, X } from "lucide-react";
import { base44 } from "@/lib/ops-api";
import { MANUAL_SOURCE_KEYS, SOURCE_LABEL } from "@/lib/transaksi";
import { formatRupiah, isoToWibInput, wibNow, wibToIso } from "@/components/ops/transaksi/transaksi-format";
import { useToast } from "@/components/ops/ui/use-toast";

const inputClass =
  "w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-sm font-semibold text-slate-900 dark:text-white";
const labelClass = "text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5";

const digits = (value) => String(value ?? "").replace(/\D/g, "");
const emptyRow = () => ({ product_id: "", variant: "", quantity: 1 });

export default function TransaksiFormModal({ isOpen, onClose, initialData = null, onSaved }) {
  const isEdit = !!initialData;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(null);
  const [items, setItems] = useState([emptyRow()]);
  const [saveError, setSaveError] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["transaksi", "products"],
    queryFn: () => base44.entities.Product.list(),
    enabled: isOpen,
    staleTime: 30_000,
  });
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

  // Nilai awal: transaksi baru (tanggal/jam sekarang) atau transaksi yang sedang diubah.
  useEffect(() => {
    if (!isOpen) return;
    setSaveError("");
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
      setItems(
        (initialData.items || []).map((item) => ({
          product_id: item.product_id,
          variant: `${item.color || "default"}||${String(item.size).toUpperCase()}`,
          quantity: item.quantity,
        })),
      );
      if ((initialData.items || []).length === 0) setItems([emptyRow()]);
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
    }
  }, [isOpen, initialData]);

  /** Varian per produk: ukuran + sisa stok efektif (turunan memakai stok induknya). */
  const variantGroups = useMemo(() => {
    const map = {};
    for (const item of variants) {
      if (!map[item.product_id]) map[item.product_id] = [];
      map[item.product_id].push(item);
    }
    return map;
  }, [variants]);

  const optionsFor = (productId) => {
    const options = [];
    for (const group of variantGroups[productId] || []) {
      for (const size of Object.keys(group.stock || {})) {
        const stock = Number(group.stock_efektif?.[size] ?? group.stock?.[size] ?? 0);
        options.push({
          value: `${group.color}||${size}`,
          size,
          stock,
          linkedTo: group.base_series_name || group.base_product_name || null,
        });
      }
    }
    return options;
  };

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id-ID")),
    [products],
  );

  const customerOptions = useMemo(
    () =>
      [...customers].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id-ID")),
    [customers],
  );

  /** Total permintaan per (produk + ukuran), supaya baris kembar tetap dihitung benar. */
  const requested = useMemo(() => {
    const map = {};
    for (const row of items) {
      if (!row.product_id || !row.variant) continue;
      const key = `${row.product_id}||${row.variant}`;
      const option = optionsFor(row.product_id).find((opt) => opt.value === row.variant);
      if (!option) continue;
      const entry = map[key] || { option, total: 0 };
      entry.total += Number(row.quantity) || 0;
      map[key] = entry;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, variantGroups]);

  const rowIssues = items.map((row) => {
    if (!row.product_id) return "Produk belum dipilih";
    if (!row.variant) return "Ukuran belum dipilih";
    const quantity = Number(row.quantity) || 0;
    if (quantity < 1) return "Jumlah minimal 1";
    const entry = requested[`${row.product_id}||${row.variant}`];
    if (!entry) return "Ukuran tidak tersedia";
    if (entry.total > entry.option.stock) {
      return `Stok ukuran ${entry.option.size} tinggal ${entry.option.stock}, diminta ${entry.total}`;
    }
    return null;
  });
  const stockIssues = rowIssues.filter(Boolean);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, row) => {
        const product = products.find((p) => p.id === row.product_id);
        return sum + (Number(product?.price) || 0) * (Number(row.quantity) || 0);
      }, 0),
    [items, products],
  );
  const discountValue = Number(digits(form?.discount)) || 0;
  const shippingValue = Number(digits(form?.shipping_cost)) || 0;
  const total = Math.max(0, subtotal - Math.min(discountValue, subtotal)) + shippingValue;

  const updateRow = (index, patch) =>
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const save = () => {
    if (!form) return;
    setSaveError("");
    if (stockIssues.length > 0) {
      setSaveError("Periksa dulu produk yang stoknya tidak cukup.");
      return;
    }
    if (!form.customer_name.trim()) {
      setSaveError("Nama pelanggan wajib diisi.");
      return;
    }
    if (!form.customer_whatsapp.trim()) {
      setSaveError("Nomor HP pelanggan wajib diisi.");
      return;
    }
    const createdAt = wibToIso(form.date, form.time);
    if (!createdAt) {
      setSaveError("Tanggal/jam transaksi tidak valid.");
      return;
    }

    const payload = {
      customer_id: form.customer_mode === "existing" ? form.customer_id || null : null,
      customer_name: form.customer_name.trim(),
      customer_whatsapp: form.customer_whatsapp.trim(),
      source: form.source,
      created_at: createdAt,
      shipping_cost: shippingValue,
      discount: Math.min(discountValue, subtotal),
      notes: form.notes.trim(),
      items: items.map((row) => {
        const [color, size] = String(row.variant).split("||");
        return { product_id: row.product_id, color, size, quantity: Number(row.quantity) || 0 };
      }),
    };

    mutation.mutate(payload);
  };

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.Transaction.updateManual({ order_number: initialData.order_number, ...data })
        : base44.entities.Transaction.createManual(data),
    onSuccess: (result) => {
      // Stok berubah → daftar produk, varian, dan tabel transaksi ikut disegarkan.
      queryClient.invalidateQueries({ queryKey: ["transaksi"] });
      toast({
        title: isEdit ? "✅ Transaksi diperbarui" : "✅ Transaksi tercatat",
        description: `No. Order ${result?.order_number ?? ""}`,
        variant: "success",
      });
      onSaved?.();
      onClose();
    },
    onError: (error) =>
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan transaksi. Coba lagi."),
  });

  if (!isOpen || !form) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-[#1a1d28] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
              {isEdit ? "Ubah Transaksi" : "Tambah Transaksi"}
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup">
              <X size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
            className="p-6 space-y-5"
          >
            {/* Pelanggan */}
            <div>
              <label className={labelClass}>Pelanggan</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, customer_mode: "existing", customer_id: "", customer_name: "", customer_whatsapp: "" })}
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
                  onClick={() => setForm({ ...form, customer_mode: "new", customer_id: "" })}
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
                    const picked = customerOptions.find((c) => (c.id || c.key) === event.target.value);
                    setForm({
                      ...form,
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
                    placeholder="Nama pelanggan"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={form.customer_whatsapp}
                    onChange={(event) => setForm({ ...form, customer_whatsapp: event.target.value })}
                    placeholder="Nomor HP (08…)"
                    className={inputClass}
                  />
                </div>
              )}
              {form.customer_mode === "existing" && form.customer_name ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  {form.customer_name} · {form.customer_whatsapp || "nomor belum ada"}
                </p>
              ) : null}
              {form.customer_mode === "new" ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Pelanggan baru otomatis muncul di menu Pelanggan.
                </p>
              ) : null}
            </div>

            {/* Sumber + waktu */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>
                  Sumber <span className="text-red-500">*</span>
                </label>
                <select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className={inputClass}>
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
                <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Jam (WIB)</label>
                <input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className={inputClass} />
              </div>
            </div>

            {/* Item produk */}
            <div>
              <label className={labelClass}>Produk</label>
              <div className="space-y-2">
                {items.map((row, index) => {
                  const options = optionsFor(row.product_id);
                  const chosen = options.find((option) => option.value === row.variant);
                  const issue = rowIssues[index];
                  return (
                    <div
                      key={index}
                      className={`rounded-xl border-2 p-3 ${issue ? "border-red-200 dark:border-red-900/50" : "border-gray-200 dark:border-slate-700"}`}
                    >
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={row.product_id}
                          onChange={(event) => updateRow(index, { product_id: event.target.value, variant: "" })}
                          className={`${inputClass} sm:flex-1`}
                        >
                          <option value="">— Pilih produk —</option>
                          {sortedProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                              {product.series ? ` — ${product.series}` : ""}
                            </option>
                          ))}
                        </select>
                        <select
                          value={row.variant}
                          onChange={(event) => updateRow(index, { variant: event.target.value })}
                          className={`${inputClass} sm:w-40`}
                          disabled={!row.product_id}
                        >
                          <option value="">— Ukuran —</option>
                          {options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.size} · sisa {option.stock}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={row.quantity}
                          onChange={(event) => updateRow(index, { quantity: event.target.value })}
                          className={`${inputClass} sm:w-20`}
                          aria-label="Jumlah"
                        />
                        <button
                          type="button"
                          onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}
                          disabled={items.length === 1}
                          className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent self-start"
                          aria-label="Hapus produk"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {chosen ? `Harga Rp ${formatRupiah(products.find((p) => p.id === row.product_id)?.price || 0)} / pcs` : ""}
                          {chosen?.linkedTo ? ` · stok mengikuti ${chosen.linkedTo}` : ""}
                        </p>
                        {issue ? <p className="text-xs font-bold text-red-600 dark:text-red-400">{issue}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setItems((rows) => [...rows, emptyRow()])}
                className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <Plus size={15} /> Tambah produk
              </button>
            </div>

            {/* Ongkir, diskon, catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ongkir</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-semibold text-sm">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.shipping_cost}
                    onChange={(event) => setForm({ ...form, shipping_cost: digits(event.target.value) })}
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
                    onChange={(event) => setForm({ ...form, discount: digits(event.target.value) })}
                    placeholder="0"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Catatan</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Catatan transaksi (opsional)"
                className={inputClass}
              />
            </div>

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

            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
              <span className="text-lg font-black font-heading text-slate-900 dark:text-white whitespace-nowrap">
                Rp {formatRupiah(total)}
              </span>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || stockIssues.length > 0}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <Save size={16} />
                {mutation.isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Transaksi"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}
