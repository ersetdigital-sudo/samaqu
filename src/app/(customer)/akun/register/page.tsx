"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex" style={{ background: "var(--cream)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden" style={{ background: "var(--espresso)" }}>
        <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)", background: "linear-gradient(135deg, rgba(181,140,74,.15) 0%, rgba(45,33,27,.95) 50%, rgba(45,33,27,1) 100%)" }} />
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 30% 40%, rgba(181,140,74,.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(157,122,58,.3) 0%, transparent 40%)" }} />
        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 w-full">
          <span className="text-3xl tracking-[0.2em] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>SAMAQU</span>
          <div className="max-w-md">
            <h1 className="text-4xl lg:text-5xl font-medium leading-tight mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>Buat Akun Baru</h1>
            <p className="text-sm" style={{ color: "rgba(212,197,181,.6)" }}>Simpan ukuran, lacak pesanan, dan dapatkan rekomendasi koleksi personal.</p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <span className="text-2xl tracking-[0.15em] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>SAMAQU</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-medium mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Daftar</h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Buat akun untuk pengalaman berbelanja yang lebih personal.</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Nama Lengkap</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Ahmad Rasyid" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="nama@email.com" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Nomor WhatsApp</label>
              <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="0812xxxx" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Minimal 6 karakter" />
            </div>
            {error && <p className="text-xs" style={{ color: "#e74c3c" }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--espresso)" }}>
              {loading ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}Buat Akun
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
            Sudah punya akun? <Link href="/akun/login" className="font-medium" style={{ color: "var(--gold)" }}>Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
