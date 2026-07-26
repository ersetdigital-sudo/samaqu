"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer } from "@/lib/customer-auth";

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  is_default: boolean;
}

const emptyForm = { label: "", recipient_name: "", phone: "", address: "", city: "", postal_code: "", is_default: false };

export default function AlamatPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Address | null>(null);

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      setCustomerId(c.id);
      const { data } = await supabase.from("saved_addresses").select("*").eq("customer_id", c.id).order("is_default", { ascending: false }).order("created_at", { ascending: true });
      if (data) setAddresses(data);
      setLoading(false);
    }
    init();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, label: "Rumah", is_default: addresses.length === 0 });
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(addr: Address) {
    setEditing(addr);
    setForm({ label: addr.label, recipient_name: addr.recipient_name, phone: addr.phone, address: addr.address, city: addr.city, postal_code: addr.postal_code, is_default: addr.is_default });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.recipient_name.trim()) e.recipient_name = "Nama penerima wajib diisi";
    if (!form.phone.trim()) e.phone = "No. HP wajib diisi";
    if (!form.address.trim()) e.address = "Alamat lengkap wajib diisi";
    if (!form.city.trim()) e.city = "Kota wajib diisi";
    if (!form.postal_code.trim()) e.postal_code = "Kode pos wajib diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !customerId) return;
    setSaving(true);
    const isFirstAddress = addresses.length === 0;
    const forceDefault = isFirstAddress; // First address always default
    const shouldBeDefault = form.is_default || forceDefault;
    const payload = { ...form, label: form.label.trim() || "Alamat", customer_id: customerId, is_default: shouldBeDefault };

    // Protection 2: unset all others before setting new default (one transaction)
    if (shouldBeDefault) {
      await supabase.from("saved_addresses").update({ is_default: false }).eq("customer_id", customerId);
    }

    if (editing) {
      const { error } = await supabase.from("saved_addresses").update(payload).eq("id", editing.id);
      if (!error) {
        // Refresh from DB to ensure consistency
        const { data } = await supabase.from("saved_addresses").select("*").eq("customer_id", customerId).order("is_default", { ascending: false }).order("created_at", { ascending: true });
        if (data) setAddresses(data);
      }
    } else {
      const { data, error } = await supabase.from("saved_addresses").insert(payload).select().single();
      if (!error && data) {
        // Refresh from DB
        const { data: all } = await supabase.from("saved_addresses").select("*").eq("customer_id", customerId).order("is_default", { ascending: false }).order("created_at", { ascending: true });
        if (all) setAddresses(all);
      }
    }
    setModalOpen(false);
    setSaving(false);
  }

  // Protection 3: delete default → auto-assign new default
  async function handleDelete(addr: Address) {
    await supabase.from("saved_addresses").delete().eq("id", addr.id);
    const remaining = addresses.filter((a) => a.id !== addr.id);
    if (addr.is_default && remaining.length > 0) {
      // Auto-assign oldest remaining as default
      const newDefault = remaining[0];
      await supabase.from("saved_addresses").update({ is_default: true }).eq("id", newDefault.id);
      remaining[0] = { ...newDefault, is_default: true };
    }
    setAddresses(remaining);
    setDeleteConfirm(null);
  }

  // Protection 2: set default in proper sequence
  async function handleSetDefault(addr: Address) {
    if (!customerId) return;
    await supabase.from("saved_addresses").update({ is_default: false }).eq("customer_id", customerId);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", addr.id);
    setAddresses(addresses.map((a) => ({ ...a, is_default: a.id === addr.id })));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--gold)" }} />
      </div>
    );
  }

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/akun" className="text-sm mb-3 inline-block" style={{ color: "var(--text-muted)" }}>← Kembali ke Dashboard</Link>
          <h1 className="text-2xl sm:text-3xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Alamat Tersimpan</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Kelola alamat pengiriman Anda</p>
        </div>

        {/* Address cards */}
        <div className="space-y-4 mb-6">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-2xl p-5" style={{ background: "var(--bg-secondary, #f0ebe5)", border: addr.is_default ? "2px solid var(--gold)" : "1px solid rgba(64,50,37,.09)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>{addr.label}</span>
                  {addr.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(181,140,74,.15)", color: "var(--gold)" }}>Alamat Utama</span>}
                </div>
                <div className="flex items-center gap-2">
                  {!addr.is_default && (
                    <button onClick={() => handleSetDefault(addr)} className="text-[11px] px-3 py-1 rounded-lg font-medium transition-colors" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>Jadikan Utama</button>
                  )}
                  <button onClick={() => openEdit(addr)} className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(64,50,37,.05)]" style={{ color: "var(--text-muted)" }}><Pencil size={14} /></button>
                  <button onClick={() => setDeleteConfirm(addr)} className="p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ color: "#e74c3c" }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
                <p className="font-medium" style={{ color: "var(--espresso)" }}>{addr.recipient_name} · {addr.phone}</p>
                <p>{addr.address}</p>
                <p>{addr.city}, {addr.postal_code}</p>
              </div>
            </div>
          ))}

          {addresses.length === 0 && (
            <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
              <MapPin size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Belum ada alamat tersimpan</p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Tambah alamat untuk mempercepat proses checkout</p>
            </div>
          )}
        </div>

        {/* Add button */}
        <button onClick={openAdd} className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90" style={{ background: "var(--espresso)" }}>
          <Plus size={16} /> Tambah Alamat Baru
        </button>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(42,33,27,.4)", backdropFilter: "blur(4px)" }} onClick={() => setModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-md rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: "var(--cream)", boxShadow: "0 25px 60px -12px rgba(42,33,27,.5)" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{editing ? "Edit Alamat" : "Tambah Alamat"}</h2>
                <button onClick={() => setModalOpen(false)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Label Alamat</label>
                  <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Rumah / Kantor / dll" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Nama Penerima *</label>
                  <input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: errors.recipient_name ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                  {errors.recipient_name && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.recipient_name}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>No. HP *</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: errors.phone ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="0812xxxx" />
                  {errors.phone && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Alamat Lengkap *</label>
                  <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={{ border: errors.address ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                  {errors.address && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.address}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Kota/Kabupaten *</label>
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: errors.city ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    {errors.city && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Kode Pos *</label>
                    <input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: errors.postal_code ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="12345" />
                    {errors.postal_code && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.postal_code}</p>}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="rounded" style={{ accentColor: "var(--gold)" }} />
                  <span className="text-sm" style={{ color: "var(--espresso)" }}>Jadikan alamat utama</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--espresso)" }}>Batal</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--espresso)" }}>
                  {saving ? <Loader2 size={14} className="animate-spin inline mr-2" /> : null}
                  Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(42,33,27,.4)", backdropFilter: "blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-sm rounded-2xl p-6" style={{ background: "var(--cream)", boxShadow: "0 25px 60px -12px rgba(42,33,27,.5)" }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Hapus Alamat?</h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Alamat &quot;{deleteConfirm.label}&quot; akan dihapus permanen.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--espresso)" }}>Batal</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#e74c3c" }}>Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
