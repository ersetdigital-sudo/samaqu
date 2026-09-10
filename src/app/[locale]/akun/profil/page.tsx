"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AkunHeader } from "@/components/akun/AkunShell";

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      setName(c.name || "");
      setWhatsapp(c.whatsapp || "");
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || "");
      const birth = (c as { birth_date?: string }).birth_date;
      if (birth) {
        const d = new Date(birth);
        if (!isNaN(d.getTime())) {
          setDd(String(d.getDate()));
          setMm(String(d.getMonth() + 1));
          setYyyy(String(d.getFullYear()));
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 3) e.name = "Nama wajib diisi, minimal 3 karakter";
    if (dd && mm && yyyy) {
      const d = Number(dd), m = Number(mm), y = Number(yyyy);
      const test = new Date(y, m - 1, d);
      if (test.getDate() !== d || test.getMonth() !== m - 1) e.birth = "Tanggal lahir tidak valid";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function simpan() {
    if (!validate()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload: Record<string, unknown> = { name: name.trim(), whatsapp: whatsapp.trim() || null };
    if (dd && mm && yyyy) payload.birth_date = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const { error } = await supabase.from("customers").update(payload).eq("id", user.id);
    setSaving(false);
    setToast(error ? "Gagal menyimpan perubahan." : "Perubahan berhasil disimpan.");
    setTimeout(() => setToast(""), 2400);
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      <AkunHeader title="Informasi Profil" back="/akun" />

      {loading ? (
        <div className="md:max-w-[600px] akun-card h-72 animate-pulse" />
      ) : (
        <div className="md:max-w-[600px] md:akun-card md:p-8">
          <div className="space-y-4 md:space-y-5">
            <label className="block">
              <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Nama Lengkap</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-[#dfd8ca] bg-white px-4 py-3.5 text-sm md:text-base font-semibold outline-none focus:border-[#0f3d33]"
                style={{ color: "#0f3d33" }}
              />
              {errors.name && <span className="block text-[11px] text-red-600 mt-1.5">{errors.name}</span>}
            </label>

            <label className="block">
              <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Email</span>
              <input
                type="text"
                value={email}
                readOnly
                className="w-full rounded-2xl border border-[#e5e0d6] bg-[#f2efe8] px-4 py-3.5 text-sm md:text-base font-semibold text-[#9aa5a1] cursor-not-allowed"
              />
              <span className="block text-[11px] text-[#9aa5a1] mt-1.5">Email tidak dapat diubah.</span>
            </label>

            <label className="block">
              <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Nomor HP / WhatsApp</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="0812xxxxxxx"
                className="w-full rounded-2xl border border-[#dfd8ca] bg-white px-4 py-3.5 text-sm md:text-base font-semibold outline-none focus:border-[#0f3d33]"
                style={{ color: "#0f3d33" }}
              />
            </label>

            <div>
              <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Tanggal Lahir</span>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <select value={dd} onChange={(e) => setDd(e.target.value)} className="rounded-2xl border border-[#dfd8ca] bg-white px-3 py-3.5 text-sm font-semibold outline-none" style={{ color: "#0f3d33" }}>
                  <option value="">Tgl</option>
                  {days.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={mm} onChange={(e) => setMm(e.target.value)} className="rounded-2xl border border-[#dfd8ca] bg-white px-3 py-3.5 text-sm font-semibold outline-none" style={{ color: "#0f3d33" }}>
                  <option value="">Bulan</option>
                  {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
                </select>
                <select value={yyyy} onChange={(e) => setYyyy(e.target.value)} className="rounded-2xl border border-[#dfd8ca] bg-white px-3 py-3.5 text-sm font-semibold outline-none" style={{ color: "#0f3d33" }}>
                  <option value="">Tahun</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {errors.birth && <span className="block text-[11px] text-red-600 mt-1.5">{errors.birth}</span>}
            </div>
          </div>

          <button onClick={simpan} disabled={saving} className="akun-btn-green w-full mt-7 py-4 rounded-full font-extrabold text-sm md:text-base transition active:scale-[.99] disabled:opacity-60">
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-50 rounded-full px-5 py-3 text-sm font-bold text-white shadow-lg" style={{ background: "#0f3d33" }}>
          {toast}
        </div>
      )}
    </>
  );
}