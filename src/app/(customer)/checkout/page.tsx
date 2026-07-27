"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Truck, Loader2, ChevronDown } from "lucide-react";
import { getProductById } from "@/lib/katalog-data";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";
import { getWhatsAppLink } from "@/lib/store-settings";

interface PaymentMethod {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

interface IdName { id: number; name: string; zip_code?: string; }
interface ShipOpt { courier: string; service: string; description: string; cost: number; etd: string; }

function PaymentIcon({ type }: { type: string }) {
  if (type === "bank") return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
  if (type === "qris") return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><line x1="14" y1="14" x2="21" y2="21" /></svg>;
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
}

function generateOrderNumber(): string {
  const d = new Date();
  return `SMQ-${d.toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("id") || "";
  const colorParam = searchParams.get("color") || "";
  const sizeParam = searchParams.get("size") || "M";
  const qtyParam = parseInt(searchParams.get("qty") || "1", 10);
  const product = productId ? getProductById(productId) : null;
  const { items, clearCart } = useCart();
  const isCartMode = !productId && items.length > 0;

  const [qty, setQty] = useState(qtyParam || 1);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherId, setVoucherId] = useState("");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kota, setKota] = useState("");
  const [kodepos, setKodepos] = useState("");
  const [catatanKurir, setCatatanKurir] = useState("");
  const [selectedShipping, setSelectedShipping] = useState<ShipOpt | null>(null);
  const [payment, setPayment] = useState("bank");
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string; recipient_name: string; phone: string; address: string; city: string; postal_code: string; is_default: boolean }[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // ── Shipping (RajaOngkir) ──
  const [provinces, setProvinces] = useState<IdName[]>([]);
  const [kabupatenList, setKabupatenList] = useState<IdName[]>([]);
  const [provinsiId, setProvinsiId] = useState<number | null>(null);
  const [kotaId, setKotaId] = useState<number | null>(null);
  const [kecamatanId, setKecamatanId] = useState<number | null>(null);
  const [kecamatanName, setKecamatanName] = useState("");
  const [berat, setBerat] = useState(800);
  const [shipOptions, setShipOptions] = useState<ShipOpt[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingKab, setLoadingKab] = useState(false);
  const [loadingCost, setLoadingCost] = useState(false);
  const [originId, setOriginId] = useState<number | null>(null);

  // Fetch provinces on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingProvinces(true);
        const res = await fetch("/api/shipping/provinces");
        const json = await res.json();
        const list: IdName[] = json.data || [];
        setProvinces(list);

        // Also resolve origin (Depok) for shipping calculation
        const jabar = list.find((p) => p.name.toUpperCase().includes("JAWA BARAT"));
        if (jabar) {
          const cRes = await fetch(`/api/shipping/districts?provinceId=${jabar.id}`);
          const cJson = await cRes.json();
          const depok = (cJson.data || []).find((c: IdName) => c.name.toUpperCase().includes("DEPOK"));
          if (depok) setOriginId(depok.id);
        }
      } catch (e) {
        console.error("Gagal load provinsi:", e);
      } finally {
        setLoadingProvinces(false);
      }
    })();
  }, []);

  // Fetch payment methods from Supabase
  useEffect(() => {
    async function fetchPayment() {
      try {
        const { data } = await supabase.from("payment_methods").select("*").eq("is_active", true).order("display_order");
        if (data && data.length > 0) setPaymentMethods(data);
      } catch { /* silent */ }
    }
    fetchPayment();
  }, []);

  // Fetch saved addresses + prefill email for logged-in customers
  useEffect(() => {
    async function fetchAddresses() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (user.email) setEmail(user.email);
      const { data } = await supabase.from("saved_addresses").select("*").eq("customer_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setSavedAddresses(data);
        const defaultAddr = data.find((a: { is_default: boolean }) => a.is_default) || data[0];
        setSelectedAddressId(defaultAddr.id);
        setNama(defaultAddr.recipient_name);
        setWhatsapp(defaultAddr.phone);
        setAlamat(defaultAddr.address);
        setKota(defaultAddr.city);
        setKodepos(defaultAddr.postal_code);
      }
    }
    fetchAddresses();
  }, []);

  // Auto-calculate weight
  useEffect(() => {
    const totalQty = isCartMode ? items.reduce((sum, item) => sum + item.qty, 0) : qty;
    setBerat(Math.max(500, totalQty * 700));
  }, [isCartMode, items, qty]);

  if (!product && !isCartMode) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="text-center px-6">
          <p className="text-lg font-medium mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Produk tidak ditemukan</p>
          <button onClick={() => router.push("/katalog")} className="text-sm font-ui underline" style={{ color: "var(--gold)" }}>Kembali ke Katalog</button>
        </div>
      </section>
    );
  }

  const selectedColor = colorParam || product?.colors?.[0] || "-";
  const selectedSize = sizeParam;
  const shippingCost = selectedShipping?.cost || 0;
  const cartSubtotal = isCartMode ? items.reduce((sum, item) => sum + item.price * item.qty, 0) : (product?.price || 0) * qty;
  const subtotal = cartSubtotal;
  const total = subtotal - discount + shippingCost;

  async function applyPromo() {
    if (!promoCode.trim()) { setPromoError("Masukkan kode promo"); return; }
    setPromoError("");
    setPromoApplied(false);
    setDiscount(0);
    setVoucherCode("");

    const { data: voucher } = await supabase.from("vouchers").select("*").eq("code", promoCode.trim().toUpperCase()).eq("is_active", true).single();
    if (!voucher) { setPromoError("Kode promo tidak valid"); return; }
    if (voucher.end_date && new Date(voucher.end_date) < new Date()) { setPromoError("Kode promo sudah kadaluarsa"); return; }
    if (voucher.usage_limit > 0 && voucher.used_count >= voucher.usage_limit) { setPromoError("Kode promo sudah habis digunakan"); return; }
    if (voucher.min_purchase > 0 && subtotal < voucher.min_purchase) { setPromoError(`Minimal belanja Rp ${voucher.min_purchase.toLocaleString("id-ID")} untuk kode ini`); return; }
    if (voucher.limit_per_wa && whatsapp.trim()) {
      const phone = whatsapp.replace(/[^0-9]/g, "");
      const { data: existingUsage } = await supabase.from("voucher_usages").select("id").eq("voucher_id", voucher.id).eq("whatsapp_number", phone).limit(1);
      if (existingUsage && existingUsage.length > 0) { setPromoError("Kode voucher ini sudah pernah Anda gunakan"); return; }
    }

    let disc = 0;
    if (voucher.discount_type === "percentage") {
      disc = Math.round(subtotal * voucher.discount_value / 100);
      if (voucher.max_discount > 0) disc = Math.min(disc, voucher.max_discount);
    } else {
      disc = Math.min(voucher.discount_value, subtotal);
    }
    setDiscount(disc);
    setPromoApplied(true);
    setVoucherCode(voucher.code);
    setVoucherId(voucher.id);
  }

  function validatePhone(p: string): boolean {
    return /^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(p.replace(/[\s-]/g, ""));
  }

  async function handleSelectProvinsi(provId: number) {
    setProvinsiId(provId);
    setKotaId(null);
    setKecamatanId(null);
    setKecamatanName("");
    setSelectedShipping(null);
    setKabupatenList([]);
    setShipOptions([]);
    try {
      setLoadingKab(true);
      const res = await fetch(`/api/shipping/districts?provinceId=${provId}`);
      const json = await res.json();
      setKabupatenList(json.data || []);
    } catch (e) {
      console.error("Gagal load kota:", e);
    } finally {
      setLoadingKab(false);
    }
  }

  async function handleHitungOngkir() {
    if (!originId || !kecamatanId) return;
    setLoadingCost(true);
    setShipOptions([]);
    setSelectedShipping(null);
    try {
      const res = await fetch("/api/shipping/cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: originId, destination: kecamatanId, weight: berat }),
      });
      const json = await res.json();
      const opts: ShipOpt[] = [];
      if (json.data && Array.isArray(json.data)) {
        for (const item of json.data) {
          opts.push({
            courier: item.name || item.code || "",
            service: item.service || "",
            description: item.description || "",
            cost: typeof item.cost === "number" ? item.cost : 0,
            etd: item.etd || "",
          });
        }
      }
      opts.sort((a, b) => a.cost - b.cost);
      setShipOptions(opts);
    } catch (e) {
      console.error("Gagal hitung ongkir:", e);
    } finally {
      setLoadingCost(false);
    }
  }

  async function handleSubmit() {
    const e: Record<string, string> = {};
    if (!nama.trim()) e.nama = "Nama lengkap wajib diisi";
    if (!whatsapp.trim()) e.whatsapp = "No. WhatsApp wajib diisi";
    else if (!validatePhone(whatsapp)) e.whatsapp = "Nomor WhatsApp tidak valid";
    if (!alamat.trim()) e.alamat = "Alamat lengkap wajib diisi";
    if (!kota.trim()) e.kota = "Kota/Kabupaten wajib diisi";
    if (kodepos && !/^\d{5}$/.test(kodepos)) e.kodepos = "Kode pos harus 5 digit";
    if (!selectedShipping) e.shipping = "Pilih metode pengiriman";

    if (Object.keys(e).length > 0) {
      setErrors(e);
      const firstKey = Object.keys(e)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: nama, email, whatsapp },
          shipping: {
            address: alamat,
            city: kota,
            district: kecamatanName,
            postalCode: kodepos,
            notes: catatanKurir,
            method: selectedShipping ? `${selectedShipping.courier} - ${selectedShipping.service}` : "manual",
            cost: shippingCost,
          },
          paymentMethod: payment,
          discount,
          voucherCode: promoApplied ? voucherCode : null,
          voucherId: promoApplied ? voucherId : null,
          items: isCartMode
            ? items.map((item) => ({
                productId: item.id,
                name: item.name,
                image: item.image,
                color: item.color,
                size: item.size,
                quantity: item.qty,
                price: item.price,
              }))
            : [{
                productId: product!.id,
                name: product!.name,
                image: product!.image,
                color: selectedColor,
                size: selectedSize,
                quantity: qty,
                price: product!.price,
              }],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat pesanan");
      }

      clearCart();
      const orderNum = data.orderNumber || generateOrderNumber();
      router.push(`/checkout/success?order=${orderNum}`);
    } catch (err) {
      console.error("Checkout error:", err);
      setErrors({ submit: "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSubmitting(false);
    }
  }

  if (orderPlaced) {
    return null;
  }

  const selectStyle: React.CSSProperties = { background: "white", border: "1px solid rgba(64,50,37,.25)", color: "var(--espresso)", outline: "none" };

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(64,50,37,.08)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl tracking-[0.2em] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>SAMAQU</span>
          </a>
          <div className="flex items-center gap-2 text-[13px] sm:text-sm font-ui" style={{ color: "var(--text-secondary)" }}>
            <Lock size={15} strokeWidth={1.6} />
            <span>Pembayaran Aman</span>
          </div>
        </div>
      </header>

      {/* Breadcrumb + Title */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 sm:pt-10 pb-2">
        <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-ui" style={{ color: "var(--text-muted)" }}>
          <span style={{ color: orderPlaced ? "var(--text-muted)" : "var(--text-muted)" }}>Keranjang</span>
          <span style={{ color: "rgba(64,50,37,.3)" }}>/</span>
          <span className="font-medium" style={{ color: orderPlaced ? "var(--text-muted)" : "var(--gold)" }}>Checkout</span>
          <span style={{ color: "rgba(64,50,37,.3)" }}>/</span>
          <span className="font-medium" style={{ color: orderPlaced ? "var(--gold)" : "var(--text-muted)" }}>Selesai</span>
        </nav>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl italic mt-3 sm:mt-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
          {orderPlaced ? "Pesanan Terkirim" : "Detail Pemesanan"}
        </h1>
        <p className="mt-2 max-w-xl text-[13px] sm:text-sm font-ui leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {orderPlaced ? "Pesanan Anda sedang menunggu verifikasi admin." : "Lengkapi data di bawah untuk menyelesaikan pesanan Anda. Tim kami siap membantu konsultasi ukuran bila diperlukan."}
        </p>
      </div>

      {/* Main: 2-column */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 items-start">
        {/* Left: Form */}
        <form className="space-y-8 sm:space-y-10" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Section 1: Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "var(--espresso)", color: "var(--cream)" }}>1</span>
              <h2 className="text-xl sm:text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Informasi Kontak</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2" data-field="nama">
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.nama ? "#e74c3c" : "var(--text-secondary)" }}>Nama Lengkap <span style={{ color: "var(--gold)" }}>*</span></label>
                <input type="text" value={nama} onChange={(e) => { setNama(e.target.value); setErrors((p) => ({ ...p, nama: "" })); }} className="w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ ...selectStyle, border: `1px solid ${errors.nama ? "#e74c3c" : "rgba(64,50,37,.25)"}` }} placeholder="Contoh: Ahmad Fauzi" />
                {errors.nama && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.nama}</p>}
              </div>
              <div>
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm font-ui" style={selectStyle} placeholder="nama@email.com" />
              </div>
              <div data-field="whatsapp">
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.whatsapp ? "#e74c3c" : "var(--text-secondary)" }}>Nomor WhatsApp <span style={{ color: "var(--gold)" }}>*</span></label>
                <input type="tel" value={whatsapp} onChange={(e) => { setWhatsapp(e.target.value); setErrors((p) => ({ ...p, whatsapp: "" })); }} className="w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ ...selectStyle, border: `1px solid ${errors.whatsapp ? "#e74c3c" : "rgba(64,50,37,.25)"}` }} placeholder="0812 3456 7890" />
                {errors.whatsapp && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.whatsapp}</p>}
              </div>
            </div>
          </section>

          {/* Section 2: Shipping Address */}
          <section>
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "var(--espresso)", color: "var(--cream)" }}>2</span>
              <h2 className="text-xl sm:text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Alamat Pengiriman</h2>
            </div>

            {savedAddresses.length > 0 && !showNewAddress && (
              <div className="mb-4 space-y-2">
                {savedAddresses.map((addr) => (
                  <label key={addr.id} className="flex items-start gap-3 rounded-xl p-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${selectedAddressId === addr.id ? "var(--gold)" : "rgba(64,50,37,.15)"}`, background: selectedAddressId === addr.id ? "rgba(181,140,74,.04)" : "white" }}
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setNama(addr.recipient_name);
                      setWhatsapp(addr.phone);
                      setAlamat(addr.address);
                      setKota(addr.city);
                      setKodepos(addr.postal_code);
                    }}>
                    <span className="relative w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5" style={{ borderColor: selectedAddressId === addr.id ? "var(--gold)" : "var(--text-muted)" }}>
                      {selectedAddressId === addr.id && <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--gold)" }} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--espresso)" }}>{addr.label}</span>
                        {addr.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(181,140,74,.15)", color: "var(--gold)" }}>Utama</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{addr.recipient_name} · {addr.phone}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{addr.address}, {addr.city} {addr.postal_code}</p>
                    </div>
                  </label>
                ))}
                <button type="button" onClick={() => setShowNewAddress(true)} className="text-xs font-medium mt-1" style={{ color: "#8b6f42" }}>+ Gunakan Alamat Baru</button>
              </div>
            )}

            {(savedAddresses.length === 0 || showNewAddress) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {savedAddresses.length > 0 && (
                  <div className="sm:col-span-2">
                    <button type="button" onClick={() => setShowNewAddress(false)} className="text-xs font-medium" style={{ color: "#8b6f42" }}>← Kembali ke alamat tersimpan</button>
                  </div>
                )}
                <div className="sm:col-span-2" data-field="alamat">
                  <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.alamat ? "#e74c3c" : "var(--text-secondary)" }}>Alamat Lengkap <span style={{ color: "var(--gold)" }}>*</span></label>
                  <textarea rows={3} value={alamat} onChange={(e) => { setAlamat(e.target.value); setErrors((p) => ({ ...p, alamat: "" })); }} className="w-full rounded-lg px-4 py-3 text-sm font-ui resize-none" style={{ ...selectStyle, border: `1px solid ${errors.alamat ? "#e74c3c" : "rgba(64,50,37,.25)"}` }} placeholder="Jalan, nomor rumah, RT/RW, kelurahan" />
                  {errors.alamat && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.alamat}</p>}
                </div>
                <div data-field="kota">
                  <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.kota ? "#e74c3c" : "var(--text-secondary)" }}>Kota / Kabupaten <span style={{ color: "var(--gold)" }}>*</span></label>
                  <input type="text" value={kota} onChange={(e) => { setKota(e.target.value); setErrors((p) => ({ ...p, kota: "" })); }} className="w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ ...selectStyle, border: `1px solid ${errors.kota ? "#e74c3c" : "rgba(64,50,37,.25)"}` }} placeholder="Contoh: Bandung" />
                  {errors.kota && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.kota}</p>}
                </div>
                <div data-field="kodepos">
                  <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.kodepos ? "#e74c3c" : "var(--text-secondary)" }}>Kode Pos</label>
                  <input type="text" value={kodepos} onChange={(e) => { setKodepos(e.target.value); setErrors((p) => ({ ...p, kodepos: "" })); }} className="w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ ...selectStyle, border: `1px solid ${errors.kodepos ? "#e74c3c" : "rgba(64,50,37,.25)"}` }} placeholder="40123" />
                  {errors.kodepos && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.kodepos}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: "var(--text-secondary)" }}>Catatan untuk Kurir (opsional)</label>
                  <input type="text" value={catatanKurir} onChange={(e) => setCatatanKurir(e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm font-ui" style={selectStyle} placeholder="Titipkan ke satpam, dll." />
                </div>
              </div>
            )}
          </section>

          {/* Section 3: Shipping Method — RajaOngkir */}
          <section>
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "var(--espresso)", color: "var(--cream)" }}>3</span>
              <h2 className="text-xl sm:text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Metode Pengiriman</h2>
            </div>

            {/* Provinsi */}
            <div className="mb-3">
              <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: "var(--text-secondary)" }}>Provinsi Tujuan</label>
              <select
                value={provinsiId ?? ""}
                onChange={(e) => handleSelectProvinsi(Number(e.target.value))}
                className="w-full rounded-lg px-4 py-3 text-sm font-ui"
                style={selectStyle}
              >
                <option value="">{loadingProvinces ? "Memuat provinsi…" : "Pilih Provinsi"}</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Kota/Kabupaten */}
            <div className="mb-3">
              <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: "var(--text-secondary)" }}>Kota / Kabupaten</label>
              <select
                value={kotaId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const name = kabupatenList.find((c) => c.id === id)?.name || "";
                  setKotaId(id);
                  setKota(name);
                  setKecamatanId(null);
                  setKecamatanName("");
                  setSelectedShipping(null);
                  setShipOptions([]);
                }}
                disabled={!provinsiId}
                className="w-full rounded-lg px-4 py-3 text-sm font-ui"
                style={{ ...selectStyle, opacity: !provinsiId ? 0.5 : 1 }}
              >
                <option value="">{loadingKab ? "Memuat kota…" : "Pilih Kota/Kabupaten"}</option>
                {kabupatenList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Kecamatan */}
            <div className="mb-3">
              <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: "var(--text-secondary)" }}>Kecamatan</label>
              <select
                value={kecamatanId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const item = kabupatenList.find((c) => c.id === id);
                  setKecamatanId(id);
                  setKecamatanName(item?.name || "");
                  setKodepos(String(item?.zip_code || "").replace(/^0+$/, "") || "");
                }}
                disabled={!kotaId}
                className="w-full rounded-lg px-4 py-3 text-sm font-ui"
                style={{ ...selectStyle, opacity: !kotaId ? 0.5 : 1 }}
              >
                <option value="">{kotaId ? "Pilih Kecamatan" : "Pilih kota terlebih dahulu"}</option>
                {kabupatenList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Weight */}
            <div className="mb-3">
              <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: "var(--text-secondary)" }}>Berat (gram)</label>
              <input
                type="number"
                value={berat}
                onChange={(e) => setBerat(Number(e.target.value) || 500)}
                min={100}
                className="w-full rounded-lg px-4 py-3 text-sm font-ui"
                style={selectStyle}
              />
            </div>

            {/* Hitung Ongkir button */}
            <button
              type="button"
              onClick={handleHitungOngkir}
              disabled={!kecamatanId || !originId || loadingCost}
              className="w-full rounded-xl py-3 text-sm font-ui font-medium flex items-center justify-center gap-2 transition-all mb-4 disabled:opacity-40"
              style={{ background: "var(--espresso)", color: "var(--cream)" }}
            >
              {loadingCost ? (
                <><Loader2 size={16} className="animate-spin" /> Menghitung…</>
              ) : (
                <><Truck size={16} /> Hitung Ongkos Kirim</>
              )}
            </button>

            {/* Shipping options list */}
            {shipOptions.length > 0 && (
              <div className="space-y-2">
                {shipOptions.map((opt, i) => {
                  const isActive = selectedShipping?.courier === opt.courier && selectedShipping?.service === opt.service;
                  return (
                    <label
                      key={`${opt.courier}-${opt.service}-${i}`}
                      className="relative rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-all"
                      style={{ border: `1.5px solid ${isActive ? "var(--gold)" : "rgba(64,50,37,.25)"}`, background: isActive ? "white" : "transparent" }}
                    >
                      <input
                        type="radio"
                        name="ship"
                        className="sr-only"
                        checked={isActive}
                        onChange={() => setSelectedShipping(opt)}
                      />
                      <span className="relative mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: isActive ? "var(--gold)" : "var(--text-muted)" }}>
                        {isActive && <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--gold)" }} />}
                      </span>
                      <span className="flex-1">
                        <span className="flex items-center justify-between">
                          <span className="text-[13px] sm:text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>
                            {opt.courier.toUpperCase()} — {opt.service}
                          </span>
                          <span className="text-[13px] sm:text-sm font-ui font-semibold" style={{ color: "var(--gold)" }}>
                            Rp {opt.cost.toLocaleString("id-ID")}
                          </span>
                        </span>
                        <span className="block text-[11px] sm:text-xs font-ui mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {opt.description} · Estimasi {opt.etd} hari
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {shipOptions.length === 0 && !loadingCost && (
              <p className="text-xs font-ui" style={{ color: "var(--text-muted)" }}>
                {kecamatanId && originId ? "Tekan tombol di atas untuk melihat opsi pengiriman." : "Lengkapi alamat pengiriman untuk menghitung ongkir."}
              </p>
            )}

            {errors.shipping && <p className="text-[11px] font-ui mt-2" style={{ color: "#e74c3c" }}>{errors.shipping}</p>}
          </section>

          {/* Section 4: Payment Method */}
          <section>
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "var(--espresso)", color: "var(--cream)" }}>4</span>
              <h2 className="text-xl sm:text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Metode Pembayaran</h2>
            </div>
            <div className="space-y-3">
              {paymentMethods.length > 0 ? paymentMethods.map((pm) => (
                <label key={pm.id} className="pay-option relative rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${payment === pm.id ? "var(--gold)" : "rgba(64,50,37,.25)"}`, background: payment === pm.id ? "white" : "transparent" }}>
                  <input type="radio" name="pay" value={pm.id} checked={payment === pm.id} onChange={() => setPayment(pm.id)} className="sr-only" />
                  <span className="relative w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: payment === pm.id ? "var(--gold)" : "var(--text-muted)" }}>
                    {payment === pm.id && <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--gold)" }} />}
                  </span>
                  <span className="text-[13px] sm:text-sm font-ui font-medium flex-1" style={{ color: "var(--espresso)" }}>Transfer Bank ({pm.bank_name})</span>
                  <PaymentIcon type="bank" />
                </label>
              )) : (
                <label className="pay-option relative rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${payment === "bank" ? "var(--gold)" : "rgba(64,50,37,.25)"}`, background: payment === "bank" ? "white" : "transparent" }}>
                  <input type="radio" name="pay" value="bank" checked={payment === "bank"} onChange={() => setPayment("bank")} className="sr-only" />
                  <span className="relative w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: payment === "bank" ? "var(--gold)" : "var(--text-muted)" }}>
                    {payment === "bank" && <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--gold)" }} />}
                  </span>
                  <span className="text-[13px] sm:text-sm font-ui font-medium flex-1" style={{ color: "var(--espresso)" }}>Transfer Bank</span>
                  <PaymentIcon type="bank" />
                </label>
              )}
              <label className="pay-option relative rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${payment === "qris" ? "var(--gold)" : "rgba(64,50,37,.25)"}`, background: payment === "qris" ? "white" : "transparent" }}>
                <input type="radio" name="pay" value="qris" checked={payment === "qris"} onChange={() => setPayment("qris")} className="sr-only" />
                <span className="relative w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: payment === "qris" ? "var(--gold)" : "var(--text-muted)" }}>
                  {payment === "qris" && <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--gold)" }} />}
                </span>
                <span className="text-[13px] sm:text-sm font-ui font-medium flex-1" style={{ color: "var(--espresso)" }}>QRIS / E-Wallet</span>
                <PaymentIcon type="qris" />
              </label>
              <label className="pay-option relative rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${payment === "cod" ? "var(--gold)" : "rgba(64,50,37,.25)"}`, background: payment === "cod" ? "white" : "transparent" }}>
                <input type="radio" name="pay" value="cod" checked={payment === "cod"} onChange={() => setPayment("cod")} className="sr-only" />
                <span className="relative w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: payment === "cod" ? "var(--gold)" : "var(--text-muted)" }}>
                  {payment === "cod" && <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--gold)" }} />}
                </span>
                <span className="text-[13px] sm:text-sm font-ui font-medium flex-1" style={{ color: "var(--espresso)" }}>Bayar di Tempat (COD)</span>
                <PaymentIcon type="cod" />
              </label>
            </div>
          </section>

          {/* Submit error */}
          {errors.submit && (
            <div className="rounded-lg p-3 text-sm font-ui" style={{ background: "rgba(231,76,60,.1)", color: "#e74c3c", border: "1px solid rgba(231,76,60,.2)" }}>
              {errors.submit}
            </div>
          )}

        </form>

        {/* Right: Order Summary */}
        <aside className="lg:sticky lg:top-8">
          <div className="rounded-2xl p-5 sm:p-7" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.08)" }}>
            <h2 className="text-xl sm:text-2xl italic mb-4 sm:mb-5" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Ringkasan Pesanan</h2>

            {isCartMode ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.id}-${item.color}-${item.size}`} className="flex gap-3 sm:gap-4">
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: "#e8dfd1" }}>
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] sm:text-sm font-ui font-medium leading-snug" style={{ color: "var(--espresso)" }}>{item.name}</p>
                      <p className="text-[11px] sm:text-xs font-ui mt-0.5" style={{ color: "var(--text-muted)" }}>Warna: {item.color} · Ukuran: {item.size} · ×{item.qty}</p>
                      <p className="text-[13px] sm:text-sm font-ui font-semibold mt-1.5" style={{ color: "var(--espresso)" }}>Rp {(item.price * item.qty).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 sm:gap-4">
                <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: "#e8dfd1" }}>
                  <img src={product!.image} alt={product!.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] sm:text-sm font-ui font-medium leading-snug" style={{ color: "var(--espresso)" }}>{product!.name}</p>
                  <p className="text-[11px] sm:text-xs font-ui mt-0.5" style={{ color: "var(--text-muted)" }}>Warna: {selectedColor} · Ukuran: {selectedSize}</p>
                  <div className="flex items-center justify-between mt-2 sm:mt-2.5">
                    <div className="inline-flex items-center rounded-lg" style={{ border: "1px solid rgba(64,50,37,.25)" }}>
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-7 h-7 flex items-center justify-center text-base font-ui" style={{ color: "var(--espresso)" }} aria-label="Kurangi">−</button>
                      <span className="w-8 text-center text-sm font-ui">{qty}</span>
                      <button type="button" onClick={() => setQty((q) => q + 1)} className="w-7 h-7 flex items-center justify-center text-sm font-ui" style={{ color: "var(--espresso)" }} aria-label="Tambah">+</button>
                    </div>
                    <span className="text-[13px] sm:text-sm font-ui font-semibold" style={{ color: "var(--espresso)" }}>Rp {subtotal.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Promo */}
            {promoApplied ? (
              <div className="flex items-center justify-between mt-5 sm:mt-6 rounded-xl px-4 py-3" style={{ background: "rgba(75,122,78,.06)", border: "1px solid rgba(75,122,78,.15)" }}>
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#4b7a4e" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  <span className="text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>{voucherCode}</span>
                </div>
                <button type="button" onClick={() => { setPromoApplied(false); setPromoCode(""); setDiscount(0); setVoucherCode(""); setVoucherId(""); }} className="text-xs font-ui font-medium" style={{ color: "#8b6f42" }}>Ganti</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mt-5 sm:mt-6">
                  <input type="text" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }} className="flex-1 rounded-lg px-3.5 py-2.5 text-sm font-ui" style={{ background: "white", border: "1px solid rgba(64,50,37,.25)", color: "var(--espresso)", outline: "none" }} placeholder="Kode promo" />
                  <button type="button" onClick={applyPromo} className="rounded-lg px-4 text-sm font-ui font-medium" style={{ background: "#e8e2da", color: "var(--espresso)" }}>Terapkan</button>
                </div>
                {promoError && <p className="text-[11px] mt-1.5 font-ui" style={{ color: "#e74c3c" }}>{promoError}</p>}
              </>
            )}

            {/* Totals */}
            <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 space-y-2 sm:space-y-2.5 text-sm font-ui" style={{ borderTop: "1px solid rgba(64,50,37,.15)" }}>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Subtotal</span><span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Pengiriman</span><span>{selectedShipping ? `Rp ${shippingCost.toLocaleString("id-ID")}` : "—"}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between" style={{ color: "var(--gold)" }}>
                  <span>Diskon</span><span>− Rp {discount.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 sm:pt-3 mt-1" style={{ borderTop: "1px solid rgba(64,50,37,.15)" }}>
                <span className="text-lg sm:text-xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Total</span>
                <span className="text-lg sm:text-xl font-ui font-semibold" style={{ color: "var(--espresso)" }}>Rp {total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Submit (desktop) */}
            <button type="submit" disabled={submitting} className="hidden lg:block w-full mt-5 sm:mt-6 rounded-xl py-4 text-sm font-ui font-medium tracking-wide transition-all" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
              {submitting ? "Memproses…" : "Buat Pesanan"}
            </button>

            <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 text-[11px] sm:text-xs font-ui" style={{ color: "var(--text-muted)" }}>
              <Lock size={13} strokeWidth={1.6} />
              <span>Transaksi Anda dienkripsi & aman</span>
            </div>
          </div>

          <p className="text-center text-[11px] sm:text-xs font-ui mt-4 sm:mt-5" style={{ color: "var(--text-muted)" }}>
            Butuh bantuan ukuran? <a href={getWhatsAppLink("Halo Admin SAMAQU, saya butuh bantuan ukuran.")} className="underline" style={{ color: "var(--gold)" }}>Konsultasi gratis</a> dengan tim kami.
          </p>
        </aside>
      </main>

      {/* Sticky mobile submit bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pt-3" style={{ background: "linear-gradient(to top, var(--cream) 70%, transparent)" }}>
        <button type="submit" disabled={submitting} className="w-full rounded-xl py-4 text-sm font-ui font-medium tracking-wide transition-all" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
          {submitting ? "Memproses…" : "Buat Pesanan"}
        </button>
      </div>

      {/* Footer (desktop only) */}
      <footer className="hidden lg:block mt-8" style={{ borderTop: "1px solid rgba(64,50,37,.08)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 sm:py-8 text-center text-[11px] sm:text-xs font-ui" style={{ color: "var(--text-muted)" }}>
          © 2024 SAMAQU · Busana yang Layak Menemani Setiap Momen
        </div>
      </footer>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,183,156,.3)", borderTopColor: "var(--gold)" }} /></section>}>
      <CheckoutContent />
    </Suspense>
  );
}
