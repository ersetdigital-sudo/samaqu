"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/affiliate/AuthLayout";
import { useToast } from "@/components/affiliate/ui";
import { supabaseAffiliate as supabase } from "@/lib/supabase-affiliate";
import { portalBaseFor, portalPath } from "@/lib/affiliate/site";

/**
 * Halaman masuk portal affiliate — wireframe "Dark Slanted Auth" (1:1).
 */
const INPUT =
  "input-field w-full px-5 py-3.5 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-400 border";
const INPUT_BORDER = { borderColor: "#e5e7eb" };
const INPUT_ERROR = { borderColor: "#f87171" };

export default function AffiliateLoginPage() {
  const router = useRouter();
  // Prefix path portal: "" di affiliate.samaqu.id, "/affiliate" di domain utama.
  const [base, setBase] = useState("/affiliate");
  useEffect(() => {
    setBase(portalBaseFor(window.location.hostname));
  }, []);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<{ email?: string; pw?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next: typeof err = {};
    if (!email.trim()) next.email = "Email wajib diisi.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Format email tidak valid.";
    if (!password) next.pw = "Kata sandi wajib diisi.";

    setErr(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (error) {
      const msg = error.message || "";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credential")) {
        setErr({ pw: "Email atau kata sandi salah." });
      } else if (msg.toLowerCase().includes("confirm") || msg.toLowerCase().includes("verified")) {
        setErr({ form: "Email belum diverifikasi. Cek inbox email Anda untuk link verifikasi." });
      } else {
        setErr({ form: msg });
      }
      return;
    }

    router.push("/affiliate");
    router.refresh();
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      setErr({ email: "Isi email dulu untuk kirim tautan reset kata sandi." });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/affiliate`,
    });
    if (error) {
      toast(error.message || "Gagal mengirim tautan reset.", "err");
      return;
    }
    toast("Tautan reset kata sandi dikirim ke email kamu.");
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/affiliate` },
    });
    if (error) {
      toast("Login dengan Google belum tersedia. Gunakan email & kata sandi.", "err");
    }
  };

  return (
    <AuthLayout
      title="Masuk ke akun affiliate"
      subtitle="Selamat datang di SAMAQU Affiliate Center"
      navLink={{ href: portalPath(base, "daftar"), label: "Daftar" }}
      navCta={{ href: portalPath(base, "daftar"), label: "Jadi Affiliate" }}
      footerLink={{
        text: "Belum menjadi affiliate?",
        link: portalPath(base, "daftar"),
        linkLabel: "Daftar Affiliate",
      }}
      onGoogle={loginWithGoogle}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {err.form ? (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-900">
            {err.form}
          </div>
        ) : null}

        <div>
          <input
            type="email"
            placeholder="Email"
            className={INPUT}
            style={err.email ? INPUT_ERROR : INPUT_BORDER}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {err.email ? <p className="mt-1 text-xs text-red-600">{err.email}</p> : null}
        </div>

        <div>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              placeholder="Password"
              className={`${INPUT} pr-12`}
              style={err.pw ? INPUT_ERROR : INPUT_BORDER}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <div className="text-right mt-2">
            <button
              type="button"
              onClick={forgotPassword}
              className="text-xs font-semibold hover:underline"
              style={{ color: "#eb4d4b" }}
            >
              Forgot password ?
            </button>
          </div>
          {err.pw ? <p className="mt-1 text-xs text-red-600">{err.pw}</p> : null}
        </div>

        <div className="flex items-center my-6 py-2">
          <div className="flex-grow border-t border-gray-200" />
          <span className="px-4 text-xs font-medium text-gray-400">or</span>
          <div className="flex-grow border-t border-gray-200" />
        </div>

        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full border border-gray-200 rounded-xl py-3.5 flex justify-center items-center gap-3 hover:bg-gray-50 transition text-sm font-semibold text-gray-600"
        >
          Login with Google
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </button>

        <button
          type="submit"
          disabled={busy}
          className="btn-red w-full rounded-xl py-3.5 mt-2 text-sm font-semibold disabled:opacity-60"
          style={{
            backgroundColor: "#eb4d4b",
            color: "white",
            boxShadow: "0 10px 15px -3px rgba(235,77,75,0.2)",
          }}
        >
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>
    </AuthLayout>
  );
}
