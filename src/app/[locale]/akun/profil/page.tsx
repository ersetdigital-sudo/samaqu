"use client";

import { useEffect, useState } from "react";
import { Edit, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AkunHeader } from "@/components/akun/AkunShell";

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

type Profil = { name: string; whatsapp: string; dd: string; mm: string; yyyy: string };

const KOSONG: Profil = { name: "", whatsapp: "", dd: "", mm: "", yyyy: "" };

/** Nilai yang tersimpan ditampilkan sebagai teks; input hanya muncul di mode Edit. */
function Baris({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1">{label}</span>
      <p className="text-sm md:text-base font-semibold" style={{ color: value ? "#0f3d33" : "#9aa5a1" }}>
        {value || "Belum diisi"}
      </p>
      {hint && <span className="block text-[11px] text-[#9aa5a1] mt-1">{hint}</span>}
    </div>
  );
}

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<Profil>(KOSONG);
  // Nilai terakhir yang tersimpan — sumber tampilan read-only & tujuan tombol Batal.
  const [saved, setSaved] = useState<Profil>(KOSONG);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      const next: Profil = { ...KOSONG, name: c.name || "", whatsapp: c.whatsapp || "" };
      const birth = (c as { birth_date?: string }).birth_date;
      if (birth) {
        const d = new Date(birth);
        if (!isNaN(d.getTime())) {
          next.dd = String(d.getDate());
          next.mm = String(d.getMonth() + 1);
          next.yyyy = String(d.getFullYear());
        }
      }
      setForm(next);
      setSaved(next);
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || "");
      setLoading(false);
    }
    init();
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3) e.name = "Nama wajib diisi, minimal 3 karakter";
    if (form.dd && form.mm && form.yyyy) {
      const d = Number(form.dd), m = Number(form.mm), y = Number(form.yyyy);
      const test = new Date(y, m - 1, d);
      if (test.getDate() !== d || test.getMonth() !== m - 1) e.birth = "Tanggal lahir tidak valid";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function batal() {
    setForm(saved);
    setErrors({});
    setEditing(false);
  }

  async function simpan() {
    if (!validate()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload: Record<string, unknown> = { name: form.name.trim(), whatsapp: form.whatsapp.trim() || null };
    if (form.dd && form.mm && form.yyyy) payload.birth_date = `${form.yyyy}-${String(form.mm).padStart(2, "0")}-${String(form.dd).padStart(2, "0")}`;

    let { error } = await supabase.from("customers").update(payload).eq("id", user.id);
    let birthSkipped = false;
    // Kolom `birth_date` datang dari migration yang dijalankan manual di Supabase; selama
    // belum ada, PostgREST menolak seluruh update (400). Simpan sisanya dan beri tahu.
    if (error && payload.birth_date && /birth_date/i.test(error.message)) {
      delete payload.birth_date;
      birthSkipped = true;
      ({ error } = await supabase.from("customers").update(payload).eq("id", user.id));
    }
    setSaving(false);
    if (!error) {
      setSaved({ ...form, name: form.name.trim(), whatsapp: form.whatsapp.trim() });
      setEditing(false);
    }
    setToast(
      error
        ? "Gagal menyimpan perubahan."
        : birthSkipped
          ? "Perubahan tersimpan, tapi tanggal lahir belum bisa disimpan."
          : "Perubahan berhasil disimpan."
    );
    setTimeout(() => setToast(""), birthSkipped ? 4000 : 2400);
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);
  const savedBirth = saved.dd && saved.mm && saved.yyyy
    ? `${Number(saved.dd)} ${BULAN[Number(saved.mm) - 1]} ${saved.yyyy}`
    : "";

  const inputClass = "w-full rounded-2xl border border-[#dfd8ca] bg-white px-4 py-3.5 text-sm md:text-base font-semibold outline-none focus:border-[#0f3d33]";
  const selectClass = "rounded-2xl border border-[#dfd8ca] bg-white px-3 py-3.5 text-sm font-semibold outline-none";

  return (
    <>
      <AkunHeader title="Informasi Profil" back="/akun" />

      {loading ? (
        <div className="md:max-w-[600px] akun-card h-72 animate-pulse" />
      ) : (
        <div className="md:max-w-[600px] md:akun-card md:p-8">
          <div className="space-y-4 md:space-y-5">
            {editing ? (
              <>
                <label className="block">
                  <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Nama Lengkap</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
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
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="0812xxxxxxx"
                    className={inputClass}
                    style={{ color: "#0f3d33" }}
                  />
                </label>

                <div>
                  <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Tanggal Lahir</span>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <select value={form.dd} onChange={(e) => setForm({ ...form, dd: e.target.value })} className={selectClass} style={{ color: "#0f3d33" }}>
                      <option value="">Tgl</option>
                      {days.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={form.mm} onChange={(e) => setForm({ ...form, mm: e.target.value })} className={selectClass} style={{ color: "#0f3d33" }}>
                      <option value="">Bulan</option>
                      {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
                    </select>
                    <select value={form.yyyy} onChange={(e) => setForm({ ...form, yyyy: e.target.value })} className={selectClass} style={{ color: "#0f3d33" }}>
                      <option value="">Tahun</option>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {errors.birth && <span className="block text-[11px] text-red-600 mt-1.5">{errors.birth}</span>}
                </div>
              </>
            ) : (
              <>
                <Baris label="Nama Lengkap" value={saved.name} />
                <Baris label="Email" value={email} hint="Email tidak dapat diubah." />
                <Baris label="Nomor HP / WhatsApp" value={saved.whatsapp} />
                <Baris label="Tanggal Lahir" value={savedBirth} />
              </>
            )}
          </div>

          {editing ? (
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <button
                onClick={simpan}
                disabled={saving}
                className="akun-btn-green flex-1 min-w-[150px] py-4 rounded-full font-extrabold text-sm md:text-base inline-flex items-center justify-center gap-2 transition active:scale-[.99] disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
              <button
                onClick={batal}
                disabled={saving}
                className="flex-1 min-w-[100px] py-4 rounded-full font-extrabold text-sm md:text-base border border-[#dfd8ca] bg-white transition active:scale-[.99] disabled:opacity-50"
                style={{ color: "#0f3d33" }}
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="mt-7 w-full py-4 rounded-full font-extrabold text-sm md:text-base border border-[#dfd8ca] bg-white inline-flex items-center justify-center gap-2 transition active:scale-[.99]"
              style={{ color: "#0f3d33" }}
            >
              <Edit size={15} strokeWidth={2} />
              Edit
            </button>
          )}
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
