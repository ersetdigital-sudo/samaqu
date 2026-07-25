"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Copy, Check, Clock, ShieldCheck, ArrowLeft, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PaymentMethod {
  bank_name: string;
  account_name: string;
  account_number: string;
}

interface OrderData {
  order_number: string;
  customer_name: string;
  customer_whatsapp: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  shipping_method: string;
  payment_method: string;
  created_at: string;
  order_items: { product_name: string; color: string; size: string; quantity: number; price: number }[];
}

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [storeSettings, setStoreSettings] = useState<{ whatsapp: string }>({ whatsapp: "+62 812 3456 7890" });
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds

  useEffect(() => {
    async function fetchData() {
      if (!orderId) { setLoading(false); return; }

      const [orderRes, paymentRes, settingsRes] = await Promise.all([
        supabase.from("orders").select("*, order_items(product_name, color, size, quantity, price)").eq("order_number", orderId).single(),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("display_order"),
        supabase.from("store_settings").select("whatsapp").eq("id", 1).single(),
      ]);

      if (orderRes.data) setOrder(orderRes.data as unknown as OrderData);
      if (paymentRes.data) setPaymentMethods(paymentRes.data);
      if (settingsRes.data) setStoreSettings(settingsRes.data);
      setLoading(false);
    }
    fetchData();
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function getWhatsAppLink() {
    const wa = storeSettings.whatsapp.replace(/[^0-9+]/g, "").replace(/^0/, "62");
    const msg = `Halo Admin SAMAQU, saya sudah transfer untuk pesanan ${order?.order_number || ""}. Mohon verifikasi. Terima kasih!`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  }

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,183,156,.3)", borderTopColor: "var(--gold)" }} />
      </section>
    );
  }

  if (!order) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="text-center px-6">
          <p className="text-lg font-medium mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Pesanan tidak ditemukan</p>
          <button onClick={() => router.push("/katalog")} className="text-sm font-ui underline" style={{ color: "var(--gold)" }}>Kembali ke Katalog</button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(64,50,37,.08)" }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center">
          <span className="text-2xl sm:text-3xl tracking-[0.2em] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>SAMAQU</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Success icon + title */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="text-center mb-8">
          <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(181,140,74,.1)", border: "2px solid var(--gold)" }}>
            <ShieldCheck size={36} style={{ color: "var(--gold)" }} />
          </div>
          <h1 className="text-[1.6rem] sm:text-5xl font-semibold mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Pesanan Berhasil Dibuat</h1>
          <p className="text-sm font-ui" style={{ color: "var(--stone)" }}>Terima kasih atas pesanan Anda. Silakan lakukan pembayaran untuk memproses pesanan.</p>
        </motion.div>

        {/* Order summary */}
        <div className="rounded-2xl p-5 sm:p-7 mb-6" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(201,183,156,.12)" }}>
          <h2 className="text-lg sm:text-xl italic mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Ringkasan Pesanan</h2>
          <div className="space-y-2 text-sm font-ui">
            <div className="flex justify-between"><span style={{ color: "var(--stone)" }}>No. Invoice</span><span className="font-semibold" style={{ color: "var(--gold)" }}>{order.order_number}</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--stone)" }}>Tanggal</span><span style={{ color: "var(--espresso)" }}>{new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--stone)" }}>Pemesan</span><span style={{ color: "var(--espresso)" }}>{order.customer_name}</span></div>
            <div className="h-px my-2" style={{ background: "rgba(201,183,156,.2)" }} />
            {order.order_items?.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>{item.product_name} ({item.color}/{item.size}) × {item.quantity}</span>
                <span style={{ color: "var(--espresso)" }}>Rp {(item.price * item.quantity).toLocaleString("id-ID")}</span>
              </div>
            ))}
            <div className="h-px my-2" style={{ background: "rgba(201,183,156,.2)" }} />
            <div className="flex justify-between"><span style={{ color: "var(--stone)" }}>Subtotal</span><span style={{ color: "var(--espresso)" }}>Rp {order.subtotal.toLocaleString("id-ID")}</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--stone)" }}>Pengiriman</span><span style={{ color: "var(--espresso)" }}>Rp {order.shipping_cost.toLocaleString("id-ID")}</span></div>
            {order.discount > 0 && <div className="flex justify-between"><span style={{ color: "var(--gold)" }}>Diskon</span><span style={{ color: "var(--gold)" }}>- Rp {order.discount.toLocaleString("id-ID")}</span></div>}
            <div className="flex justify-between items-baseline pt-2 mt-1" style={{ borderTop: "1px solid rgba(201,183,156,.2)" }}>
              <span className="text-lg italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Total</span>
              <span className="text-xl font-ui font-semibold" style={{ color: "var(--espresso)" }}>Rp {order.total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        {/* Payment instructions */}
        {paymentMethods.length > 0 && (
          <div className="rounded-2xl p-5 sm:p-7 mb-6" style={{ background: "rgba(181,140,74,.05)", border: "1.5px dashed rgba(181,140,74,.3)" }}>
            <h2 className="text-lg sm:text-xl italic mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Instruksi Transfer</h2>
            <div className="space-y-4">
              {paymentMethods.map((pm, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(201,183,156,.15)" }}>
                  <p className="text-sm font-ui font-semibold mb-2" style={{ color: "var(--espresso)" }}>{pm.bank_name}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-ui" style={{ color: "var(--stone)" }}>No. Rekening</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-ui font-bold tracking-wide" style={{ color: "var(--espresso)" }}>{pm.account_number}</span>
                        <button onClick={() => copyToClipboard(pm.account_number, `acc-${i}`)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: copied === `acc-${i}` ? "var(--espresso)" : "rgba(181,140,74,.1)", color: copied === `acc-${i}` ? "white" : "var(--gold)" }}>
                          {copied === `acc-${i}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-ui" style={{ color: "var(--stone)" }}>Atas Nama</span>
                      <span className="text-sm font-ui font-medium" style={{ color: "var(--espresso)" }}>{pm.account_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-ui" style={{ color: "var(--stone)" }}>Nominal Transfer</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-ui font-bold" style={{ color: "var(--gold)" }}>Rp {order.total.toLocaleString("id-ID")}</span>
                        <button onClick={() => copyToClipboard(String(order.total), "nominal")} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: copied === "nominal" ? "var(--espresso)" : "rgba(181,140,74,.1)", color: copied === "nominal" ? "white" : "var(--gold)" }}>
                          {copied === "nominal" ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="rounded-2xl p-5 sm:p-7 mb-6" style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(201,183,156,.12)" }}>
          <h2 className="text-lg italic mb-3" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Pastikan Transfer Sesuai</h2>
          <ul className="space-y-2.5 text-sm font-ui" style={{ color: "var(--text-secondary)" }}>
            <li className="flex items-start gap-2"><CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--gold)" }} /> Transfer sesuai nominal yang tertera</li>
            <li className="flex items-start gap-2"><CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--gold)" }} /> Simpan bukti transfer</li>
            <li className="flex items-start gap-2"><CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--gold)" }} /> Konfirmasi via WhatsApp setelah transfer</li>
          </ul>
        </div>

        {/* Countdown */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl" style={{ background: "rgba(181,140,74,.08)", border: "1px dashed rgba(181,140,74,.3)" }}>
            <Clock size={16} style={{ color: "var(--gold)" }} />
            <span className="text-sm font-ui" style={{ color: "var(--stone)" }}>Batas waktu pembayaran:</span>
            <span className="text-lg font-ui font-bold tracking-wider" style={{ color: "var(--gold)" }}>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <a href={getWhatsAppLink()} target="_blank" rel="noopener" className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:scale-[1.01]" style={{ background: "var(--gold)", color: "white", boxShadow: "0 6px 20px -6px rgba(184,145,74,.4)" }}>
            <MessageCircle size={16} /> Saya Sudah Transfer
          </a>
          <button onClick={() => router.push("/")} className="flex-1 py-3.5 rounded-xl text-[12px] tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300" style={{ border: "1.5px solid rgba(201,183,156,.4)", color: "var(--espresso)" }}>
            <ArrowLeft size={14} className="inline mr-1" /> Kembali ke Beranda
          </button>
        </div>

        {/* Help text */}
        <p className="text-center text-xs font-ui" style={{ color: "var(--text-muted)" }}>
          Butuh bantuan? <a href={`https://wa.me/${storeSettings.whatsapp.replace(/[^0-9+]/g, "").replace(/^0/, "62")}`} className="underline" style={{ color: "var(--gold)" }}>Hubungi admin</a>
        </p>
      </main>
    </section>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <CheckoutSuccessContent />
  );
}
