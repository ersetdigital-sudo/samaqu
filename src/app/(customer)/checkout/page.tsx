"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, Lock } from "lucide-react";
import { getProductById } from "@/lib/katalog-data";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";
import { getWhatsAppLink } from "@/lib/store-settings";

const shippingOptions = [
  { id: "reguler", label: "Reguler", estimate: "3–5 hari kerja", price: 25000 },
  { id: "express", label: "Ekspres", estimate: "1–2 hari kerja", price: 45000 },
];

interface PaymentMethod {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

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
  const product = getProductById(productId)!;
  const { items, clearCart } = useCart();

  const [qty, setQty] = useState(qtyParam || 1);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kota, setKota] = useState("");
  const [kodepos, setKodepos] = useState("");
  const [catatanKurir, setCatatanKurir] = useState("");
  const [shipping, setShipping] = useState("reguler");
  const [payment, setPayment] = useState("bank");
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

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

  if (!product) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="text-center px-6">
          <p className="text-lg font-medium mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Produk tidak ditemukan</p>
          <button onClick={() => router.push("/katalog")} className="text-sm font-ui underline" style={{ color: "var(--gold)" }}>Kembali ke Katalog</button>
        </div>
      </section>
    );
  }

  const selectedColor = colorParam || product.colors[0] || "-";
  const selectedSize = sizeParam;
  const shippingCost = shippingOptions.find((s) => s.id === shipping)?.price || 0;
  const subtotal = product.price * qty;
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount + shippingCost;

  function applyPromo() {
    if (promoCode.toUpperCase() === "SAMAQU10" || promoCode.toUpperCase() === "DISC10") {
      setPromoApplied(true);
    }
  }

  function validatePhone(p: string): boolean {
    return /^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(p.replace(/[\s-]/g, ""));
  }

  async function handleSubmit() {
    const e: Record<string, string> = {};
    if (!nama.trim()) e.nama = "Nama lengkap wajib diisi";
    if (!whatsapp.trim()) e.whatsapp = "No. WhatsApp wajib diisi";
    else if (!validatePhone(whatsapp)) e.whatsapp = "Nomor WhatsApp tidak valid";
    if (!alamat.trim()) e.alamat = "Alamat lengkap wajib diisi";
    if (!kota.trim()) e.kota = "Kota/Kabupaten wajib diisi";
    if (kodepos && !/^\d{5}$/.test(kodepos)) e.kodepos = "Kode pos harus 5 digit";

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
          shipping: { address: alamat, city: kota, postalCode: kodepos, notes: catatanKurir, method: shipping },
          paymentMethod: payment,
          discount,
          items: [{
            productId: product.id,
            name: product.name,
            image: product.image,
            color: selectedColor,
            size: selectedSize,
            quantity: qty,
            price: product.price,
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
    return null; // Redirect to success page handled in handleSubmit
  }

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
                <input type="text" value={nama} onChange={(e) => { setNama(e.target.value); setErrors((p) => ({ ...p, nama: "" })); }} className="field w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ background: "white", border: `1px solid ${errors.nama ? "#e74c3c" : "rgba(64,50,37,.25)"}`, color: "var(--espresso)", outline: "none" }} placeholder="Contoh: Ahmad Fauzi" />
                {errors.nama && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.nama}</p>}
              </div>
              <div>
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ background: "white", border: "1px solid rgba(64,50,37,.25)", color: "var(--espresso)", outline: "none" }} placeholder="nama@email.com" />
              </div>
              <div data-field="whatsapp">
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.whatsapp ? "#e74c3c" : "var(--text-secondary)" }}>Nomor WhatsApp <span style={{ color: "var(--gold)" }}>*</span></label>
                <input type="tel" value={whatsapp} onChange={(e) => { setWhatsapp(e.target.value); setErrors((p) => ({ ...p, whatsapp: "" })); }} className="field w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ background: "white", border: `1px solid ${errors.whatsapp ? "#e74c3c" : "rgba(64,50,37,.25)"}`, color: "var(--espresso)", outline: "none" }} placeholder="0812 3456 7890" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2" data-field="alamat">
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.alamat ? "#e74c3c" : "var(--text-secondary)" }}>Alamat Lengkap <span style={{ color: "var(--gold)" }}>*</span></label>
                <textarea rows={3} value={alamat} onChange={(e) => { setAlamat(e.target.value); setErrors((p) => ({ ...p, alamat: "" })); }} className="field w-full rounded-lg px-4 py-3 text-sm font-ui resize-none" style={{ background: "white", border: `1px solid ${errors.alamat ? "#e74c3c" : "rgba(64,50,37,.25)"}`, color: "var(--espresso)", outline: "none" }} placeholder="Jalan, nomor rumah, RT/RW, kelurahan" />
                {errors.alamat && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.alamat}</p>}
              </div>
              <div data-field="kota">
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.kota ? "#e74c3c" : "var(--text-secondary)" }}>Kota / Kabupaten <span style={{ color: "var(--gold)" }}>*</span></label>
                <input type="text" value={kota} onChange={(e) => { setKota(e.target.value); setErrors((p) => ({ ...p, kota: "" })); }} className="field w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ background: "white", border: `1px solid ${errors.kota ? "#e74c3c" : "rgba(64,50,37,.25)"}`, color: "var(--espresso)", outline: "none" }} placeholder="Contoh: Bandung" />
                {errors.kota && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.kota}</p>}
              </div>
              <div data-field="kodepos">
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: errors.kodepos ? "#e74c3c" : "var(--text-secondary)" }}>Kode Pos</label>
                <input type="text" value={kodepos} onChange={(e) => { setKodepos(e.target.value); setErrors((p) => ({ ...p, kodepos: "" })); }} className="field w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ background: "white", border: `1px solid ${errors.kodepos ? "#e74c3c" : "rgba(64,50,37,.25)"}`, color: "var(--espresso)", outline: "none" }} placeholder="40123" />
                {errors.kodepos && <p className="text-[11px] font-ui mt-1" style={{ color: "#e74c3c" }}>{errors.kodepos}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] sm:text-sm font-ui mb-1.5" style={{ color: "var(--text-secondary)" }}>Catatan untuk Kurir (opsional)</label>
                <input type="text" value={catatanKurir} onChange={(e) => setCatatanKurir(e.target.value)} className="field w-full rounded-lg px-4 py-3 text-sm font-ui" style={{ background: "white", border: "1px solid rgba(64,50,37,.25)", color: "var(--espresso)", outline: "none" }} placeholder="Titipkan ke satpam, dll." />
              </div>
            </div>
          </section>

          {/* Section 3: Shipping Method */}
          <section>
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "var(--espresso)", color: "var(--cream)" }}>3</span>
              <h2 className="text-xl sm:text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Metode Pengiriman</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shippingOptions.map((opt) => (
                <label key={opt.id} className="pay-option relative rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${shipping === opt.id ? "var(--gold)" : "rgba(64,50,37,.25)"}`, background: shipping === opt.id ? "white" : "transparent" }}>
                  <input type="radio" name="ship" value={opt.id} checked={shipping === opt.id} onChange={() => setShipping(opt.id)} className="sr-only" />
                  <span className="relative mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: shipping === opt.id ? "var(--gold)" : "var(--text-muted)" }}>
                    {shipping === opt.id && <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--gold)" }} />}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between">
                      <span className="text-[13px] sm:text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>{opt.label}</span>
                      <span className="text-[13px] sm:text-sm font-ui font-semibold" style={{ color: "var(--gold)" }}>Rp {opt.price.toLocaleString("id-ID")}</span>
                    </span>
                    <span className="block text-[11px] sm:text-xs font-ui mt-0.5" style={{ color: "var(--text-muted)" }}>Estimasi {opt.estimate}</span>
                  </span>
                </label>
              ))}
            </div>
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

          {/* Submit (mobile) */}
          <div className="lg:hidden">
            <button type="submit" disabled={submitting} className="btn-primary w-full rounded-xl py-4 text-sm font-ui font-medium tracking-wide transition-all" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
              {submitting ? "Memproses…" : "Buat Pesanan"}
            </button>
          </div>
        </form>

        {/* Right: Order Summary */}
        <aside className="lg:sticky lg:top-8">
          <div className="rounded-2xl p-5 sm:p-7" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.08)" }}>
            <h2 className="text-xl sm:text-2xl italic mb-4 sm:mb-5" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Ringkasan Pesanan</h2>

            {/* Item */}
            <div className="flex gap-3 sm:gap-4">
              <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: "#e8dfd1" }}>
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] sm:text-sm font-ui font-medium leading-snug" style={{ color: "var(--espresso)" }}>{product.name}</p>
                <p className="text-[11px] sm:text-xs font-ui mt-0.5" style={{ color: "var(--text-muted)" }}>Warna: {selectedColor} · Ukuran: {selectedSize}</p>
                <div className="flex items-center justify-between mt-2 sm:mt-2.5">
                  <div className="inline-flex items-center rounded-lg" style={{ border: "1px solid rgba(64,50,37,.25)" }}>
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="qty-btn w-7 h-7 flex items-center justify-center text-base font-ui" style={{ color: "var(--espresso)" }} aria-label="Kurangi">−</button>
                    <span className="w-8 text-center text-sm font-ui">{qty}</span>
                    <button onClick={() => setQty((q) => q + 1)} className="qty-btn w-7 h-7 flex items-center justify-center text-base font-ui" style={{ color: "var(--espresso)" }} aria-label="Tambah">+</button>
                  </div>
                  <span className="text-[13px] sm:text-sm font-ui font-semibold" style={{ color: "var(--espresso)" }}>Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            {/* Promo */}
            <div className="flex gap-2 mt-5 sm:mt-6">
              <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="field flex-1 rounded-lg px-3.5 py-2.5 text-sm font-ui" style={{ background: "white", border: "1px solid rgba(64,50,37,.25)", color: "var(--espresso)", outline: "none" }} placeholder="Kode promo" />
              <button onClick={applyPromo} className="rounded-lg px-4 text-sm font-ui font-medium" style={{ background: "#e8e2da", color: "var(--espresso)" }}>Terapkan</button>
            </div>

            {/* Totals */}
            <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 space-y-2 sm:space-y-2.5 text-sm font-ui" style={{ borderTop: "1px solid rgba(64,50,37,.15)" }}>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Subtotal</span><span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Pengiriman</span><span>Rp {shippingCost.toLocaleString("id-ID")}</span>
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
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary hidden lg:block w-full mt-5 sm:mt-6 rounded-xl py-4 text-sm font-ui font-medium tracking-wide transition-all" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
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

      {/* Footer */}
      <footer className="mt-8" style={{ borderTop: "1px solid rgba(64,50,37,.08)" }}>
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
