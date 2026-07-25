"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, MapPin, Truck, CreditCard, Upload, CheckCircle,
  Copy, Check, Clock, FileImage, X, ChevronDown, Minus, Plus, Tag, Trash2,
} from "lucide-react";
import { getProductById, colorMap } from "@/lib/katalog-data";

const provinsi = [
  "Aceh","Sumatera Utara","Sumatera Barat","Riau","Jambi","Sumatera Selatan",
  "Bengkulu","Lampung","Kepulauan Bangka Belitung","Kepulauan Riau",
  "DKI Jakarta","Jawa Barat","Jawa Tengah","DI Yogyakarta","Jawa Timur",
  "Banten","Bali","Nusa Tenggara Barat","Nusa Tenggara Timur",
  "Kalimantan Barat","Kalimantan Tengah","Kalimantan Selatan","Kalimantan Timur",
  "Kalimantan Utara","Sulawesi Utara","Sulawesi Tengah","Sulawesi Selatan",
  "Sulawesi Tenggara","Gorontalo","Sulawesi Barat","Maluku","Maluku Utara",
  "Papua Barat","Papua","Papua Selatan","Papua Tengah","Papua Pegunungan","Papua Barat Daya",
];

const shippingOptions = [
  { id: "reguler", label: "Reguler", estimate: "3-5 hari kerja", price: 15000 },
  { id: "express", label: "Express", estimate: "1-2 hari kerja", price: 35000 },
];

const bankInfo = { bank: "Bank Mandiri", number: "1234567890123", name: "PT Samaqu Digital" };

function generateOrderNumber(): string {
  const d = new Date();
  return `SMQ-${d.toISOString().slice(0,10).replace(/-/g,"")}-${String(Math.floor(Math.random()*900)+100)}`;
}

function isValidPhone(p: string): boolean {
  return /^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(p.replace(/[\s-]/g, ""));
}

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d < 0 ? 60 : -60, opacity: 0 }),
};

