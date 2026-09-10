"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import AkunShell, { AkunHeader } from "@/components/akun/AkunShell";

const PROVINCES = [
  "ACEH","SUMATERA UTARA","SUMATERA BARAT","RIAU","JAMBI","SUMATERA SELATAN","BENGKULU","LAMPUNG",
  "KEPULAUAN BANGKA BELITUNG","KEPULAUAN RIAU","DKI JAKARTA","JAWA BARAT","JAWA TENGAH","DI YOGYAKARTA",
  "JAWA TIMUR","BANTEN","BALI","NUSA TENGGARA BARAT","NUSA TENGGARA TIMUR","KALIMANTAN BARAT",
  "KALIMANTAN TENGAH","KALIMANTAN SELATAN","KALIMANTAN TIMUR","KALIMANTAN UTARA","SULAWESI UTARA",
  "SULAWESI TENGAH","SULAWESI SELATAN","SULAWESI TENGGARA","GORONTALO","MALUKU","MALUKU UTARA",
  "PAPUA BARAT","PAPUA","SULAWESI BARAT",
];

const EMPTY = { label: "Rumah", recipient_name: "", phone: "", address: "", province: "", city: "", kecamatan: "", postal_code: "", is_default: false };

export default function AlamatBaruPage() {
  const params = useParams();
  const id = params.id ? String(params.id) : null;
  const isEdit = Boolean(id) && id !== "baru";
  const router = useRouter();
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function init() {
      if (!isEdit) return;
      const c = await getCurrentCustomer();
      if (!c) return;
      const { data } = await supabase.from("saved_addresses").select("*").eq("id", id).single();
      if (data) {
        setForm({
          label: data.label || "Alamat",
          recipient_name: data.recipient_name || "",
          phone: data.phone || "",
          address: data.address || "",
          province: data.province || "",
          city: data.city || "",
          kecamatan: data.kecamatan || "",
          postal_code: data.postal_code || "",
          is_default: !!data.is_default,
        });
      }
      setLoading(false);
    }
    init();
  }, [id, isEdit]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.recipient_name.trim()) e.recipient_name = "Nama penerima wajib diisi";
    if (!form.phone.trim()) e.phone = "No. HP wajib diisi";
    if (!form.address.trim()) e.address = "Alamat lengkap wajib diisi";
    if (!form.province) e.province = "Provinsi wajib dipilih";
    if (!form.city.trim()) e.city = "Kota wajib diisi";
    if (!form.postal_code.trim()) e.postal_code = "Kode pos wajib diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function simpan() {
    if (!validate()) return;
    setSaving(true);
    const c = await getCurrentCustomer();
    if (!c) { setSaving(false); return; }

    if (form.is_default) {
      await supabase.from("saved_addresses").update({ is_default: false }).eq("customer_id", c.id);
    }
    const payload = { ...form, customer_id: c.id };
    if (isEdit) await supabase.from("saved_addresses").update(payload).eq("id", id);
    else await supabase.from("saved_addresses").insert(payload);

    setSaving(false);
    router.push(to("/akun/alamat"));
  }

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AkunShell>
      <AkunHeader title={isEdit ? "Ubah Alamat" : "Tambah Alamat"} back="/akun/alamat" />

      <div className="md:max-w-[600px] md:akun-card md:p-8">
        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl bg-[#f2efe8]" />
        ) : (
          <>
            <div>
              <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-2">Label Alamat</span>
              <div className="flex gap-2">
                {["Rumah", "Kantor", "Lainnya"].map((l) => {
                  const on = form.label === l;
                  return (
                    <button
                      key={l}
                      onClick={() => set("label", l)}
                      className={`px-4 py-2.5 rounded-full text-[13px] ${on ? "font-extrabold text-white" : "font-bold bg-white text-[#3c4b46] border border-[#dfd8ca]"}`}
                      style={on ? { background: "#0f3d33" } : undefined}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 md:space-y-5 mt-5">
              <label className="block">
                <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Nama Penerima</span>
                <input value={form.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} placeholder="Nama lengkap penerima"
                  className="w-full rounded-2xl border bg-white px-4 py-3.5 text-sm md:text-base font-semibold outline-none focus:border-[#0f3d33]"
                  style={{ borderColor: errors.recipient_name ? "#e74c3c" : "#dfd8ca", color: "#0f3d33" }} />
                {errors.recipient_name && <span className="block text-[11px] text-red-600 mt-1.5">{errors.recipient_name}</span>}
              </label>

              <label className="block">
                <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Nomor HP</span>
                <div className="flex items-center rounded-2xl border border-[#dfd8ca] bg-white overflow-hidden focus-within:border-[#0f3d33]">
                  <span className="px-4 py-3.5 text-sm md:text-base font-bold text-[#6c7a75] border-r border-[#eee7da]">+62</span>
                  <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="812 3344 9087"
                    className="flex-1 px-4 py-3.5 text-sm md:text-base font-semibold outline-none" style={{ color: "#0f3d33" }} />
                </div>
                {errors.phone && <span className="block text-[11px] text-red-600 mt-1.5">{errors.phone}</span>}
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Provinsi</span>
                  <select value={form.province} onChange={(e) => set("province", e.target.value)}
                    className="w-full rounded-2xl border bg-white px-3.5 py-3.5 text-sm font-semibold outline-none focus:border-[#0f3d33]"
                    style={{ borderColor: errors.province ? "#e74c3c" : "#dfd8ca", color: "#0f3d33" }}>
                    <option value="">Pilih provinsi</option>
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Kota / Kabupaten</span>
                  <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Sleman"
                    className="w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#0f3d33]"
                    style={{ borderColor: errors.city ? "#e74c3c" : "#dfd8ca", color: "#0f3d33" }} />
                </label>
                <label className="block">
                  <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Kecamatan</span>
                  <input value={form.kecamatan} onChange={(e) => set("kecamatan", e.target.value)} placeholder="Ngaglik"
                    className="w-full rounded-2xl border border-[#dfd8ca] bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#0f3d33]" style={{ color: "#0f3d33" }} />
                </label>
                <label className="block">
                  <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Kode Pos</span>
                  <input inputMode="numeric" value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} placeholder="55581"
                    className="w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#0f3d33]"
                    style={{ borderColor: errors.postal_code ? "#e74c3c" : "#dfd8ca", color: "#0f3d33" }} />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs md:text-sm font-bold text-[#6c7a75] mb-1.5">Alamat Lengkap</span>
                <textarea rows={3} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
                  className="w-full rounded-2xl border bg-white px-4 py-3.5 text-sm md:text-base font-semibold outline-none focus:border-[#0f3d33] resize-none"
                  style={{ borderColor: errors.address ? "#e74c3c" : "#dfd8ca", color: "#0f3d33" }} />
                {errors.address && <span className="block text-[11px] text-red-600 mt-1.5">{errors.address}</span>}
              </label>

              <div className="flex items-center gap-3 rounded-2xl bg-white border border-[#eee7da] px-4 py-3.5 md:bg-[#faf8f4]">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-sm" style={{ color: "#0f3d33" }}>Jadikan Alamat Utama</span>
                  <span className="block text-[11px] md:text-xs text-[#6c7a75] mt-0.5">Dipakai otomatis saat checkout.</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_default}
                  onClick={() => set("is_default", !form.is_default)}
                  className="relative w-12 h-7 shrink-0 rounded-full transition"
                  style={{ background: form.is_default ? "#0f3d33" : "#dfd8ca" }}
                >
                  <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: form.is_default ? "translateX(20px)" : "none" }} />
                </button>
              </div>
            </div>

            <button onClick={simpan} disabled={saving} className="akun-btn-green w-full mt-7 py-4 rounded-full font-extrabold text-sm md:text-base transition active:scale-[.99] disabled:opacity-60">
              {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Simpan Alamat"}
            </button>
          </>
        )}
      </div>
    </AkunShell>
  );
}