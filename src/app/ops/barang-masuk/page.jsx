"use client";

import { useState } from "react";
import { useNavigate } from "@/lib/ops-router";
import { base44 } from "@/lib/ops-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Package, Calendar as CalendarIcon, Hash, FileText, X, RotateCcw, Save, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { usePageUrl } from "@/lib/ops-router";
import { useToast } from "@/components/ops/ui/use-toast";
import { SIZES, normalizeStock } from "@/lib/ops-variants";

export default function TambahBarangMasuk() {
  const navigate = useNavigate();
  const pageUrl = usePageUrl();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    product_id: '',
    variant_id: '',
    size: '',
    qty: 0,
    total_price: 0,
    notes: ''
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [displayTotalPrice, setDisplayTotalPrice] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  // ✅ VARIANT: stok per warna + ukuran
  const { data: allVariants = [] } = useQuery({
    queryKey: ['productVariants'],
    queryFn: () => base44.entities.ProductVariant.list(),
    initialData: [],
  });

  const variantsOf = (productId) => allVariants.filter(v => v.product_id === productId);
  const selectedVariant = allVariants.find(v => v.id === formData.variant_id);

  const formatRupiah = (value) => {
    if (value === null || value === undefined) return '';
    const number = parseInt(value.toString().replace(/\D/g, ''));
    if (isNaN(number)) return '';
    return number.toLocaleString('id-ID');
  };

  const parseRupiah = (value) => {
    return parseInt(value.replace(/\D/g, '')) || 0;
  };

  const handleTotalPriceChange = (e) => {
    const value = e.target.value;
    const numericValue = parseRupiah(value);
    setFormData({ ...formData, total_price: numericValue });
    setDisplayTotalPrice(formatRupiah(numericValue));
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const product = products.find(p => p.id === data.product_id);
      if (!product) throw new Error("Produk tidak ditemukan");

      // Hitung cost_per_unit dari total_price / qty
      const cost_per_unit = data.qty > 0 ? data.total_price / data.qty : 0;

      // Hitung HPP baru dengan Weighted Average Cost
      const oldStock = product.stock || 0;
      const oldHPP = product.hpp || 0;
      const incomingQty = data.qty;
      const incomingCostPerUnit = cost_per_unit;

      const newTotalStock = oldStock + incomingQty;
      let newHPP = 0;
      if (newTotalStock > 0) {
        const oldTotalCost = oldStock * oldHPP;
        const incomingTotalCost = incomingQty * incomingCostPerUnit;
        newHPP = (oldTotalCost + incomingTotalCost) / newTotalStock;
      }

      // Buat StockIn record dengan cost_per_unit
      await base44.entities.StockIn.create({
        date: data.date,
        product_id: data.product_id,
        product_name: product.name,
        sku: product.sku,
        variant_id: data.variant_id,
        variant_color: allVariants.find(v => v.id === data.variant_id)?.color || '',
        variant_size: data.size,
        qty: data.qty,
        cost_per_unit: cost_per_unit,
        notes: data.notes,
        source: "manual"
      });

      // Stok varian TIDAK ditulis dari sini: POST /api/ops/stock-in sudah
      // menaikkannya di server lewat RPC samaqu_increment_stock (termasuk untuk
      // produk series yang stoknya menumpang produk basisnya). Sebelumnya klien
      // ikut menulis lewat ProductVariant.update — method itu tidak ada di shim
      // /ops, jadi simpan selalu berakhir "Gagal" padahal stok sudah tersimpan.

      // Update Product dengan stok dan HPP baru.
      // HPP dibulatkan ke rupiah bulat: kolom `products.hpp` bertipe integer,
      // sedangkan weighted-average di atas menghasilkan pecahan (mis.
      // 1836.734…) yang ditolak Postgres ("invalid input syntax for type integer").
      await base44.entities.Product.update(data.product_id, {
        stock: newTotalStock,
        hpp: Math.round(newHPP),
        status: newTotalStock === 0 ? 'habis' : newTotalStock <= 5 ? 'menipis' : 'aman'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stockIns']);
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['productVariants']);
      toast({
        title: "✅ Barang masuk berhasil ditambahkan",
        description: "Stok produk dan HPP telah diperbarui",
        variant: "success",
      });
      navigate(pageUrl('MasterProduk'));
    },
    onError: (error) => {
      toast({
        title: "❌ Gagal menambahkan barang masuk",
        description: error.message || "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      });
    }
  });

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
    setFormData({ ...formData, product_id: productId, variant_id: '', size: '' });
  };

  const handleQtyChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFormData({ ...formData, qty: '' });
    } else {
      const numericValue = parseInt(value);
      if (!isNaN(numericValue) && numericValue >= 0) {
        setFormData({ ...formData, qty: numericValue });
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.product_id) {
      toast({
        title: "⚠️ Form tidak lengkap",
        description: "Pilih produk terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!formData.variant_id || !formData.size) {
      toast({
        title: "⚠️ Form tidak lengkap",
        description: "Pilih warna dan ukuran",
        variant: "destructive",
      });
      return;
    }

    const qty = typeof formData.qty === 'string' ? parseInt(formData.qty) : formData.qty;
    
    if (!qty || qty <= 0) {
      toast({
        title: "⚠️ Jumlah tidak valid",
        description: "Jumlah harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    if (formData.total_price <= 0) {
      toast({
        title: "⚠️ Harga tidak valid",
        description: "Total harga beli harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      ...formData,
      qty: qty
    });
  };

  const handleReset = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      product_id: '',
      variant_id: '',
      size: '',
      qty: 0,
      total_price: 0,
      notes: ''
    });
    setSelectedProduct(null);
    setDisplayTotalPrice('');
  };

  const qtyForCalculation = typeof formData.qty === 'string' ? (parseInt(formData.qty) || 1) : (formData.qty || 1);
  const costPerUnit = qtyForCalculation > 0 ? formData.total_price / qtyForCalculation : 0;
  const newStock = (selectedProduct?.stock || 0) + (typeof formData.qty === 'string' ? (parseInt(formData.qty) || 0) : (formData.qty || 0));

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
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(pageUrl('MasterProduk'))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-5 transition-colors"
            style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em' }}
          >
            <ArrowLeft size={18} />
            <span className="font-inter">Kembali</span>
          </button>
          <h1 className="font-outfit tracking-heading leading-heading" style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            Tambah Barang Masuk
          </h1>
          <p className="font-inter tracking-body" style={{ fontSize: '15px', fontWeight: 500, color: '#64748B', lineHeight: '1.6' }}>
            Catat barang yang masuk ke inventory
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informasi Barang Masuk */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-outfit tracking-heading" style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', lineHeight: '1.3' }}>
                    Informasi Barang Masuk
                  </h3>
                  <p className="font-inter" style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginTop: '2px', letterSpacing: '0.01em' }}>
                    Data transaksi barang masuk
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tanggal */}
                <div className="space-y-2">
                  <label className="block font-inter tracking-label" style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
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
                      style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em' }}
                    />
                  </div>
                </div>

                {/* Jumlah */}
                <div className="space-y-2">
                  <label className="block font-inter tracking-label" style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Jumlah <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.qty}
                      onChange={handleQtyChange}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 font-inter font-tabular"
                      style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.01em' }}
                    />
                  </div>
                </div>
              </div>

              {/* Pilih Produk */}
              <div className="space-y-2">
                <label className="block font-inter tracking-label" style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Pilih Produk <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 appearance-none cursor-pointer font-inter"
                    style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em' }}
                  >
                    <option value="">Pilih produk...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ✅ Variant: Warna + Ukuran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block font-inter tracking-label" style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Warna <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.variant_id}
                    onChange={(e) => setFormData({ ...formData, variant_id: e.target.value, size: '' })}
                    disabled={!formData.product_id}
                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 appearance-none cursor-pointer font-inter disabled:bg-gray-100 disabled:cursor-not-allowed"
                    style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em' }}
                  >
                    <option value="">{formData.product_id ? 'Pilih warna...' : 'Pilih produk dulu'}</option>
                    {variantsOf(formData.product_id).map(v => {
                      const total = Object.values(normalizeStock(v.stock)).reduce((a, b) => a + b, 0);
                      return (
                        <option key={v.id} value={v.id}>
                          {v.color}{v.series_name ? ` - ${v.series_name}` : ''} (stok {total} pcs)
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block font-inter tracking-label" style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Ukuran <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    disabled={!formData.variant_id}
                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 appearance-none cursor-pointer font-inter disabled:bg-gray-100 disabled:cursor-not-allowed"
                    style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em' }}
                  >
                    <option value="">{formData.variant_id ? 'Pilih ukuran...' : 'Pilih warna dulu'}</option>
                    {SIZES.map(size => {
                      const available = normalizeStock(selectedVariant?.stock)[size] || 0;
                      return (
                        <option key={size} value={size}>
                          {size} — stok {available} pcs
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Total Harga Beli */}
              <div className="space-y-2">
                <label className="block font-inter tracking-label" style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Total Harga Beli <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <span className="absolute left-12 top-1/2 -translate-y-1/2 font-outfit" style={{ fontSize: '16px', fontWeight: 700, color: '#475569' }}>
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    value={displayTotalPrice}
                    onFocus={() => {
                      if (formData.total_price === 0) {
                        setDisplayTotalPrice('');
                      } else {
                        setDisplayTotalPrice(formData.total_price.toString());
                      }
                    }}
                    onBlur={() => {
                      setDisplayTotalPrice(formatRupiah(formData.total_price));
                    }}
                    onChange={handleTotalPriceChange}
                    placeholder="0"
                    className="w-full pl-20 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition-all duration-200 font-outfit font-tabular tracking-tight"
                    style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}
                  />
                </div>
              </div>

              {/* Harga Beli per Unit (Otomatis) */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                <p className="font-inter tracking-caps" style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Harga Beli per Unit (Otomatis)
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-outfit font-tabular tracking-tight" style={{ fontSize: '36px', fontWeight: 900, color: '#1E40AF', letterSpacing: '-0.02em' }}>
                    Rp {formatRupiah(costPerUnit)}
                  </span>
                </div>
                <p className="font-inter" style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF', marginTop: '8px', letterSpacing: '0.01em' }}>
                  {qtyForCalculation > 0 && formData.total_price > 0 
                    ? `Rp ${formatRupiah(formData.total_price)} ÷ ${qtyForCalculation} unit`
                    : 'Hitung otomatis dari total harga ÷ jumlah'}
                </p>
              </div>

              {/* Preview Stok Baru */}
              {selectedProduct && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-inter tracking-caps" style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        {selectedVariant && formData.size ? `Stok ${selectedVariant.color} ${formData.size}` : 'Stok Produk Saat Ini'}
                      </p>
                      <p className="font-outfit font-tabular" style={{ fontSize: '28px', fontWeight: 900, color: '#059669', letterSpacing: '-0.01em' }}>
                        {selectedVariant && formData.size
                          ? (normalizeStock(selectedVariant.stock)[formData.size] || 0)
                          : selectedProduct.stock}
                      </p>
                    </div>
                    <div>
                      <p className="font-inter tracking-caps" style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        Setelah Barang Masuk
                      </p>
                      <p className="font-outfit font-tabular" style={{ fontSize: '28px', fontWeight: 900, color: '#059669', letterSpacing: '-0.01em' }}>
                        {(selectedVariant && formData.size
                          ? (normalizeStock(selectedVariant.stock)[formData.size] || 0)
                          : selectedProduct.stock) + (parseInt(formData.qty) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <FileText size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-outfit tracking-heading" style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', lineHeight: '1.3' }}>
                    Catatan Tambahan
                  </h3>
                  <p className="font-inter" style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginTop: '2px', letterSpacing: '0.01em' }}>
                    Informasi tambahan (optional)
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-2">
                <label className="block font-inter tracking-label" style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Keterangan (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="4"
                  placeholder="Tambahkan catatan atau keterangan..."
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all duration-200 resize-none font-inter leading-body"
                  style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.01em', lineHeight: '1.6' }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={() => navigate(pageUrl('MasterProduk'))}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md font-outfit"
              style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.01em' }}
            >
              <X size={20} />
              Batal
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-100 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md font-outfit"
              style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.01em' }}
            >
              <RotateCcw size={20} />
              Reset
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md font-outfit"
              style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.01em' }}
            >
              <Save size={20} />
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}