"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/affiliate/AuthLayout";
import { Icon } from "@/components/affiliate/icons";
import { supabaseAffiliate as supabase } from "@/lib/supabase-affiliate";

/**
 * Halaman masuk portal affiliate — wireframe "Dark Slanted Auth" (tanpa foto produk).
 */
export default function AffiliateLoginPage() {
  const router = useRouter();
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

  return (
    <AuthLayout
      title="Masuk ke akun affiliate"
      subtitle="Selamat datang di SAMAQU Affiliate Center"
      navLink={{ href: "/affiliate/daftar", label: "Daftar" }}
      navCta={{ href: "/affiliate/daftar", label: "Jadi Affiliate" }}
      footer={
        <div className="aw-foot">
          <p>
            Belum menjadi affiliate?{" "}
            <Link href="/affiliate/daftar">Daftar Affiliate</Link>
          </p>
        </div>
      }
    >
      {err.form ? (
        <div className="aw-note" style={{ marginTop: 0, marginBottom: 16 }}>
          <Icon name="info" className="sm" />
          <span>{err.form}</span>
        </div>
      ) : null}

      <div className="aw-field">
        <label className="aw-label" htmlFor="aw-email">
          Email
        </label>
        <input
          id="aw-email"
          className={`aw-input ${err.email ? "e" : ""}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          autoComplete="email"
        />
        {err.email ? <div className="aw-err">{err.email}</div> : null}
      </div>

      <div className="aw-field">
        <label className="aw-label" htmlFor="aw-password">
          Kata Sandi
        </label>
        <div className="aw-pwd">
          <input
            id="aw-password"
            className={`aw-input ${err.pw ? "e" : ""}`}
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{ paddingRight: 48 }}
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label="Tampilkan kata sandi">
            <Icon name={show ? "eyeoff" : "eye"} className="sm" />
          </button>
        </div>
        {err.pw ? <div className="aw-err">{err.pw}</div> : null}
      </div>

      <button className="aw-cta" onClick={submit} disabled={busy} type="button">
        {busy ? "Memproses…" : "Masuk"}
      </button>

      <div className="aw-note">
        <Icon name="info" className="sm" />
        <span>Akun affiliate menunggu persetujuan admin sebelum fitur promosi bisa dipakai.</span>
      </div>
    </AuthLayout>
  );
}
