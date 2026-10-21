"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/affiliate/icons";
import { Field, useToast } from "@/components/affiliate/ui";

/**
 * Pendaftaran akun affiliate.
 * Data dikirim ke /api/affiliate/register (server membuat akun auth + profil
 * affiliate berstatus "menunggu" sampai disetujui admin).
 */
export default function AffiliateRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [tos, setTos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  const submit = async () => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 3) next.name = "Nama lengkap minimal 3 karakter.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Format email tidak valid.";
    if (!/^0\d{8,13}$/.test(phone.replace(/\D/g, ""))) {
      next.phone = "Nomor telepon harus diawali 0 dan berisi 9–14 digit.";
    }
    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      next.pw = "Minimal 8 karakter, kombinasi huruf dan angka.";
    }
    if (confirm !== password) next.cf = "Konfirmasi tidak sama dengan kata sandi baru.";
    if (!tos) next.tos = "Kamu harus menyetujui ketentuan.";

    setErr(next);
    if (Object.keys(next).length) {
      toast("Periksa kembali formulir pendaftaran", "err");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          tos,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ form: json.error || "Gagal membuat akun." });
        toast(json.error || "Gagal membuat akun", "err");
        return;
      }

      toast("Pendaftaran berhasil, menunggu persetujuan admin.");
      router.push("/affiliate/login");
    } catch {
      setErr({ form: "Gagal terhubung ke server." });
      toast("Gagal terhubung ke server", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="side">
        <img src="/bio/koko.png" alt="Koleksi SAMAQU" />
        <div className="cap">
          <div className="small b" style={{ color: "var(--af-pri)", letterSpacing: ".12em" }}>
            SAMAQU AFFILIATE CENTER
          </div>
          <div className="b dark" style={{ fontSize: 20, marginTop: 6, lineHeight: 1.35 }}>
            Jadilah affiliate resmi SAMAQU dan dapatkan komisi dari setiap penjualan.
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

          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>Daftar Affiliate</h1>
          <p className="muted" style={{ margin: "4px 0 20px" }}>
            Pendaftaran dikirim ke tim SAMAQU dan diverifikasi sebelum akun aktif.
          </p>

          {err.form ? (
            <div className="note" style={{ marginBottom: 14 }}>
              <Icon name="info" className="sm" />
              <span>{err.form}</span>
            </div>
          ) : null}

          <Field label="Nama Lengkap" error={err.name}>
            <input
              className={`inp ${err.name ? "e" : ""}`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label="Email" error={err.email}>
            <input
              className={`inp ${err.email ? "e" : ""}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
            />
          </Field>

          <Field label="Nomor Telepon" error={err.phone}>
            <input
              className={`inp ${err.phone ? "e" : ""}`}
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <div className="grid g2" style={{ gap: "0 12px" }}>
            <Field label="Kata Sandi" error={err.pw}>
              <div className="pwd">
                <input
                  className={`inp ${err.pw ? "e" : ""}`}
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label="Tampilkan kata sandi">
                  <Icon name={show ? "eyeoff" : "eye"} className="sm" />
                </button>
              </div>
            </Field>

            <Field label="Konfirmasi" error={err.cf}>
              <input
                className={`inp ${err.cf ? "e" : ""}`}
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          </div>

          <label className="row small" style={{ alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
            <input
              type="checkbox"
              className="chk"
              checked={tos}
              onChange={(e) => setTos(e.target.checked)}
            />
            <span className="muted">
              Saya menyetujui Ketentuan Program Affiliate dan Kebijakan Privasi SAMAQU.
            </span>
          </label>
          {err.tos ? <div className="fe">{err.tos}</div> : null}

          <button className="btn p w mt" onClick={submit} disabled={busy} type="button">
            {busy ? "Mengirim…" : "Daftar"}
          </button>

          <p className="small muted" style={{ textAlign: "center", marginTop: 18 }}>
            Sudah punya akun?{" "}
            <Link href="/affiliate/login" style={{ color: "var(--af-pri)", fontWeight: 700 }}>
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
