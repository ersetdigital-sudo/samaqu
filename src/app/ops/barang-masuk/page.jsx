"use client";

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/ops-router";
import { base44 } from "@/lib/ops-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Package, Calendar as CalendarIcon, Hash, FileText, X, RotateCcw, Save, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { usePageUrl } from "@/lib/ops-router";
import { useToast } from "@/components/ops/ui/use-toast";
import { SIZES } from "@/lib/ops-variants";
import { isPaketKategori, PAKET_SIZE, variantName } from "@/lib/item-label";

const today = () => format(new Date(), "yyyy-MM-dd");

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyItem() {
  return {
    key: uid(),
    product_id: "",
    variant_id: "",
    size: "",
    qty: "",
    redirected_from: "",
    follow_name: "",
    editing: true,
  };
}

function stockAt(variant, size) {
  if (!variant || !size) return 0;
  const src = variant.stock_efektif ?? variant.stock ?? {};
  const key = Object.keys(src).find((k) => String(k).toUpperCase() === String(size).toUpperCase());
  return Number(src[key] ?? 0) || 0;
}

export default function TambahBarangMasuk() {
  const navigate = useNavigate();
  const pageUrl = usePageUrl();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    date: today(),
    notes: "",
    items: [emptyItem()],
  });
  const [errors, setErrors] = useState({});
  const requestIdRef = useRef(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  const { data: allVariants = [] } = useQuery({
    queryKey: ["productVariants"],
    queryFn: () => base44.entities.ProductVariant.list(),
    initialData: [],
  });

  const variantsOf = (productId) => allVariants.filter((v) => v.product_id === productId);
  const productOf = (item) => products.find((p) => p.id === item.product_id) || null;
  const variantOf = (item) => allVariants.find((v) => v.id === item.variant_id) || null;

  // Produk turunan (Bayati/Imron/Imalah/Karim) tidak boleh muncul di picker:
  // stoknya hidup di produk induk. Fallback ke data varian kalau field API belum ada.
  const derivedIds = useMemo(
    () => new Set(allVariants.filter((v) => v.base_product_id).map((v) => v.product_id)),
    [allVariants]
  );
  const pickerProducts = useMemo(
    () => products.filter((p) => !p.base_product_id && !derivedIds.has(p.id)),
    [products, derivedIds]
  );

  // Nama turunan per induk — keterangan "Stok bersama dengan ..." di bawah field produk.
  const sharedWith = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      if (!p.base_product_id) continue;
      if (!map.has(p.base_product_id)) map.set(p.base_product_id, []);
      const label = String(p.series || p.name || "").trim();
      if (label) map.get(p.base_product_id).push(label);
    }
    return map;
  }, [products]);

  function sharedLabel(productId) {
    const names = Array.from(new Set(sharedWith.get(productId) || []));
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
  }

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.StockIn.createBatch(payload),
    onSuccess: () => {
      requestIdRef.current = null;
      queryClient.invalidateQueries(["stockIns"]);
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["productVariants"]);
      toast({
        title: "✅ Barang masuk berhasil ditambahkan",
        description: "Stok dan HPP sudah diperbarui di server",
        variant: "success",
      });
      navigate(pageUrl("MasterProduk"));
    },
    onError: (error) => {
      toast({
        title: "❌ Gagal menambahkan barang masuk",
        description: error.message || "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      });
    },
  });

  function updateItem(key, patch) {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleProductChange(item, productId) {
    if (!productId) {
      updateItem(item.key, {
        product_id: "",
        variant_id: "",
        size: "",
        redirected_from: "",
        follow_name: "",
      });
      return;
    }

    const product = products.find((p) => p.id === productId) || null;
    const linkedVariant = allVariants.find((v) => v.product_id === productId && v.base_product_id);
    const baseId = product?.base_product_id || linkedVariant?.base_product_id || null;
    const effectiveId = baseId || productId;
    const effectiveProduct = products.find((p) => p.id === effectiveId) || product;
    const groups = allVariants.filter((v) => v.product_id === effectiveId);
    const originalColor = String(
      allVariants.find((v) => v.product_id === productId)?.color || "default"
    ).toLowerCase();
    const pick =
      groups.length === 1
        ? groups[0]
        : groups.find((v) => String(v.color || "default").toLowerCase() === originalColor) || null;
    const paket = isPaketKategori(effectiveProduct?.category);

    updateItem(item.key, {
      product_id: effectiveId,
      variant_id: pick?.id || "",
      size: paket ? PAKET_SIZE : "",
      redirected_from: baseId ? productId : "",
      follow_name: baseId
        ? product?.stok_bersama?.mengikuti || effectiveProduct?.series || effectiveProduct?.name || baseId
        : "",
    });
  }

  function handleVariantChange(item, variantId) {
    const product = productOf(item);
    const paket = isPaketKategori(product?.category);
    updateItem(item.key, {
      variant_id: variantId,
      size: paket ? PAKET_SIZE : "",
    });
  }

  function handleQtyChange(item, value) {
    updateItem(item.key, { qty: value === "" ? "" : Math.max(0, parseInt(value, 10) || 0) });
  }

  function addItem() {
    setFormData((prev) => {
      // Jangan biarkan dua baris kosong terbuka sekaligus.
      const blankEditing = prev.items.some(
        (item) => item.editing && !item.product_id && !item.qty
      );
      if (blankEditing) return prev;
      return {
        ...prev,
        items: [...prev.items.map((item) => ({ ...item, editing: false })), emptyItem()],
      };
    });
  }

  function removeItem(key) {
    setFormData((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((item) => item.key !== key) };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function effectiveKey(item, variant) {
    if (!item.product_id || !item.size) return "";
    const color = String(variant?.color || "default").toLowerCase();
    return `${item.product_id}|${color}|${String(item.size).toUpperCase()}`;
  }

  const duplicateKeys = useMemo(() => {
    const counts = new Map();
    for (const item of formData.items) {
      const key = effectiveKey(item, variantOf(item));
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [formData.items, allVariants]);

  const totalPcs = formData.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  function rowMessage(item, index) {
    const row = `Baris ${index + 1}`;
    const groups = variantsOf(item.product_id);
    const variant = variantOf(item);
    if (!item.product_id) return `${row}: pilih produk.`;
    if (groups.length === 0) return `${row}: varian produk belum tersedia.`;
    if (!item.variant_id || !variant) return `${row}: pilih warna/varian.`;
    if (!item.size) return `${row}: pilih ukuran.`;
    if (!(Number(item.qty) > 0)) return `${row}: jumlah harus lebih dari 0.`;
    if (duplicateKeys.has(effectiveKey(item, variant))) {
      return `${row}: produk & ukuran ini sudah ada di baris lain — gabungkan.`;
    }
    return "";
  }

  function saveRow(item, index) {
    const message = rowMessage(item, index);
    if (message) {
      setErrors((prev) => ({ ...prev, [item.key]: message }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[item.key];
      return next;
    });
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((row) =>
        row.key === item.key ? { ...row, editing: false } : row
      ),
    }));
  }

  function editItem(key) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((row) => ({ ...row, editing: row.key === key })),
    }));
  }

  function validate() {
    const next = {};
    formData.items.forEach((item, index) => {
      const message = rowMessage(item, index);
      if (message) next[item.key] = message;
    });
    setErrors(next);
    const firstInvalid = formData.items.find((item) => next[item.key]);
    if (firstInvalid) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((row) => ({
          ...row,
          editing: row.key === firstInvalid.key ? true : row.editing,
        })),
      }));
    }
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (createMutation.isPending) return;
    if (!formData.date) {
      toast({ title: "⚠️ Tanggal wajib diisi", variant: "destructive" });
      return;
    }
    if (!validate()) {
      toast({
        title: "⚠️ Periksa baris yang merah",
        description: "Lengkapi produk, ukuran, jumlah, dan total harga tiap baris.",
        variant: "destructive",
      });
      return;
    }

    const requestId = requestIdRef.current || (requestIdRef.current = uid());
    const items = formData.items.map((item) => {
      const variant = variantOf(item);
      return {
        product_id: item.product_id,
        variant_color: variant?.color || "default",
        variant_size: item.size,
        qty: Number(item.qty),
        total_price: 0,
      };
    });

    createMutation.mutate({
      date: formData.date,
      notes: formData.notes.trim() || null,
      request_id: requestId,
      items,
    });
  }

  function handleReset() {
    requestIdRef.current = null;
    setFormData({ date: today(), notes: "", items: [emptyItem()] });
    setErrors({});
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
      `}</style>

      <div className="max-w-5xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(pageUrl("MasterProduk"))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-5 transition-colors"
            style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "0.01em" }}
          >
            <ArrowLeft size={18} />
            <span className="font-inter">Kembali</span>
          </button>
          <h1 className="font-outfit tracking-heading leading-heading" style={{ fontSize: "32px", fontWeight: 800, color: "#0F172A", marginBottom: "8px" }}>
            Tambah Barang Masuk
          </h1>
          <p className="font-inter tracking-body" style={{ fontSize: "15px", fontWeight: 500, color: "#64748B", lineHeight: "1.6" }}>
            Catat beberapa produk sekaligus — stok langsung masuk ke gudang
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-outfit tracking-heading" style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF", lineHeight: "1.3" }}>
                    Informasi Barang Masuk
                  </h3>
                  <p className="font-inter" style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.9)", marginTop: "2px", letterSpacing: "0.01em" }}>
                    Tanggal dan keterangan dipakai untuk semua baris
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block font-inter tracking-label" style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Tanggal <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 font-inter font-tabular"
                      style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "0.01em" }}
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block font-inter tracking-label" style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Keterangan (Optional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-4 text-gray-400" size={20} />
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="2"
                      placeholder="Contoh: restock produksi Oktober"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 resize-none font-inter leading-body"
                      style={{ fontSize: "15px", fontWeight: 500, letterSpacing: "0.01em", lineHeight: "1.6" }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <h4 className="font-outfit" style={{ fontSize: "17px", fontWeight: 800, color: "#0F172A" }}>Daftar Barang</h4>
                  <p className="font-inter" style={{ fontSize: "12.5px", color: "#64748B", marginTop: 2 }}>Satu baris = satu produk + ukuran.</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-green-500 bg-white px-4 py-2.5 text-sm font-bold text-green-700 transition hover:bg-green-50"
                >
                  <Plus size={17} /> Tambah Produk
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => {
                  const product = productOf(item);
                  const variant = variantOf(item);
                  const groups = variantsOf(item.product_id);
                  const needsVariant = groups.length > 1;
                  const paket = isPaketKategori(product?.category);
                  const qty = Number(item.qty) || 0;
                  const currentStock = item.size
                    ? stockAt(variant, item.size)
                    : product?.stock_efektif ?? product?.stock ?? 0;
                  const afterStock = currentStock + qty;
                  const duplicate = duplicateKeys.has(effectiveKey(item, variant));
                  const error = errors[item.key];

                  return item.editing ? (
                    <div
                      key={item.key}
                      className={`rounded-2xl border-2 p-4 md:p-5 transition-colors ${error ? "border-red-300 bg-red-50/40" : "border-gray-200 bg-gray-50/50"}`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="font-outfit" style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>
                          Produk {index + 1}
                        </p>
                        {formData.items.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={14} /> Hapus
                          </button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <label className="block font-inter tracking-label" style={{ fontSize: "12px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                            Pilih Produk <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={19} />
                            <select
                              required
                              value={item.product_id}
                              onChange={(e) => handleProductChange(item, e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all appearance-none cursor-pointer font-inter"
                              style={{ fontSize: "15px", fontWeight: 600 }}
                            >
                              <option value="">Pilih produk...</option>
                              {pickerProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </div>
                          {item.product_id && sharedLabel(item.product_id) ? (
                            <p className="font-inter" style={{ fontSize: "12.5px", fontWeight: 600, color: "#047857", marginTop: 2 }}>
                              Stok bersama dengan {sharedLabel(item.product_id)}
                            </p>
                          ) : null}
                        </div>

                        {needsVariant ? (
                          <div className="space-y-2">
                            <label className="block font-inter tracking-label" style={{ fontSize: "12px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                              {paket ? "Varian" : "Warna"} <span className="text-red-500">*</span>
                            </label>
                            <select
                              required
                              value={item.variant_id}
                              onChange={(e) => handleVariantChange(item, e.target.value)}
                              disabled={!item.product_id}
                              className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all appearance-none cursor-pointer font-inter disabled:bg-gray-100"
                              style={{ fontSize: "15px", fontWeight: 600 }}
                            >
                              <option value="">{item.product_id ? (paket ? "Pilih varian..." : "Pilih warna...") : "Pilih produk dulu"}</option>
                              {groups.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {[variantName(v.color), v.series_name].filter(Boolean).join(" · ") || "Varian"}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}

                        {!paket ? (
                          <div className="space-y-2">
                            <label className="block font-inter tracking-label" style={{ fontSize: "12px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                              Ukuran <span className="text-red-500">*</span>
                            </label>
                            <select
                              required
                              value={item.size}
                              onChange={(e) => updateItem(item.key, { size: e.target.value })}
                              disabled={!item.variant_id}
                              className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all appearance-none cursor-pointer font-inter disabled:bg-gray-100"
                              style={{ fontSize: "15px", fontWeight: 600 }}
                            >
                              <option value="">{item.variant_id ? "Pilih ukuran..." : needsVariant ? "Pilih warna dulu" : "Pilih produk dulu"}</option>
                              {SIZES.map((size) => (
                                <option key={size} value={size}>
                                  {size} — stok {stockAt(variant, size)} pcs
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="block font-inter tracking-label" style={{ fontSize: "12px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>Ukuran</label>
                            <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-inter" style={{ fontSize: "15px", fontWeight: 600, color: "#475569" }}>
                              {PAKET_SIZE}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="block font-inter tracking-label" style={{ fontSize: "12px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                            Jumlah <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleQtyChange(item, e.target.value)}
                              placeholder="0"
                              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all font-inter font-tabular"
                              style={{ fontSize: "17px", fontWeight: 800 }}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3">
                            <p className="font-inter tracking-caps" style={{ fontSize: "10px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Stok Sekarang
                            </p>
                            <p className="font-outfit font-tabular" style={{ fontSize: "26px", fontWeight: 900, color: "#059669" }}>{currentStock}</p>
                          </div>
                          <div className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3">
                            <p className="font-inter tracking-caps" style={{ fontSize: "10px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Setelah Barang Masuk
                            </p>
                            <p className="font-outfit font-tabular" style={{ fontSize: "26px", fontWeight: 900, color: "#059669" }}>{afterStock}</p>
                          </div>
                        </div>
                      </div>

                      {item.redirected_from && item.follow_name ? (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 font-inter" style={{ fontSize: "12.5px", fontWeight: 600, color: "#047857" }}>
                          Stok masuk ke <b>{item.follow_name}</b> (ikut stok bersama).
                        </div>
                      ) : null}

                      {duplicate && !error ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 font-inter" style={{ fontSize: "12.5px", fontWeight: 600, color: "#B45309" }}>
                          Produk & ukuran ini sudah ada di baris lain — gabungkan supaya tidak dobel.
                        </div>
                      ) : null}

                      {error ? (
                        <p className="mt-3 font-inter" style={{ fontSize: "12.5px", fontWeight: 700, color: "#B91C1C" }}>{error}</p>
                      ) : null}

                      <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
                        <button
                          type="button"
                          onClick={() => saveRow(item, index)}
                          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
                        >
                          <Save size={16} /> Simpan produk
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={item.key}
                      className={`rounded-2xl border-2 p-4 transition-colors ${error ? "border-red-300 bg-red-50/40" : "border-gray-200 bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-outfit truncate" style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>
                            {product?.name || "Produk belum dipilih"}
                          </p>
                          <p className="font-inter text-xs text-slate-500 mt-0.5 truncate">
                            {[variant ? variantName(variant.color) : null, product?.series, item.size]
                              .filter(Boolean)
                              .join(" · ") || "Lengkapi produk"}
                          </p>
                          <p className="font-inter text-sm font-bold mt-1.5" style={{ color: "#0F172A" }}>
                            Qty {qty}
                          </p>
                          <p className="font-inter text-xs text-slate-500 mt-0.5">
                            Stok {currentStock} → {afterStock} pcs
                          </p>
                          {item.product_id && sharedLabel(item.product_id) ? (
                            <p className="font-inter mt-1" style={{ fontSize: "11.5px", fontWeight: 600, color: "#047857" }}>
                              Stok bersama dengan {sharedLabel(item.product_id)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => editItem(item.key)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            Ubah
                          </button>
                          {formData.items.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeItem(item.key)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {duplicate && !error ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 font-inter" style={{ fontSize: "12.5px", fontWeight: 600, color: "#B45309" }}>
                          Produk & ukuran ini sudah ada di baris lain — gabungkan supaya tidak dobel.
                        </div>
                      ) : null}

                      {error ? (
                        <p className="mt-2 font-inter" style={{ fontSize: "12.5px", fontWeight: 700, color: "#B91C1C" }}>{error}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 md:p-5">
                <p className="font-inter tracking-caps" style={{ fontSize: "10px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total pcs</p>
                <p className="font-outfit font-tabular" style={{ fontSize: "28px", fontWeight: 900, color: "#0F172A" }}>{totalPcs}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(pageUrl("MasterProduk"))}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md font-outfit"
              style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.01em" }}
            >
              <X size={20} /> Batal
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-100 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md font-outfit"
              style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.01em" }}
            >
              <RotateCcw size={20} /> Reset
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md font-outfit"
              style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.01em" }}
            >
              <Save size={20} />
              {createMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
