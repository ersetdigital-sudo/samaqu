"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Phone, Lock, Loader2 } from "lucide-react";
import { registerCustomer } from "@/lib/customer-auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) { setError("Semua field wajib diisi"); return; }
    if (password.length < 6) { setError("Password minimal 6 karakter"); return; }
    setLoading(true);
    const result = await registerCustomer(email, password, name, whatsapp);
    if (result.error) { setError(result.error); setLoading(false); return; }
    router.push("/akun");
  }

  return (
    <section className="min-h-screen flex" style={{ background: "#f0f2f5" }}>
      {/* Desktop: slanted dark left panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden" style={{ background: "var(--espresso)" }}>
        <div className="absolute inset-0" style={{
          clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)",
          background: "linear-gradient(135deg, rgba(181,140,74,.15) 0%, rgba(45,33,27,.95) 50%, rgba(45,33,27,1) 100%)",
        }} />
        <div className="absolute inset-0 opacity-20" style={{
          background: "radial-gradient(circle at 30% 40%, rgba(181,140,74,.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(157,122,58,.3) 0%, transparent 40%)",
        }} />
        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 w-full">
          <div>
            <span className="text-3xl tracking-[0.2em] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>SAMAQU</span>
            <p className="text-[11px] tracking-[0.28em] uppercase mt-2" style={{ color: "rgba(212,197,181,.6)" }}>Customer Account</p>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl lg:text-5xl font-medium leading-tight mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
              Bergabung<br />dengan <em style={{ color: "#d4a86a" }}>SAMAQU</em>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(212,197,181,.7)" }}>
              Buat akun untuk menyimpan ukuran, melacak pesanan, dan mendapatkan rekomendasi koleksi personal dari SAMAQU.
            </p>
          </div>
          <p className="text-xs" style={{ color: "rgba(212,197,181,.4)" }}>© 2026 SAMAQU. Semua hak cipta dilindungi.</p>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          {/* Mobile: brand header */}
          <div className="lg:hidden text-center mb-10">
            <span className="text-3xl tracking-[0.2em] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>SAMAQU</span>
            <p className="text-[11px] tracking-[0.28em] uppercase mt-2" style={{ color: "var(--text-muted)" }}>Customer Account</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-medium mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Buat Akun</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Daftar untuk pengalaman belanja yang lebih personal</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--espresso)" }}>Nama Lengkap</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmad Rasyid"
                  className="w-full rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--espresso)" }}>Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--espresso)" }}>Nomor WhatsApp</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="0812xxxx"
                  className="w-full rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--espresso)" }}>Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none transition-all focus:ring-2"
                  style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties}
                  required
                  minLength={6}
                />
              </div>
            </div>
            {error && (
              <p className="text-[13px]" style={{ color: "#e74c3c" }}>{error}</p>
            )}
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: "var(--espresso)", boxShadow: "0 4px 14px -4px rgba(45,33,27,.4)" }}>
              {loading ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
              Buat Akun
            </button>
          </form>

          <p className="mt-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Sudah punya akun?{" "}
            <Link href="/akun/login" className="font-semibold" style={{ color: "var(--gold)" }}>Masuk</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
