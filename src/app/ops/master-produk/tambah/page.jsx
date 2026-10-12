"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "@/lib/ops-router";
import { base44 } from "@/lib/ops-api";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Package, 
  FileText, 
  Hash, 
  Tag,
  DollarSign,
  Percent,
  X,
  RotateCcw,
  Save,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Plus,
  Gift // ✅ FREE GIFT ICON
} from "lucide-react";
import { createPageUrl } from "@/lib/ops-router";
import { useToast } from "@/components/ops/ui/use-toast";
import { SIZES, emptyStock, normalizeStock, sumStock, stockStatus } from "@/lib/ops-variants";

export default function TambahProduk() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const returnTo = location.state?.returnTo || 'MasterProduk';
  const skuFromImport = location.state?.sku || '';
  const productToEdit = location.state?.product || null; // NEW: Get product to edit

  const isEditMode = !!productToEdit; // NEW: Determine if we're in edit mode

  console.log('🔗 TambahProduk loaded with state:', { returnTo, skuFromImport, productToEdit, isEditMode });

  const [formData, setFormData] = useState({
    sku: productToEdit?.sku || skuFromImport,
    name: productToEdit?.name || '',
    hpp: productToEdit?.hpp || 0,
    price: productToEdit?.price || 0,
    stock: productToEdit?.stock || 0,
    product_type: productToEdit?.product_type || 'normal' // ✅ FREE GIFT SUPPORT
  });

  // ✅ VARIANT STOK: Warna + Nama Series + Stok per Ukuran
  const newVariantRow = () => ({ key: `${Date.now()}-${Math.random()}`, id: null, series_name: '', color: '', stock: emptyStock() });
  const [variants, setVariants] = useState([newVariantRow()]);
  const [removedVariantIds, setRemovedVariantIds] = useState([]);

  const { data: existingVariants = [] } = useQuery({
    queryKey: ['product-variants', productToEdit?.id],
    queryFn: () => base44.entities.ProductVariant.filter({ product_id: productToEdit.id }),
    enabled: isEditMode && !!productToEdit?.id,
    initialData: [],
  });

  useEffect(() => {
    if (isEditMode && existingVariants.length > 0) {
      setVariants(existingVariants.map((v) => ({
        key: v.id,
        id: v.id,
        series_name: v.series_name || '',
        color: v.color || '',
        stock: normalizeStock(v.stock)
      })));
    }
  }, [isEditMode, existingVariants]);

  // SKU Validation States
  const [skuCheckStatus, setSkuCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'duplicate'
  const [duplicateSku, setDuplicateSku] = useState(null);
  const skuCheckTimeoutRef = useRef(null);

  // Fetch all products for SKU validation
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products-for-sku-check'],
    queryFn: () => base44.entities.Product.list(),
    enabled: !isEditMode, // Only fetch when creating new product
  });

  // Debounced SKU check function
  const checkSkuAvailability = useCallback((skuValue) => {
    if (!skuValue || skuValue.trim() === '' || isEditMode) {
      setSkuCheckStatus('idle');
      setDuplicateSku(null);
      return;
    }

    // Clear previous timeout
    if (skuCheckTimeoutRef.current) {
      clearTimeout(skuCheckTimeoutRef.current);
    }

    // Set checking status
    setSkuCheckStatus('checking');

    // Debounce: Wait 500ms before checking
    skuCheckTimeoutRef.current = setTimeout(() => {
      const normalizedSku = skuValue.toUpperCase().trim();
      const existingProduct = allProducts.find(
        p => p.sku?.toUpperCase().trim() === normalizedSku
      );

      if (existingProduct) {
        setSkuCheckStatus('duplicate');
        setDuplicateSku(existingProduct);
      } else {
        setSkuCheckStatus('available');
        setDuplicateSku(null);
      }
    }, 500);
  }, [allProducts, isEditMode]);

  // Watch SKU changes
  useEffect(() => {
    if (!isEditMode) {
      checkSkuAvailability(formData.sku);
    }
    
    return () => {
      if (skuCheckTimeoutRef.current) {
        clearTimeout(skuCheckTimeoutRef.current);
      }
    };
  }, [formData.sku, checkSkuAvailability, isEditMode]);

  const formatRupiah = (value) => {
    if (!value) return '';
    const number = parseInt(value.toString().replace(/\D/g, ''));
    if (isNaN(number)) return '';
    return number.toLocaleString('id-ID');
  };

  const parseRupiah = (value) => {
    return parseInt(value.replace(/\D/g, '')) || 0;
  };

  const [displayHPP, setDisplayHPP] = useState(productToEdit ? formatRupiah(productToEdit.hpp) : '');
  const [displayPrice, setDisplayPrice] = useState(productToEdit ? formatRupiah(productToEdit.price) : '');

  // ✅ Mutasi gabungan: simpan produk + variant (create/edit)
  const saveMutation = useMutation({
    mutationFn: async ({ product, variantRows, removedIds }) => {
      let productId;
      if (isEditMode) {
        await base44.entities.Product.update(productToEdit.id, product);
        productId = productToEdit.id;
      } else {
        const saved = await base44.entities.Product.create(product);
        productId = saved.id;
      }

      // Hapus variant yang dibuang user saat edit
      if (removedIds.length > 0) {
        await base44.entities.ProductVariant.deleteMany({ product_id: productId, id: { $in: removedIds } });
      }

      // Buat variant baru
      const newVariants = variantRows
        .filter((v) => !v.id)
        .map((v) => ({
          product_id: productId,
          product_name: product.name,
          series_name: v.series_name.trim(),
          color: v.color.trim(),
          stock: normalizeStock(v.stock),
          status: stockStatus(sumStock(v.stock))
        }));
      if (newVariants.length > 0) {
        await base44.entities.ProductVariant.bulkCreate(newVariants);
      }

      // Update variant yang sudah ada
      const updates = variantRows
        .filter((v) => v.id)
        .map((v) => ({
          id: v.id,
          series_name: v.series_name.trim(),
          color: v.color.trim(),
          stock: normalizeStock(v.stock),
          status: stockStatus(sumStock(v.stock))
        }));
      if (updates.length > 0) {
        await base44.entities.ProductVariant.bulkUpdate(updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['productVariants']);

      toast({
        title: isEditMode ? "✅ Produk berhasil diupdate" : "✅ Produk berhasil ditambahkan",
        description: "Stok variant warna & ukuran telah disimpan",
        variant: "success",
      });

      if (!isEditMode && returnTo === 'ImportPesanan') {
        navigate(createPageUrl('ImportPesanan'), {
          state: { refreshData: true }
        });
      } else {
        navigate(createPageUrl('MasterProduk'));
      }
    },
  });

  const handleHPPChange = (e) => {
    const value = e.target.value;
    const numericValue = parseRupiah(value);
    setFormData({ ...formData, hpp: numericValue });
    setDisplayHPP(formatRupiah(numericValue));
  };

  const handlePriceChange = (e) => {
    const value = e.target.value;
    const numericValue = parseRupiah(value);
    setFormData({ ...formData, price: numericValue });
    setDisplayPrice(formatRupiah(numericValue));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.sku.trim()) {
      toast({
        title: "⚠️ Form tidak lengkap",
        description: "SKU harus diisi",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate SKU before submitting
    if (!isEditMode && skuCheckStatus === 'duplicate') {
      toast({
        title: "❌ SKU sudah digunakan",
        description: `SKU "${formData.sku}" sudah ada di database. Gunakan SKU lain.`,
        variant: "destructive",
      });
      return;
    }

    // Wait for SKU check to complete
    if (!isEditMode && skuCheckStatus === 'checking') {
      toast({
        title: "⏳ Mohon tunggu",
        description: "Sedang mengecek ketersediaan SKU...",
        variant: "default",
        duration: 2000,
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "⚠️ Form tidak lengkap",
        description: "Nama produk harus diisi",
        variant: "destructive",
      });
      return;
    }

    // Validasi harga (kecuali untuk Free Gift)
    if (formData.product_type !== 'free_gift' && formData.price <= 0) {
      toast({
        title: "⚠️ Harga tidak valid",
        description: "Harga jual harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    // ✅ Validasi variant: minimal 1 warna terisi
    const variantRows = variants
      .filter((v) => v.color.trim() !== '' || v.series_name.trim() !== '')
      .map((v) => ({ ...v, stock: normalizeStock(v.stock) }));

    if (variantRows.length === 0) {
      toast({
        title: "⚠️ Variant belum diisi",
        description: "Tambahkan minimal 1 warna variant",
        variant: "destructive",
      });
      return;
    }

    if (variantRows.some((v) => v.color.trim() === '')) {
      toast({
        title: "⚠️ Form tidak lengkap",
        description: "Warna variant wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const totalStock = variantRows.reduce((sum, v) => sum + sumStock(v.stock), 0);
    const status = stockStatus(totalStock);

    const dataToSubmit = {
      sku: formData.sku.toUpperCase(),
      name: formData.name,
      hpp: formData.hpp,
      price: formData.price,
      stock: totalStock,
      initial_stock: isEditMode ? productToEdit.initial_stock : totalStock, // Preserve initial_stock in edit mode
      status,
      product_type: formData.product_type // ✅ Include product_type
    };

    saveMutation.mutate({ product: dataToSubmit, variantRows, removedIds: removedVariantIds });
  };

  const handleReset = () => {
    if (isEditMode) {
      // Reset to original product data
      setFormData({
        sku: productToEdit.sku,
        name: productToEdit.name,
        hpp: productToEdit.hpp,
        price: productToEdit.price,
        stock: productToEdit.stock,
        product_type: productToEdit.product_type || 'normal'
      });
      setDisplayHPP(formatRupiah(productToEdit.hpp));
      setDisplayPrice(formatRupiah(productToEdit.price));
    } else {
      // Reset to empty
      setFormData({
        sku: skuFromImport,
        name: '',
        hpp: 0,
        price: 0,
        stock: 0,
        product_type: 'normal'
      });
      setDisplayHPP('');
      setDisplayPrice('');
      setVariants([newVariantRow()]);
      setRemovedVariantIds([]);
    }
  };

  const handleBack = () => {
    if (returnTo === 'ImportPesanan') {
      navigate(createPageUrl('ImportPesanan'));
    } else {
      navigate(createPageUrl('MasterProduk'));
    }
  };

  const margin = formData.price > 0 
    ? ((formData.price - formData.hpp) / formData.price * 100)
    : 0;

  const profit = formData.price - formData.hpp;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 dark:from-[#0f1117] dark:via-[#16171d] dark:to-[#0f1117] pb-32 md:pb-20 transition-colors duration-300">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@500;600;700;800;900&family=Manrope:wght@500;600;700;800&display=swap');
        
        .font-inter { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .font-outfit { 
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .font-manrope { 
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `}</style>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors font-semibold text-sm md:text-base"
          >
            <ArrowLeft size={18} className="md:w-5 md:h-5" />
            Kembali {returnTo === 'ImportPesanan' ? 'ke Import Pesanan' : ''}
          </button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white font-outfit">
            {isEditMode ? 'Edit Produk' : 'Tambah Produk Baru'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
            {isEditMode ? 'Perbarui data produk yang sudah ada' : 'Lengkapi data produk yang akan ditambahkan'}
            {skuFromImport && !isEditMode && (
              <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-bold">
                Dari Import: {skuFromImport}
              </span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informasi Dasar Produk */}
          <div className="bg-white dark:bg-[#1a1d28] rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Package size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold font-outfit">
                    Informasi Dasar Produk
                  </h3>
                  <p className="text-white/90 text-sm font-medium">
                    Data utama dan identitas produk
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Kode SKU <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="Contoh: PRD-001"
                    disabled={isEditMode}
                    className={`w-full pl-12 pr-14 py-3.5 bg-white dark:bg-slate-900 border-2 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 transition-all duration-200 uppercase font-bold text-lg text-slate-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed ${
                      !isEditMode && skuCheckStatus === 'duplicate' 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/30' 
                        : !isEditMode && skuCheckStatus === 'available'
                          ? 'border-green-400 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/30'
                          : 'border-gray-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/30'
                    }`}
                  />
                  
                  {/* SKU Check Status Indicator */}
                  {!isEditMode && formData.sku && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <AnimatePresence mode="wait">
                        {skuCheckStatus === 'checking' && (
                          <motion.div
                            key="checking"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1"
                          >
                            <Loader2 size={20} className="text-blue-500 animate-spin" />
                          </motion.div>
                        )}
                        {skuCheckStatus === 'available' && (
                          <motion.div
                            key="available"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <CheckCircle2 size={20} className="text-green-500" />
                          </motion.div>
                        )}
                        {skuCheckStatus === 'duplicate' && (
                          <motion.div
                            key="duplicate"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <AlertCircle size={20} className="text-red-500" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* SKU Check Message */}
                <AnimatePresence mode="wait">
                  {!isEditMode && skuCheckStatus === 'checking' && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs text-blue-600 dark:text-blue-400 font-inter flex items-center gap-1.5"
                    >
                      <Loader2 size={12} className="animate-spin" />
                      Mengecek ketersediaan SKU...
                    </motion.p>
                  )}
                  {!isEditMode && skuCheckStatus === 'available' && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs text-green-600 dark:text-green-400 font-inter flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={12} />
                      SKU tersedia dan siap digunakan
                    </motion.p>
                  )}
                  {!isEditMode && skuCheckStatus === 'duplicate' && duplicateSku && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2"
                    >
                      <p className="text-xs text-red-700 dark:text-red-300 font-bold flex items-center gap-1.5 mb-1">
                        <AlertCircle size={12} />
                        SKU sudah digunakan!
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Produk: <span className="font-bold">{duplicateSku.name}</span>
                      </p>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        Gunakan SKU lain untuk menghindari duplikasi data.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isEditMode && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-inter">
                    SKU tidak bisa diubah saat edit produk
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Nama Produk <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masukkan nama produk"
                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all duration-200 text-lg font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* ✅ TIPE PRODUK - FREE GIFT SUPPORT */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Tipe Produk
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, product_type: 'normal' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                      formData.product_type === 'normal'
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <Package size={18} />
                    <span className="font-bold text-sm">Normal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, product_type: 'free_gift', price: 0 });
                      setDisplayPrice('0');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                      formData.product_type === 'free_gift'
                        ? 'bg-pink-50 dark:bg-pink-900/30 border-pink-500 text-pink-700 dark:text-pink-300'
                        : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <Gift size={18} />
                    <span className="font-bold text-sm">Free Gift</span>
                  </button>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                  {formData.product_type === 'free_gift' 
                    ? 'Produk Free Gift tidak akan dihitung dalam omset & profit, HPP-nya masuk ke biaya promosi'
                    : 'Produk normal dihitung dalam omset & profit'}
                </p>
              </div>
            </div>
          </div>

          {/* Harga & Margin */}
          <div className="bg-white dark:bg-[#1a1d28] rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold font-outfit">
                    Harga & Margin
                  </h3>
                  <p className="text-white/90 text-sm font-medium">
                    Tentukan HPP dan harga jual produk
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                    HPP per Unit
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-600 dark:text-slate-400 font-semibold">
                      Rp
                    </span>
                    <input
                      type="text"
                      required
                      value={displayHPP}
                      onChange={handleHPPChange}
                      placeholder="0"
                      className="w-full pl-20 pr-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-xl focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all duration-200 text-lg font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                    Harga Pokok Penjualan
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                    Harga Jual <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-600 dark:text-slate-400 font-semibold">
                      Rp
                    </span>
                    <input
                      type="text"
                      required
                      disabled={formData.product_type === 'free_gift'}
                      value={displayPrice}
                      onChange={handlePriceChange}
                      placeholder="0"
                      className={`w-full pl-20 pr-4 py-3.5 border-2 rounded-xl transition-all duration-200 text-lg font-bold ${
                        formData.product_type === 'free_gift'
                          ? 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                    {formData.product_type === 'free_gift' ? 'Produk Free Gift tidak memiliki harga jual' : 'Harga untuk customer'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
                        Margin Profit (Otomatis)
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-blue-600 dark:text-blue-400 text-4xl font-black font-manrope">
                          {margin.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-blue-800 dark:text-blue-300 text-xs font-medium mt-2 opacity-80">
                        {formData.price > 0 && formData.hpp > 0
                          ? `(Rp ${formatRupiah(formData.price)} - Rp ${formatRupiah(formData.hpp)}) ÷ Rp ${formatRupiah(formData.price)}`
                          : 'Otomatis dihitung dari harga'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-200 dark:bg-blue-800/40 rounded-xl flex items-center justify-center">
                      <Percent size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border-2 border-green-200 dark:border-green-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-700 dark:text-green-300 text-xs font-bold uppercase tracking-wider mb-2">
                        Profit per Unit (Otomatis)
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-green-600 dark:text-green-400 text-3xl font-black font-manrope">
                          Rp {formatRupiah(profit)}
                        </span>
                      </div>
                      <p className="text-green-800 dark:text-green-300 text-xs font-medium mt-2 opacity-80">
                        {formData.price > 0 && formData.hpp > 0
                          ? `Rp ${formatRupiah(formData.price)} - Rp ${formatRupiah(formData.hpp)}`
                          : 'Laba per unit terjual'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-200 dark:bg-green-800/40 rounded-xl flex items-center justify-center">
                      <TrendingUp size={24} className="text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ Variant Stok: Warna + Ukuran */}
          <div className="bg-white dark:bg-[#1a1d28] rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Layers size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold font-outfit">
                    Stok Variant (Warna & Ukuran)
                  </h3>
                  <p className="text-white/90 text-sm font-medium">
                    Satu baris = 1 warna. Isi stok per ukuran XS – XXL
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-8 space-y-4">
              {variants.map((variant, vIdx) => {
                const variantTotal = sumStock(variant.stock);
                return (
                  <div key={variant.key} className="border-2 border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Warna #{vIdx + 1}
                      </span>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (variant.id) setRemovedVariantIds([...removedVariantIds, variant.id]);
                            setVariants(variants.filter((_, i) => i !== vIdx));
                          }}
                          className="text-red-500 hover:text-red-600 text-xs font-bold flex items-center gap-1"
                        >
                          <X size={14} /> Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Nama Series
                        </label>
                        <input
                          type="text"
                          value={variant.series_name}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[vIdx] = { ...variant, series_name: e.target.value };
                            setVariants(newVariants);
                          }}
                          placeholder="Contoh: Jiharakah"
                          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Warna <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={variant.color}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[vIdx] = { ...variant, color: e.target.value };
                            setVariants(newVariants);
                          }}
                          placeholder="Contoh: Smoke Grey"
                          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                        Stok per Ukuran
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {SIZES.map((size) => (
                          <div key={size}>
                            <label className="block text-center text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase mb-1">
                              {size}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={variant.stock[size] ?? 0}
                              onChange={(e) => {
                                const newVariants = [...variants];
                                newVariants[vIdx] = {
                                  ...variant,
                                  stock: { ...variant.stock, [size]: Math.max(0, parseInt(e.target.value) || 0) }
                                };
                                setVariants(newVariants);
                              }}
                              className="w-full px-1 py-2 text-center bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all font-bold text-sm text-slate-900 dark:text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Total warna ini: <span className="font-black text-slate-900 dark:text-white">{variantTotal} pcs</span>
                    </p>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setVariants([...variants, newVariantRow()])}
                className="w-full py-3 border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Tambah Warna
              </button>

              {(() => {
                const totalAll = variants.reduce((sum, v) => sum + sumStock(v.stock), 0);
                return (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                        Total Stok Semua Warna
                      </p>
                      <p className={`${
                        totalAll === 0 ? 'text-red-600 dark:text-red-400' :
                        totalAll <= 5 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      } text-xl font-bold`}>
                        {totalAll} pcs • {stockStatus(totalAll) === 'habis' ? 'Habis' : stockStatus(totalAll) === 'menipis' ? 'Menipis' : 'Aman'}
                      </p>
                    </div>
                    <Layers size={28} className="text-slate-300 dark:text-slate-600" />
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Action Buttons - Responsive Sticky Footer */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#1a1d28] border-t border-gray-200 dark:border-slate-800 z-50 md:static md:bg-transparent md:border-0 md:p-0 md:pt-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none">
            <div className="flex gap-3 md:gap-4 justify-end max-w-5xl mx-auto">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-3.5 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl md:rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 font-bold text-sm md:text-base transition-all active:scale-95 md:active:scale-100"
              >
                <X size={18} className="md:w-5 md:h-5" />
                Batal
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="hidden md:flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-100 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 font-bold"
              >
                <RotateCcw size={20} />
                Reset
              </button>

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-[2] md:flex-none flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl md:rounded-2xl hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg font-bold text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 md:hover:scale-[1.02]"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={18} className="md:w-5 md:h-5 animate-spin" />
                ) : (
                  <Save size={18} className="md:w-5 md:h-5" />
                )}
                {saveMutation.isPending 
                  ? (isEditMode ? 'Updating...' : 'Menyimpan...') 
                  : (isEditMode ? 'Update' : 'Simpan')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}