"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/components/AdminToast";
import { PAYMENT_ICON_OPTIONS, PaymentIcon } from "@/lib/payment-icons";
import {
  PAYMENT_METHOD_TYPES,
  defaultMethodLabel,
  normalizeMethodType,
  type PaymentMethodRow,
  type PaymentMethodType,
} from "@/lib/payment-methods";
import { usePaymentMethodName } from "@/lib/use-payment-methods";

const inputStyle = { border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" };
const labelStyle = { color: "var(--text-muted)" };

/** Nama metode dari `orders.payment_method` (uuid baru / slug lama). */
export function PaymentMethodValue({ value, className, style }: { value?: string | null; className?: string; style?: React.CSSProperties }) {
  const { name, loading } = usePaymentMethodName(value);
  return (
    <span className={className} style={style}>
      {loading ? "…" : name || value || "-"}
    </span>
  );
}

export default function PaymentMethodsManager() {
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [originalMethods, setOriginalMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, Record<string, boolean>>>({});
  const toast = useToast();

  useEffect(() => {
    supabase.from("payment_methods").select("*").order("display_order").then(({ data }) => {
      if (data) {
        setMethods(data as PaymentMethodRow[]);
        setOriginalMethods(JSON.parse(JSON.stringify(data)));
      }
      setLoading(false);
    });
  }, []);

  function isNew(m: PaymentMethodRow) {
    return !originalMethods.find((o) => o.id === m.id);
  }

  function isDirty(m: PaymentMethodRow) {
    const orig = originalMethods.find((o) => o.id === m.id);
    if (!orig) return true;
    const fields: (keyof PaymentMethodRow)[] = ["label", "method_type", "icon", "bank_name", "account_name", "account_number", "account_info", "qr_image_url", "instructions"];
    return fields.some((f) => (orig[f] ?? null) !== (m[f] ?? null));
  }

  function updateField(id: string, field: keyof PaymentMethodRow, value: string) {
    setMethods((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const next: PaymentMethodRow = { ...m, [field]: value };
        // ganti jenis metode → ikon ikut menyesuaikan (kecuali admin sudah pilih ikon lain)
        if (field === "method_type") next.icon = value;
        if (field === "method_type" && !String(m.label || "").trim()) next.label = defaultMethodLabel(value as PaymentMethodType);
        return next;
      })
    );
    setErrors((prev) => ({ ...prev, [id]: { ...prev[id], [field]: false } }));
  }

  function addMethod() {
    const tempId = "new-" + Date.now();
    const type: PaymentMethodType = "bank";
    setMethods((prev) => [
      ...prev,
      {
        id: tempId,
        label: "",
        method_type: type,
        icon: type,
        bank_name: "",
        account_name: "",
        account_number: "",
        account_info: "",
        qr_image_url: "",
        instructions: "",
        is_active: true,
        display_order: prev.length,
      },
    ]);
  }

  function cancelNew(id: string) {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  }

  async function uploadQrImage(id: string, file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { toast.showToast("error", "Format file tidak didukung (JPG/PNG/WebP)"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.showToast("error", "Ukuran file maksimal 5MB"); return; }
    try {
      const url = await uploadToCloudinary(file);
      if (url) {
        setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, qr_image_url: url } : m)));
        const isSaved = !isNew({ id } as PaymentMethodRow);
        if (isSaved) await supabase.from("payment_methods").update({ qr_image_url: url }).eq("id", id);
        toast.showToast("success", "QR Code berhasil diupload");
      }
    } catch {
      toast.showToast("error", "Gagal upload gambar");
    }
  }

  async function saveMethod(method: PaymentMethodRow) {
    const type = normalizeMethodType(method.method_type);
    const e: Record<string, boolean> = {};
    if (!String(method.label || "").trim()) e.label = true;
    if (type === "bank") {
      if (!String(method.account_name || "").trim()) e.account_name = true;
      if (!String(method.account_number || "").trim()) e.account_number = true;
    }
    if (type === "ewallet" && !String(method.account_info || "").trim()) e.account_info = true;
    if (Object.keys(e).length > 0) {
      setErrors((prev) => ({ ...prev, [method.id]: e }));
      toast.showToast("error", "Lengkapi field yang wajib diisi");
      return;
    }

    setSavingId(method.id);
    const payload = {
      label: String(method.label || "").trim(),
      method_type: type,
      icon: method.icon || type,
      bank_name: method.bank_name || null,
      account_name: method.account_name || null,
      account_number: method.account_number || null,
      account_info: method.account_info || null,
      qr_image_url: method.qr_image_url || null,
      instructions: method.instructions || null,
    };

    if (isNew(method)) {
      const { data, error } = await supabase
        .from("payment_methods")
        .insert({ ...payload, is_active: method.is_active !== false, display_order: methods.indexOf(method) })
        .select()
        .single();
      if (error) {
        toast.showToast("error", "Gagal menyimpan metode pembayaran");
      } else if (data) {
        setMethods((prev) => prev.map((m) => (m.id === method.id ? (data as PaymentMethodRow) : m)));
        setOriginalMethods((prev) => [...prev, data as PaymentMethodRow]);
        toast.showToast("success", "Metode pembayaran ditambahkan");
      }
    } else {
      const { error } = await supabase.from("payment_methods").update(payload).eq("id", method.id);
      if (error) {
        toast.showToast("error", "Gagal menyimpan metode pembayaran");
      } else {
        setOriginalMethods((prev) => prev.map((o) => (o.id === method.id ? { ...o, ...method } : o)));
        toast.showToast("success", "Metode pembayaran disimpan");
      }
    }
    setSavingId(null);
  }

  async function toggleMethod(id: string, active: boolean) {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, is_active: active } : m)));
    await supabase.from("payment_methods").update({ is_active: active }).eq("id", id);
    setOriginalMethods((prev) => prev.map((o) => (o.id === id ? { ...o, is_active: active } : o)));
    toast.showToast("success", active ? "Metode diaktifkan" : "Metode dinonaktifkan");
  }

  async function deleteMethod(id: string) {
    if (!confirm("Hapus metode pembayaran ini?")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    setMethods((prev) => prev.filter((m) => m.id !== id));
    setOriginalMethods((prev) => prev.filter((m) => m.id !== id));
    toast.showToast("success", "Metode pembayaran dihapus");
  }

  if (loading) return <div className="card p-6"><Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="card p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Metode Pembayaran</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Tambah, urutkan, dan aktifkan metode pembayaran. Yang nonaktif otomatis tidak muncul di checkout.
          </p>
        </div>
        <button onClick={addMethod} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl flex-shrink-0" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>
          <Plus size={14} /> Tambah Metode
        </button>
      </div>

      <div className="space-y-4">
        {methods.length === 0 && (
          <p className="text-sm py-6 text-center rounded-xl" style={{ color: "var(--text-muted)", border: "1px dashed rgba(64,50,37,.15)" }}>
            Belum ada metode pembayaran. Klik &ldquo;Tambah Metode&rdquo;.
          </p>
        )}

        {methods.map((m) => {
          const type = normalizeMethodType(m.method_type);
          const rowNew = isNew(m);
          const dirty = isDirty(m);
          const rowErrors = errors[m.id] || {};

          return (
            <div key={m.id} className="p-4 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.1)", background: m.is_active === false ? "rgba(200,200,200,.1)" : "rgba(255,255,255,.5)" }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium truncate" style={{ background: "var(--bg-secondary, #f0ebe5)", color: "var(--espresso)" }}>
                    <span className="truncate">{m.label || defaultMethodLabel(type)}</span>
                    <PaymentIcon type={m.icon || type} size={16} style={{ color: "var(--text-secondary)" }} />
                  </span>
                  <span className="text-[11px] font-medium flex-shrink-0" style={{ color: m.is_active === false ? "var(--text-muted)" : "var(--gold)" }}>
                    {rowNew ? "Baru" : m.is_active === false ? "Nonaktif" : "Aktif"}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!rowNew && (
                    <button onClick={() => toggleMethod(m.id, m.is_active === false)} className="text-xs px-2 py-1 rounded" style={{ border: "1px solid rgba(64,50,37,.15)", color: m.is_active === false ? "var(--gold)" : "var(--text-muted)" }}>
                      {m.is_active === false ? "Aktifkan" : "Nonaktifkan"}
                    </button>
                  )}
                  {dirty && (
                    <button onClick={() => saveMethod(m)} disabled={savingId === m.id} className="text-xs px-3 py-1 rounded font-semibold" style={{ background: "var(--gold)", color: "white" }}>
                      {savingId === m.id ? "..." : "Simpan"}
                    </button>
                  )}
                  {rowNew ? (
                    <button onClick={() => cancelNew(m.id)} className="p-1 rounded hover:bg-red-50" style={{ color: "#e74c3c" }}>
                      <X size={14} />
                    </button>
                  ) : (
                    <button onClick={() => deleteMethod(m.id)} className="p-1 rounded hover:bg-red-50" style={{ color: "#e74c3c" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: rowErrors.label ? "#e74c3c" : labelStyle.color }}>Nama Metode *</label>
                  <input
                    value={m.label || ""}
                    onChange={(e) => updateField(m.id, "label", e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ ...inputStyle, borderColor: rowErrors.label ? "#e74c3c" : "rgba(64,50,37,.15)" }}
                    placeholder="Transfer Bank BCA / GoPay / Bayar di Tempat (COD)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={labelStyle}>Jenis Pembayaran</label>
                  <select value={type} onChange={(e) => updateField(m.id, "method_type", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}>
                    {PAYMENT_METHOD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-[11px] font-medium mb-2" style={labelStyle}>Logo / Ikon di Checkout</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_ICON_OPTIONS.map((opt) => {
                    const active = (m.icon || type) === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => updateField(m.id, "icon", opt.key)}
                        title={opt.label}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={{
                          border: active ? "1.5px solid var(--gold)" : "1px solid rgba(64,50,37,.15)",
                          background: active ? "rgba(181,140,74,.06)" : "white",
                          color: active ? "var(--gold)" : "var(--text-secondary)",
                        }}
                      >
                        <PaymentIcon type={opt.key} size={16} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {type === "bank" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={labelStyle}>Nama Bank</label>
                    <input value={m.bank_name || ""} onChange={(e) => updateField(m.id, "bank_name", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="Bank Mandiri" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: rowErrors.account_name ? "#e74c3c" : labelStyle.color }}>Nama Pemilik *</label>
                    <input value={m.account_name || ""} onChange={(e) => updateField(m.id, "account_name", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ ...inputStyle, borderColor: rowErrors.account_name ? "#e74c3c" : "rgba(64,50,37,.15)" }} placeholder="PT Samaqu Digital" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: rowErrors.account_number ? "#e74c3c" : labelStyle.color }}>Nomor Rekening *</label>
                    <input value={m.account_number || ""} onChange={(e) => updateField(m.id, "account_number", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ ...inputStyle, borderColor: rowErrors.account_number ? "#e74c3c" : "rgba(64,50,37,.15)" }} placeholder="1234567890123" />
                  </div>
                </div>
              )}

              {type === "ewallet" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={labelStyle}>Nama Pemilik</label>
                    <input value={m.account_name || ""} onChange={(e) => updateField(m.id, "account_name", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="SAMAQU" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: rowErrors.account_info ? "#e74c3c" : labelStyle.color }}>Nomor Tujuan *</label>
                    <input value={m.account_info || ""} onChange={(e) => updateField(m.id, "account_info", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ ...inputStyle, borderColor: rowErrors.account_info ? "#e74c3c" : "rgba(64,50,37,.15)" }} placeholder="0895635965400" />
                  </div>
                </div>
              )}

              {type === "qris" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={labelStyle}>Gambar QR Code</label>
                    <div className="flex items-center gap-3">
                      {m.qr_image_url ? (
                        <img src={m.qr_image_url} alt="QR Code" className="w-20 h-20 object-contain rounded-lg border" style={{ borderColor: "rgba(64,50,37,.1)" }} />
                      ) : (
                        <span className="w-20 h-20 rounded-lg flex items-center justify-center" style={{ border: "1px dashed rgba(64,50,37,.2)", color: "var(--text-muted)" }}>
                          <ImageIcon size={20} />
                        </span>
                      )}
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>
                          Upload QR
                        </span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQrImage(m.id, f); }} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={labelStyle}>Info Tambahan (NMID, dsb)</label>
                    <input value={m.account_info || ""} onChange={(e) => updateField(m.id, "account_info", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="ID1023... (opsional)" />
                  </div>
                </div>
              )}

              <div className="mt-3">
                <label className="block text-[11px] font-medium mb-1" style={labelStyle}>Catatan untuk customer (opsional, tampil di halaman sukses)</label>
                <textarea
                  value={m.instructions || ""}
                  onChange={(e) => updateField(m.id, "instructions", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={inputStyle}
                  placeholder={type === "cod" ? "Pembayaran dilakukan saat barang diterima." : "Contoh: konfirmasi via WhatsApp setelah transfer."}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
