"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/affiliate/icons";
import { Field } from "@/components/affiliate/ui";
import { supabaseAffiliate as supabase } from "@/lib/supabase-affiliate";

/**
 * Halaman masuk portal Affiliate.
 * Tampilan mengikuti mockup (dua kolom: foto produk + formulir).
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
    <div className="auth">
      <div className="side">
        <img src="/bio/thobe.png" alt="Koleksi SAMAQU" />
        <div className="cap">
          <div className="small b" style={{ color: "var(--af-pri)", letterSpacing: ".12em" }}>
            SAMAQU AFFILIATE CENTER
          </div>
          <div className="b dark" style={{ fontSize: 20, marginTop: 6, lineHeight: 1.35 }}>
            Promosikan fashion SAMAQU, pantau komisi kamu dalam satu tempat.
          </div>
        </div>
      </div>

      <div className="frm">
        <div>
          <div className="brand" style={{ padding: "0 0 26px" }}>
            <div className="logo">S</div>
            <div>
              <b>SAMAQU</b>
              <small>AFFILIATE CENTER</small>
            </div>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>Masuk ke akun mitra</h1>
          <p className="muted" style={{ margin: "4px 0 22px" }}>
            Gunakan akun yang kamu daftarkan untuk masuk ke portal affiliate.
          </p>

          {err.form ? (
            <div className="note" style={{ marginBottom: 14 }}>
              <Icon name="info" className="sm" />
              <span>{err.form}</span>
            </div>
          ) : null}

          <Field label="Email" error={err.email}>
            <input
              className={`inp ${err.email ? "e" : ""}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
            />
          </Field>

          <Field label="Kata Sandi" error={err.pw}>
            <div className="pwd">
              <input
                className={`inp ${err.pw ? "e" : ""}`}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label="Tampilkan kata sandi">
                <Icon name={show ? "eyeoff" : "eye"} className="sm" />
              </button>
            </div>
          </Field>

          <button
            className="btn p w"
            onClick={submit}
            disabled={busy}
            type="button"
            style={{ marginTop: 6 }}
          >
            {busy ? "Memprosesâ€¦" : "Masuk"}
          </button>

          <p className="small muted" style={{ textAlign: "center", marginTop: 20 }}>
            Belum menjadi mitra?{" "}
            <Link href="/affiliate/daftar" style={{ color: "var(--af-pri)", fontWeight: 700 }}>
              Daftar Mitra
            </Link>
          </p>

          <div className="note i mt">
            <Icon name="info" className="sm" />
            <span>
              Akun affiliate menunggu persetujuan admin sebelum fitur promosi bisa dipakai.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
