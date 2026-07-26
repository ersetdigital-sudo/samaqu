"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2, Ticket, Calendar, Hash, Percent, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/AdminToast";
import ConfirmModal from "@/components/ConfirmModal";

interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_discount: number;
  usage_limit: number;
  used_count: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const emptyVoucher: Omit<Voucher, "id"> = {
  code: "",
  discount_type: "percentage",
  discount_value: 0,
  min_purchase: 0,
  max_discount: 0,
  usage_limit: 0,
  used_count: 0,
  start_date: new Date().toISOString(),
  end_date: "",
  is_active: true,
};

export default function VoucherPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState(emptyVoucher);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} });
  const toast = useToast();

  useEffect(() => {
    supabase.from("vouchers").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setVouchers(data);
      setLoading(false);
    });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyVoucher, code: "", discount_value: 0, start_date: new Date().toISOString().split("T")[0], end_date: "" });
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(v: Voucher) {
    setEditing(v);
    setForm({
      code: v.code,
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      min_purchase: v.min_purchase,
      max_discount: v.max_discount,
      usage_limit: v.usage_limit,
      used_count: v.used_count,
      start_date: v.start_date?.split("T")[0] || "",
      end_date: v.end_date?.split("T")[0] || "",
      is_active: v.is_active,
    });
    setErrors({});
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Kode wajib diisi";
    else if (!/^[A-Za-z0-9_-]+$/.test(form.code)) e.code = "Kode hanya boleh huruf, angka, - dan _";
    if (form.discount_value <= 0) e.discount_value = "Nilai diskon harus lebih dari 0";
    if (form.discount_type === "percentage" && form.discount_value > 100) e.discount_value = "Persentase maksimal 100%";
    if (form.min_purchase < 0) e.min_purchase = "Minimal belanja tidak boleh negatif";
    if (form.max_discount < 0) e.max_discount = "Max diskon tidak boleh negatif";
    if (form.usage_limit < 0) e.usage_limit = "Limit tidak boleh negatif";
    if (!form.end_date) e.end_date = "Tanggal akhir wajib diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const code = form.code.trim().toUpperCase();
    const payload = { ...form, code };

    if (editing) {
      const { error } = await supabase.from("vouchers").update({
        code: payload.code, discount_type: payload.discount_type, discount_value: payload.discount_value,
        min_purchase: payload.min_purchase, max_discount: payload.max_discount,
        usage_limit: payload.usage_limit, start_date: payload.start_date, end_date: payload.end_date, is_active: payload.is_active,
      }).eq("id", editing.id);
      if (error) {
        if (error.code === "23505") { setErrors({ code: "Kode voucher sudah digunakan" }); setSaving(false); return; }
        toast.showToast("error", "Gagal menyimpan"); setSaving(false); return;
      }
      setVouchers(vouchers.map((v) => v.id === editing.id ? { ...v, ...payload, id: editing.id } : v));
      toast.showToast("success", "Voucher berhasil diperbarui");
    } else {
      const { data, error } = await supabase.from("vouchers").insert({
        code: payload.code, discount_type: payload.discount_type, discount_value: payload.discount_value,
        min_purchase: payload.min_purchase, max_discount: payload.max_discount,
        usage_limit: payload.usage_limit, start_date: payload.start_date, end_date: payload.end_date, is_active: payload.is_active,
      }).select().single();
      if (error) {
        if (error.code === "23505") { setErrors({ code: "Kode voucher sudah digunakan" }); setSaving(false); return; }
        toast.showToast("error", "Gagal menyimpan"); setSaving(false); return;
      }
      setVouchers([data, ...vouchers]);
      toast.showToast("success", "Voucher berhasil ditambahkan");
    }
    setModalOpen(false);
    setSaving(false);
  }

  function handleDelete(v: Voucher) {
    setConfirmModal({
      open: true,
      onConfirm: async () => {
        await supabase.from("vouchers").delete().eq("id", v.id);
        setVouchers(vouchers.filter((x) => x.id !== v.id));
        toast.showToast("success", "Voucher berhasil dihapus");
        setConfirmModal({ open: false, onConfirm: () => {} });
      },
    });
  }

  async function toggleActive(v: Voucher) {
    const newVal = !v.is_active;
    await supabase.from("vouchers").update({ is_active: newVal }).eq("id", v.id);
    setVouchers(vouchers.map((x) => x.id === v.id ? { ...x, is_active: newVal } : x));
  }

  function formatDiscount(v: Voucher) {
    if (v.discount_type === "percentage") return `${v.discount_value}%`;
    return `Rp ${v.discount_value.toLocaleString("id-ID")}`;
  }

  function formatDate(d: string) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <AdminShell>
      <section className="p-5 lg:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--espresso)" }}>Voucher / Kode Promo</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Kelola kode promo untuk pelanggan</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
            <Plus size={18} /> Tambah Voucher
          </button>
        </div>

        {loading ? (
          <div className="card p-12 flex justify-center"><Loader2 size={24} className="animate-spin" style={{ color: "var(--gold)" }} /></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                    <th className="font-medium px-5 py-3 text-left">Kode</th>
                    <th className="font-medium px-5 py-3 text-left">Tipe</th>
                    <th className="font-medium px-5 py-3 text-left">Diskon</th>
                    <th className="font-medium px-5 py-3 text-left">Min. Belanja</th>
                    <th className="font-medium px-5 py-3 text-left">Berlaku Hingga</th>
                    <th className="font-medium px-5 py-3 text-left">Terpakai</th>
                    <th className="font-medium px-5 py-3 text-left">Status</th>
                    <th className="font-medium px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.id} style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: "var(--espresso)" }}>{v.code}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: v.discount_type === "percentage" ? "#f0e7d8" : "#e7ecdf", color: v.discount_type === "percentage" ? "#8a6f42" : "#5b6b45" }}>
                          {v.discount_type === "percentage" ? <Percent size={11} /> : <DollarSign size={11} />}
                          {v.discount_type === "percentage" ? "Persen" : "Fixed"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold">{formatDiscount(v)}</td>
                      <td className="px-5 py-3.5">{v.min_purchase > 0 ? `Rp ${v.min_purchase.toLocaleString("id-ID")}` : "-"}</td>
                      <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>{formatDate(v.end_date)}</td>
                      <td className="px-5 py-3.5">{v.used_count}{v.usage_limit > 0 ? ` / ${v.usage_limit}` : ""}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => toggleActive(v)} className="text-xs px-2 py-1 rounded font-medium" style={{ background: v.is_active ? "#e7ecdf" : "#f0ebe5", color: v.is_active ? "#5b6b45" : "#6b5d50" }}>
                          {v.is_active ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg" style={{ color: "var(--gold)", border: "1px solid rgba(64,50,37,.15)" }}><Edit size={14} /></button>
                          <button onClick={() => handleDelete(v)} className="p-1.5 rounded-lg" style={{ color: "#e74c3c", border: "1px solid rgba(231,76,60,.2)" }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vouchers.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-12 text-center" style={{ color: "var(--text-muted)" }}>Belum ada voucher</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(42,33,27,.4)", backdropFilter: "blur(4px)" }} onClick={() => setModalOpen(false)}>
            <div className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: "var(--cream)", boxShadow: "0 25px 60px -12px rgba(42,33,27,.5)" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>{editing ? "Edit Voucher" : "Tambah Voucher"}</h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}><X size={18} /></button>
              </div>

              <div className="space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Kode Voucher *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: errors.code ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="CONTOHPromo" />
                  {errors.code && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.code}</p>}
                </div>

                {/* Type + Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Tipe Diskon</label>
                    <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}>
                      <option value="percentage">Persen (%)</option>
                      <option value="fixed">Nominal (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Nilai Diskon *</label>
                    <input type="number" value={form.discount_value || ""} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: errors.discount_value ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder={form.discount_type === "percentage" ? "10" : "50000"} />
                    {errors.discount_value && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.discount_value}</p>}
                  </div>
                </div>

                {/* Min purchase + Max discount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Minimal Belanja (Rp)</label>
                    <input type="number" value={form.min_purchase || ""} onChange={(e) => setForm({ ...form, min_purchase: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="0" />
                  </div>
                  {form.discount_type === "percentage" && (
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Max Diskon (Rp)</label>
                      <input type="number" value={form.max_discount || ""} onChange={(e) => setForm({ ...form, max_discount: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="0 = tanpa batas" />
                    </div>
                  )}
                </div>

                {/* Usage limit */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Batas Penggunaan (0 = tanpa batas)</label>
                  <input type="number" value={form.usage_limit || ""} onChange={(e) => setForm({ ...form, usage_limit: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="0" />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Tanggal Mulai</label>
                    <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Tanggal Berakhir *</label>
                    <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: errors.end_date ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    {errors.end_date && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.end_date}</p>}
                  </div>
                </div>

                {/* Active */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                  <span className="text-sm" style={{ color: "var(--espresso)" }}>Aktif</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--espresso)" }}>Batal</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
                  {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                  {editing ? "Simpan" : "Tambah"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal open={confirmModal.open} title="Hapus Voucher?" message="Voucher yang dihapus tidak bisa dikembalikan." onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ open: false, onConfirm: () => {} })} />
      </section>
    </AdminShell>
  );
}