/* ═══ CHECKOUT CONTENT ═══ */
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("id") || "";
  const colorParam = searchParams.get("color") || "";
  const sizeParam = searchParams.get("size") || "M";
  const qtyParam = parseInt(searchParams.get("qty") || "1", 10);
  const notesParam = searchParams.get("notes") || "";
  const product = getProductById(productId);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [qty, setQty] = useState(qtyParam || 1);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [nama, setNama] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kota, setKota] = useState("");
  const [provinsiVal, setProvinsiVal] = useState("");
  const [kodepos, setKodepos] = useState("");
  const [shipping, setShipping] = useState("reguler");
  const [copied, setCopied] = useState(false);
  const [copiedRek, setCopiedRek] = useState(false);
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [buktiPreview, setBuktiPreview] = useState<string>("");
  const [catatanTambahan, setCatatanTambahan] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orderNumber] = useState(generateOrderNumber);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  const notes = notesParam;
  const shippingCost = shippingOptions.find((s) => s.id === shipping)?.price || 0;
  const subtotal = product.price * qty;
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount + shippingCost;

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!nama.trim()) e.nama = "Nama lengkap wajib diisi";
    if (!whatsapp.trim()) e.whatsapp = "No. WhatsApp wajib diisi";
    else if (!isValidPhone(whatsapp)) e.whatsapp = "Nomor WhatsApp tidak valid";
    if (!alamat.trim()) e.alamat = "Alamat jalan wajib diisi";
    if (!kota.trim()) e.kota = "Kota/Kabupaten wajib diisi";
    if (!provinsiVal) e.provinsi = "Provinsi wajib dipilih";
    if (kodepos && !/^\d{5}$/.test(kodepos)) e.kodepos = "Kode pos harus 5 digit";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep4(): boolean {
    if (!buktiFile) { setErrors({ bukti: "Bukti bayar wajib diupload" }); return false; }
    setErrors({}); return true;
  }

  function nextStep() {
    if (step === 2 && !validateStep2()) return;
    if (step === 4 && !validateStep4()) return;
    setDirection(1); setStep((s) => Math.min(s + 1, 5));
  }

  function prevStep() { setDirection(-1); setStep((s) => Math.max(s - 1, 1)); }

  function applyPromo() {
    const c = promoCode.trim().toUpperCase();
    if (c === "SAMAQU10" || c === "DISC10") { setPromoApplied(true); setPromoError(""); }
    else { setPromoApplied(false); setPromoError("Kode promo tidak valid"); }
  }

  function removePromo() { setPromoCode(""); setPromoApplied(false); setPromoError(""); }
  function copyNominal() { navigator.clipboard.writeText(total.toLocaleString("id-ID")); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  function copyRekening() { navigator.clipboard.writeText(bankInfo.number); setCopiedRek(true); setTimeout(() => setCopiedRek(false), 2000); }

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setBuktiFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setBuktiPreview(e.target?.result as string);
    reader.readAsDataURL(file); setErrors({});
  }, []);

  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragActive(true); }
  function removeFile() { setBuktiFile(null); setBuktiPreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }

  const steps = [
    { num: 1, label: "Ringkasan" }, { num: 2, label: "Data & Alamat" },
    { num: 3, label: "Bayar" }, { num: 4, label: "Upload Bukti" }, { num: 5, label: "Selesai" },
  ];

  /* ── Shared: Order Summary Sidebar ── */
  const orderSummary = (
    <div className="lg:sticky lg:top-28">
      <div className="p-5 rounded-xl" style={{ background: "rgba(255,255,255,.55)", border: "1px solid rgba(201,183,156,.12)" }}>
        <p className="text-[11px] tracking-[0.12em] uppercase font-ui font-medium mb-4" style={{ color: "var(--stone)" }}>Ringkasan Pesanan</p>
        {/* Product */}
        <div className="flex gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid rgba(201,183,156,.12)" }}>
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0" style={{ background: "#e8dfd1" }}>
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-ui font-semibold truncate" style={{ color: "var(--espresso)" }}>{product.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {selectedColor !== "-" && (
                <span className="flex items-center gap-1 text-[11px] font-ui" style={{ color: "var(--coffee)" }}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorMap[selectedColor] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                  {selectedColor}
                </span>
              )}
              {selectedColor !== "-" && <span className="text-[10px]" style={{ color: "var(--clay)" }}>|</span>}
              <span className="text-[11px] font-ui" style={{ color: "var(--coffee)" }}>UK {selectedSize}</span>
            </div>
            <p className="text-[11px] font-ui mt-0.5" style={{ color: "var(--stone)" }}>Qty: {qty}</p>
          </div>
          <PriceText className="text-[13px] shrink-0">Rp {subtotal.toLocaleString("id-ID")}</PriceText>
        </div>
        {/* Breakdown */}
        <div className="space-y-2 mb-3">
          <SummaryLine label="Subtotal" value={`Rp ${subtotal.toLocaleString("id-ID")}`} />
          {promoApplied && <SummaryLine label={`Diskon (${promoCode.toUpperCase()})`} value={`- Rp ${discount.toLocaleString("id-ID")}`} valueColor="var(--gold)" />}
          <SummaryLine label={`Pengiriman ${shippingOptions.find((s) => s.id === shipping)?.label || "Reguler"}`} value={`Rp ${shippingCost.toLocaleString("id-ID")}`} />
        </div>
        <div className="h-px my-3" style={{ background: "rgba(201,183,156,.15)" }} />
        <div className="flex justify-between items-end">
          <span className="text-[12px] font-ui" style={{ color: "var(--stone)" }}>Total</span>
          <PriceText className="text-[18px]">Rp {total.toLocaleString("id-ID")}</PriceText>
        </div>
      </div>
    </div>
  );

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-40" style={{ background: "rgba(248,245,241,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(201,183,156,.15)" }}>
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3 flex items-center gap-3">
          <button onClick={() => (step === 1 ? router.back() : prevStep())}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shrink-0"
            style={{ border: "1px solid rgba(201,183,156,.25)" }}>
            <ArrowLeft size={16} style={{ color: "var(--espresso)" }} />
          </button>
          <h1 className="text-[15px] font-ui font-semibold truncate" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Checkout</h1>
        </div>
      </div>

      {/* ═══ 2-COLUMN LAYOUT (desktop) / SINGLE COLUMN (mobile) ═══ */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-28 lg:pb-12">
        {/* ── Step Indicator ── */}
        <div className="flex items-center justify-center lg:justify-start gap-0 mb-8 lg:mb-10 px-1">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-ui font-semibold transition-all duration-500"
                  style={{
                    background: step >= s.num ? "var(--gold)" : "transparent",
                    color: step >= s.num ? "white" : "var(--stone)",
                    border: `1.5px solid ${step >= s.num ? "var(--gold)" : "rgba(201,183,156,.35)"}`,
                    boxShadow: step === s.num ? "0 4px 14px -3px rgba(184,145,70,.35)" : "none",
                  }}>
                  {step > s.num ? <Check size={13} strokeWidth={2.5} /> : s.num}
                </div>
                <span className="text-[8px] lg:text-[10px] font-ui mt-1 whitespace-nowrap hidden sm:block"
                  style={{ color: step >= s.num ? "var(--gold)" : "var(--stone)" }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-5 lg:w-12 h-px mx-0.5 lg:mx-1.5 mt-0 lg:-mt-4 transition-all duration-500"
                  style={{ background: step > s.num ? "var(--gold)" : "rgba(201,183,156,.25)" }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Grid: Left (content) + Right (summary, desktop only) ── */}
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-10 xl:gap-14">
          {/* LEFT COLUMN: Step Content */}
          <div>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={step} custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

                {/* STEP 1: Ringkasan */}
                {step === 1 && (
                  <div>
                    <div className="mb-5">
                      <h2 className="text-[1.4rem] font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Ringkasan Pesanan</h2>
                      <p className="text-[12px] font-ui mt-0.5" style={{ color: "var(--stone)" }}>1 produk</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl mb-4" style={{ background: "rgba(255,255,255,.65)", border: "1px solid rgba(201,183,156,.15)" }}>
                      <div className="flex gap-3">
                        <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0" style={{ background: "#e8dfd1" }}>
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] sm:text-[14px] font-ui font-semibold leading-tight truncate" style={{ color: "var(--espresso)" }}>{product.name}</p>
                            <button onClick={() => router.push("/katalog")} className="shrink-0 p-1 rounded transition-all hover:scale-110" style={{ color: "var(--stone)" }}><Trash2 size={14} /></button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {selectedColor !== "-" && <span className="flex items-center gap-1 text-[11px] font-ui" style={{ color: "var(--coffee)" }}><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorMap[selectedColor] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />{selectedColor}</span>}
                            {selectedColor !== "-" && <span className="text-[10px]" style={{ color: "var(--clay)" }}>|</span>}
                            <span className="text-[11px] font-ui" style={{ color: "var(--coffee)" }}>UK {selectedSize}</span>
                          </div>
                          <p className="text-[11px] font-ui mt-0.5" style={{ color: "var(--stone)" }}><PriceInline>Rp {product.price.toLocaleString("id-ID")}</PriceInline> / pcs</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="inline-flex items-center rounded-full" style={{ background: "var(--cream)", border: "1px solid rgba(201,183,156,.2)", padding: "2px 4px" }}>
                              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90" style={{ color: "var(--espresso)" }}><Minus size={13} /></button>
                              <span className="w-7 text-center text-[13px] font-ui font-semibold" style={{ color: "var(--espresso)" }}>{qty}</span>
                              <button onClick={() => setQty((q) => q + 1)} className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90" style={{ color: "var(--espresso)" }}><Plus size={13} /></button>
                            </div>
                            <PriceText className="text-[14px]">Rp {(product.price * qty).toLocaleString("id-ID")}</PriceText>
                          </div>
                        </div>
                      </div>
                      {notes && <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(201,183,156,.1)" }}><p className="text-[11px] font-ui italic" style={{ color: "var(--text-muted)" }}>&ldquo;{notes}&rdquo;</p></div>}
                    </div>
                    {/* Promo */}
                    <div className="p-4 rounded-xl mb-5" style={{ background: "rgba(255,255,255,.65)", border: "1px solid rgba(201,183,156,.15)" }}>
                      {promoApplied ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(181,140,74,.1)" }}><Tag size={16} style={{ color: "var(--gold)" }} /></div>
                            <div><p className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>Kode Promo</p><p className="text-[13px] font-ui font-semibold" style={{ color: "var(--gold)" }}>{promoCode.toUpperCase()}</p></div>
                          </div>
                          <button onClick={removePromo} className="text-[12px] font-ui font-medium px-3 py-1.5 rounded-full transition-all hover:scale-105" style={{ color: "var(--gold)", border: "1px solid rgba(181,140,74,.3)" }}>Hapus</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ border: `1px solid ${promoError ? "#e74c3c" : "rgba(201,183,156,.25)"}`, background: "rgba(248,245,241,.5)" }}>
                            <Tag size={15} style={{ color: "var(--clay)" }} />
                            <input type="text" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }} placeholder="Masukkan kode promo" className="flex-1 text-[13px] font-ui bg-transparent outline-none" style={{ color: "var(--espresso)" }} />
                          </div>
                          <button onClick={applyPromo} className="px-4 py-2.5 rounded-lg text-[12px] font-ui font-semibold transition-all duration-200 hover:scale-105 shrink-0" style={{ background: "var(--espresso)", color: "white" }}>Pakai</button>
                        </div>
                      )}
                      {promoError && <p className="text-[11px] font-ui mt-1.5 ml-1" style={{ color: "#e74c3c" }}>{promoError}</p>}
                    </div>
                    {/* Mobile-only summary (hidden on desktop, sidebar shows it) */}
                    <div className="lg:hidden rounded-xl p-4 sm:p-5" style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(201,183,156,.12)" }}>
                      <div className="space-y-2.5">
                        <SummaryLine label="Subtotal" value={`Rp ${subtotal.toLocaleString("id-ID")}`} />
                        {promoApplied && <SummaryLine label={`Diskon (${promoCode.toUpperCase()})`} value={`- Rp ${discount.toLocaleString("id-ID")}`} valueColor="var(--gold)" />}
                        <SummaryLine label={`Pengiriman ${shippingOptions.find((s) => s.id === shipping)?.label || "Reguler"}`} value={`Rp ${shippingCost.toLocaleString("id-ID")}`} />
                      </div>
                      <div className="h-px my-3.5" style={{ background: "rgba(201,183,156,.2)" }} />
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>Total Pembayaran</span>
                        <PriceText className="text-[18px] sm:text-[20px]">Rp {total.toLocaleString("id-ID")}</PriceText>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Data Pemesan */}
                {step === 2 && (
                  <div>
                    <SectionTitle icon={<User size={16} />} title="Data Pemesan" />
                    <Field label="Nama Lengkap" required error={errors.nama}>
                      <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Masukkan nama lengkap" className="w-full px-4 py-3 text-[13px] font-ui rounded-lg outline-none transition-all duration-200 focus:border-[var(--gold)]" style={{ background: "rgba(255,255,255,.5)", border: `1px solid ${errors.nama ? "#e74c3c" : "rgba(201,183,156,.25)"}`, color: "var(--espresso)" }} />
                    </Field>
                    <Field label="No. WhatsApp" required error={errors.whatsapp}>
                      <div className="flex">
                        <span className="px-3 py-3 text-[13px] font-ui rounded-l-lg shrink-0 flex items-center" style={{ background: "rgba(201,183,156,.06)", border: `1px solid ${errors.whatsapp ? "#e74c3c" : "rgba(201,183,156,.25)"}`, borderRight: "none", color: "var(--stone)" }}>+62</span>
                        <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="81234567890" className="w-full px-4 py-3 text-[13px] font-ui rounded-r-lg outline-none transition-all duration-200 focus:border-[var(--gold)]" style={{ background: "rgba(255,255,255,.5)", border: `1px solid ${errors.whatsapp ? "#e74c3c" : "rgba(201,183,156,.25)"}`, color: "var(--espresso)" }} />
                      </div>
                    </Field>
                    <div className="h-px my-6" style={{ background: "rgba(201,183,156,.15)" }} />
                    <SectionTitle icon={<MapPin size={16} />} title="Alamat Pengiriman" />
                    <Field label="Alamat Lengkap" required error={errors.alamat}>
                      <textarea value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Jalan, No. RT/RW, Kelurahan" rows={3} className="w-full px-4 py-3 text-[13px] font-ui rounded-lg outline-none transition-all duration-200 focus:border-[var(--gold)] resize-none" style={{ background: "rgba(255,255,255,.5)", border: `1px solid ${errors.alamat ? "#e74c3c" : "rgba(201,183,156,.25)"}`, color: "var(--espresso)" }} />
                    </Field>
                    <Field label="Kota / Kabupaten" required error={errors.kota}>
                      <input type="text" value={kota} onChange={(e) => setKota(e.target.value)} placeholder="Contoh: Kota Bandung" className="w-full px-4 py-3 text-[13px] font-ui rounded-lg outline-none transition-all duration-200 focus:border-[var(--gold)]" style={{ background: "rgba(255,255,255,.5)", border: `1px solid ${errors.kota ? "#e74c3c" : "rgba(201,183,156,.25)"}`, color: "var(--espresso)" }} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Provinsi" required error={errors.provinsi}>
                        <div className="relative">
                          <select value={provinsiVal} onChange={(e) => setProvinsiVal(e.target.value)} className="w-full px-4 py-3 text-[13px] font-ui rounded-lg outline-none appearance-none transition-all duration-200 focus:border-[var(--gold)]" style={{ background: "rgba(255,255,255,.5)", border: `1px solid ${errors.provinsi ? "#e74c3c" : "rgba(201,183,156,.25)"}`, color: provinsiVal ? "var(--espresso)" : "var(--stone)" }}>
                            <option value="">Pilih</option>{provinsi.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--stone)" }} />
                        </div>
                      </Field>
                      <Field label="Kode Pos" error={errors.kodepos}>
                        <input type="text" value={kodepos} onChange={(e) => setKodepos(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="12345" maxLength={5} className="w-full px-4 py-3 text-[13px] font-ui rounded-lg outline-none transition-all duration-200 focus:border-[var(--gold)]" style={{ background: "rgba(255,255,255,.5)", border: `1px solid ${errors.kodepos ? "#e74c3c" : "rgba(201,183,156,.25)"}`, color: "var(--espresso)" }} />
                      </Field>
                    </div>
                    <div className="h-px my-6" style={{ background: "rgba(201,183,156,.15)" }} />
                    <SectionTitle icon={<Truck size={16} />} title="Metode Pengiriman" />
                    <div className="flex flex-col gap-3">
                      {shippingOptions.map((opt) => (
                        <button key={opt.id} onClick={() => setShipping(opt.id)} className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-200" style={{ border: `1.5px solid ${shipping === opt.id ? "var(--gold)" : "rgba(201,183,156,.2)"}`, background: shipping === opt.id ? "rgba(181,140,74,.04)" : "rgba(255,255,255,.4)" }}>
                          <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={{ border: `2px solid ${shipping === opt.id ? "var(--gold)" : "rgba(201,183,156,.4)"}` }}>{shipping === opt.id && <div className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />}</div>
                          <div className="flex-1"><p className="text-[13px] font-ui font-semibold" style={{ color: "var(--espresso)" }}>{opt.label}</p><p className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>Estimasi {opt.estimate}</p></div>
                          <PriceText className="text-[13px]">Rp {opt.price.toLocaleString("id-ID")}</PriceText>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: Pembayaran */}
                {step === 3 && (
                  <div>
                    <SectionTitle icon={<CreditCard size={16} />} title="Pembayaran" />
                    <div className="p-5 rounded-xl mb-4" style={{ background: "rgba(255,255,255,.65)", border: "1px solid rgba(201,183,156,.15)" }}>
                      <p className="text-[10px] tracking-[0.12em] uppercase font-ui font-medium mb-4" style={{ color: "var(--stone)" }}>Transfer Bank</p>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-[12px] font-ui" style={{ color: "var(--coffee)" }}>Bank</span><span className="text-[13px] font-ui font-semibold" style={{ color: "var(--espresso)" }}>{bankInfo.bank}</span></div>
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] font-ui" style={{ color: "var(--coffee)" }}>No. Rekening</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-ui font-bold tracking-wide" style={{ color: "var(--espresso)" }}>{bankInfo.number}</span>
                            <button onClick={copyRekening} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: copiedRek ? "var(--espresso)" : "rgba(181,140,74,.1)", color: copiedRek ? "white" : "var(--gold)" }}>{copiedRek ? <Check size={12} /> : <Copy size={12} />}</button>
                          </div>
                        </div>
                        <div className="flex justify-between"><span className="text-[12px] font-ui" style={{ color: "var(--coffee)" }}>Atas Nama</span><span className="text-[13px] font-ui font-semibold" style={{ color: "var(--espresso)" }}>{bankInfo.name}</span></div>
                      </div>
                    </div>
                    <div className="p-5 rounded-xl text-center mb-5" style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(201,183,156,.12)" }}>
                      <p className="text-[10px] tracking-[0.12em] uppercase font-ui font-medium mb-3" style={{ color: "var(--stone)" }}>Atau Bayar via QRIS</p>
                      <div className="w-36 h-36 mx-auto rounded-xl flex items-center justify-center" style={{ background: "rgba(201,183,156,.06)", border: "1px dashed rgba(201,183,156,.25)" }}>
                        <div className="text-center"><FileImage size={28} style={{ color: "var(--clay)", margin: "0 auto" }} /><p className="text-[10px] font-ui mt-1.5" style={{ color: "var(--stone)" }}>QRIS SAMAQU</p></div>
                      </div>
                    </div>
                    <div className="p-5 rounded-xl text-center" style={{ background: "rgba(181,140,74,.05)", border: "1.5px dashed rgba(181,140,74,.3)" }}>
                      <p className="text-[11px] font-ui mb-1" style={{ color: "var(--stone)" }}>Total yang harus dibayar</p>
                      <PriceText className="text-[22px] sm:text-[24px] mb-3">Rp {total.toLocaleString("id-ID")}</PriceText>
                      <button onClick={copyNominal} className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[12px] font-ui font-semibold rounded-lg transition-all duration-200 hover:scale-105" style={{ background: copied ? "var(--espresso)" : "var(--gold)", color: "white" }}>
                        {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Tersalin!" : "Copy Nominal"}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Upload Bukti */}
                {step === 4 && (
                  <div>
                    <SectionTitle icon={<Upload size={16} />} title="Upload Bukti Bayar" />
                    <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={() => setDragActive(false)} onClick={() => !buktiFile && fileInputRef.current?.click()} className="relative rounded-xl transition-all duration-200 cursor-pointer" style={{ border: `2px dashed ${errors.bukti ? "#e74c3c" : dragActive ? "var(--gold)" : "rgba(201,183,156,.3)"}`, background: dragActive ? "rgba(181,140,74,.04)" : "rgba(255,255,255,.4)" }}>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                      {buktiPreview ? (
                        <div className="relative p-4">
                          <div className="relative w-full max-w-xs mx-auto rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,183,156,.2)" }}>
                            <img src={buktiPreview} alt="Bukti bayar" className="w-full object-contain max-h-64" />
                            <button onClick={(e) => { e.stopPropagation(); removeFile(); }} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(0,0,0,.5)", color: "white" }}><X size={14} /></button>
                          </div>
                          <p className="text-center text-[11px] font-ui mt-2" style={{ color: "var(--stone)" }}>{buktiFile?.name}</p>
                        </div>
                      ) : (
                        <div className="py-12 px-6 text-center"><Upload size={32} className="mx-auto mb-3" style={{ color: "var(--clay)" }} /><p className="text-[13px] font-ui font-medium mb-1" style={{ color: "var(--espresso)" }}>Seret & lepas bukti bayar di sini</p><p className="text-[11px] font-ui" style={{ color: "var(--stone)" }}>atau klik untuk memilih file (JPG, PNG)</p></div>
                      )}
                    </div>
                    {errors.bukti && <p className="text-[11px] font-ui mt-1.5 ml-1" style={{ color: "#e74c3c" }}>{errors.bukti}</p>}
                    <div className="mt-6">
                      <p className="text-[11px] tracking-[0.08em] uppercase font-ui font-medium mb-2" style={{ color: "var(--espresso)" }}>Catatan Tambahan (Opsional)</p>
                      <textarea value={catatanTambahan} onChange={(e) => setCatatanTambahan(e.target.value)} placeholder="Contoh: Saya sudah transfer via Mandiri Mobile, nominal tepat." rows={3} className="w-full px-4 py-3 text-[13px] font-ui rounded-lg outline-none transition-all duration-200 focus:border-[var(--gold)] resize-none" style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(201,183,156,.25)", color: "var(--espresso)" }} />
                    </div>
                  </div>
                )}

                {/* STEP 5: Konfirmasi */}
                {step === 5 && (
                  <div className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(181,140,74,.1)", border: "2px solid var(--gold)" }}>
                      <CheckCircle size={36} style={{ color: "var(--gold)" }} />
                    </motion.div>
                    <h2 className="text-[1.6rem] font-semibold mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Pesanan Terkirim!</h2>
                    <p className="text-[13px] font-ui mb-6" style={{ color: "var(--stone)" }}>Pesanan Anda sedang menunggu verifikasi admin.</p>
                    <div className="inline-block px-6 py-3 rounded-xl mb-6" style={{ background: "rgba(181,140,74,.08)", border: "1px dashed rgba(181,140,74,.3)" }}>
                      <p className="text-[10px] tracking-[0.15em] uppercase font-ui mb-0.5" style={{ color: "var(--stone)" }}>Nomor Order</p>
                      <p className="text-[18px] font-ui font-bold tracking-wider" style={{ color: "var(--gold)" }}>{orderNumber}</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-6"><Clock size={14} style={{ color: "var(--gold)" }} /><span className="text-[12px] font-ui font-medium" style={{ color: "var(--coffee)" }}>Menunggu Verifikasi Admin</span></div>
                    <div className="p-4 rounded-xl mb-6 text-left" style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(201,183,156,.12)" }}>
                      <p className="text-[11px] tracking-[0.1em] uppercase font-ui font-medium mb-2" style={{ color: "var(--stone)" }}>Estimasi Verifikasi</p>
                      <p className="text-[13px] font-ui" style={{ color: "var(--espresso)" }}>Admin akan memverifikasi pesanan Anda dalam <span className="font-semibold" style={{ color: "var(--gold)" }}>1×24 jam</span> pada hari kerja. Anda akan dihubungi via WhatsApp untuk konfirmasi lebih lanjut.</p>
                    </div>
                    <div className="p-4 rounded-xl text-left mb-6" style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(201,183,156,.12)" }}>
                      <p className="text-[11px] tracking-[0.1em] uppercase font-ui font-medium mb-3" style={{ color: "var(--stone)" }}>Ringkasan Order</p>
                      <div className="space-y-1.5">
                        <SummaryLine label="Produk" value={product.name} />
                        <SummaryLine label="Warna" value={selectedColor} />
                        <SummaryLine label="Ukuran" value={selectedSize} />
                        <SummaryLine label="Jumlah" value={`${qty} pcs`} />
                        <SummaryLine label="Subtotal" value={`Rp ${subtotal.toLocaleString("id-ID")}`} />
                        {promoApplied && <SummaryLine label="Diskon" value={`- Rp ${discount.toLocaleString("id-ID")}`} valueColor="var(--gold)" />}
                        <SummaryLine label="Pengiriman" value={`Rp ${shippingCost.toLocaleString("id-ID")}`} />
                        <div className="h-px my-2" style={{ background: "rgba(201,183,156,.2)" }} />
                        <SummaryLine label="Total" value={`Rp ${total.toLocaleString("id-ID")}`} bold />
                        {notes && <SummaryLine label="Catatan" value={notes} italic />}
                      </div>
                    </div>
                    <button onClick={() => router.push("/katalog")} className="w-full py-3.5 rounded-xl text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01]" style={{ background: "var(--gold)", color: "white", boxShadow: "0 6px 20px -6px rgba(184,145,74,.4)" }}>Lanjut Belanja</button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Desktop action button (inside left column) */}
            {step < 5 && (
              <div className="hidden lg:block mt-8">
                <button onClick={nextStep} className="w-full py-4 rounded-xl text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 active:scale-[0.98]" style={{ background: "var(--gold)", color: "white", boxShadow: "0 6px 20px -6px rgba(184,145,74,.4)" }}>
                  {step === 1 && "Lanjut ke Data Pemesan"}{step === 2 && "Lanjut ke Pembayaran"}{step === 3 && "Lanjut ke Upload Bukti"}{step === 4 && "Konfirmasi Pesanan"}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Order Summary (desktop only, sticky) */}
          <div className="hidden lg:block">
            {orderSummary}
          </div>
        </div>
      </div>

      {/* ═══ FIXED BOTTOM BUTTON (mobile only) ═══ */}
      {step < 5 && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden px-4 pb-4 pt-3" style={{ background: "linear-gradient(to top, var(--cream) 70%, transparent)" }}>
          <button onClick={nextStep} className="w-full py-3.5 rounded-xl text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 active:scale-[0.98]" style={{ background: "var(--gold)", color: "white", boxShadow: "0 6px 20px -6px rgba(184,145,74,.4)" }}>
            {step === 1 && "Lanjut ke Data Pemesan"}{step === 2 && "Lanjut ke Pembayaran"}{step === 3 && "Lanjut ke Upload Bukti"}{step === 4 && "Konfirmasi Pesanan"}
          </button>
        </div>
      )}
    </section>
  );
}

/* ═══ SHARED UI ═══ */

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(181,140,74,.1)" }}><span style={{ color: "var(--gold)" }}>{icon}</span></div>
      <h2 className="text-[13px] font-ui font-semibold tracking-wide" style={{ color: "var(--espresso)" }}>{title}</h2>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] tracking-[0.08em] uppercase font-ui font-medium mb-1.5" style={{ color: error ? "#e74c3c" : "var(--espresso)" }}>{label} {required && <span style={{ color: "var(--gold)" }}>*</span>}</p>
      {children}
      {error && <p className="text-[11px] font-ui mt-1 ml-1" style={{ color: "#e74c3c" }}>{error}</p>}
    </div>
  );
}

