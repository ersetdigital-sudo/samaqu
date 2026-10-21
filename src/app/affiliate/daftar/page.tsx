"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/affiliate/AuthLayout";
import { Icon } from "@/components/affiliate/icons";
import { useToast } from "@/components/affiliate/ui";

/**
 * Pendaftaran akun affiliate — wireframe "Dark Slanted Auth" (tanpa foto produk).
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
    <AuthLayout
      title="Daftar Affiliate"
      subtitle="Jadilah affiliate resmi SAMAQU dan dapatkan komisi dari setiap penjualan"
      navLink={{ href: "/affiliate/login", label: "Masuk" }}
      navCta={{ href: "/affiliate/login", label: "Cek Status" }}
      footer={
        <div className="aw-foot">
          <p>
            Sudah punya akun?{" "}
            <Link href="/affiliate/login">Masuk</Link>
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
        <label className="aw-label" htmlFor="aw-name">
          Nama Lengkap
        </label>
        <input
          id="aw-name"
          className={`aw-input ${err.name ? "e" : ""}`}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nama sesuai identitas"
        />
        {err.name ? <div className="aw-err">{err.name}</div> : null}
      </div>

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
        <label className="aw-label" htmlFor="aw-phone">
          Nomor Telepon
        </label>
        <input
          id="aw-phone"
          className={`aw-input ${err.phone ? "e" : ""}`}
          inputMode="tel"
          placeholder="08xxxxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
        {err.phone ? <div className="aw-err">{err.phone}</div> : null}
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
            autoComplete="new-password"
            style={{ paddingRight: 48 }}
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label="Tampilkan kata sandi">
            <Icon name={show ? "eyeoff" : "eye"} className="sm" />
          </button>
        </div>
        {err.pw ? <div className="aw-err">{err.pw}</div> : null}
      </div>

      <div className="aw-field">
        <label className="aw-label" htmlFor="aw-confirm">
          Konfirmasi Kata Sandi
        </label>
        <input
          id="aw-confirm"
          className={`aw-input ${err.cf ? "e" : ""}`}
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        {err.cf ? <div className="aw-err">{err.cf}</div> : null}
      </div>

      <label className="aw-chk">
        <input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} />
        <span>Saya menyetujui Ketentuan Program Affiliate dan Kebijakan Privasi SAMAQU.</span>
      </label>
      {err.tos ? <div className="aw-err" style={{ marginTop: -10, marginBottom: 12 }}>{err.tos}</div> : null}

      <button className="aw-cta" onClick={submit} disabled={busy} type="button">
        {busy ? "Mengirim…" : "Daftar"}
      </button>

      <div className="aw-note">
        <Icon name="info" className="sm" />
        <span>Pendaftaran diverifikasi tim SAMAQU sebelum akun aktif dan bisa membuat tautan.</span>
      </div>
    </AuthLayout>
  );
}