/* Serif font for price numbers */
function PriceText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={className} style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 600, color: "var(--gold)" }}>{children}</span>;
}

/* Inline price (within text) */
function PriceInline({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: 600, color: "var(--gold)" }}>{children}</span>;
}

function SummaryLine({ label, value, bold, italic, valueColor }: { label: string; value: string; bold?: boolean; italic?: boolean; valueColor?: string }) {
  const isPrice = value.startsWith("Rp");
  return (
    <div className="flex justify-between">
      <span className="text-[12px] font-ui" style={{ color: "var(--coffee)" }}>{label}</span>
      {isPrice ? (
        <span className="text-[12px]" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontWeight: bold ? 700 : 500, color: valueColor || (bold ? "var(--gold)" : "var(--espresso)"), fontStyle: italic ? "italic" : "normal" }}>{value}</span>
      ) : (
        <span className="text-[12px] font-ui" style={{ color: valueColor || (bold ? "var(--gold)" : "var(--espresso)"), fontWeight: bold ? 700 : 500, fontStyle: italic ? "italic" : "normal" }}>{value}</span>
      )}
    </div>
  );
}

/* ═══ EXPORT ═══ */
export default function CheckoutPage() {
  return (
    <Suspense fallback={<section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,183,156,.3)", borderTopColor: "var(--gold)" }} /></section>}>
      <CheckoutContent />
    </Suspense>
  );
}
