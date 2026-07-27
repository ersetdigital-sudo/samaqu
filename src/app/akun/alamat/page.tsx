"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, MapPin, Loader2, Search, Bell } from "lucide-react";
import ProfileDropdown from "@/components/ProfileDropdown";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getWhatsAppLink } from "@/lib/store-settings";

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
  const pathname = usePathname();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{ name: string; whatsapp: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Address | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      setCustomerId(c.id);
      setCustomer(c);
      const { data } = await supabase.from("saved_addresses").select("*").eq("customer_id", c.id).order("is_default", { ascending: false }).order("created_at", { ascending: true });
      if (data) setAddresses(data);
      setLoading(false);
    }
    init();
  }, []);

  const navItems = [
    { href: "/akun", label: "Beranda", icon: "◇" },
    { href: "/akun", label: "Pesanan Saya", icon: "▤" },
    { href: "/akun", label: "Koleksi", icon: "❖" },
    { href: "/akun", label: "Ukuran Saya", icon: "↔" },
    { href: "/akun/alamat", label: "Alamat Tersimpan", icon: "📍" },
    { href: "/akun", label: "Wishlist", icon: "♡" },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.href === "/akun/alamat") return pathname === "/akun/alamat";
    return pathname === "/akun" && item.href === "/akun";
  };

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
    const forceDefault = isFirstAddress;
    const shouldBeDefault = form.is_default || forceDefault;

    // Resolve district_id from postal code for shipping calculation
    let districtId: number | null = null;
    if (form.postal_code.trim()) {
      try {
        const res = await fetch(`/api/shipping/resolve-district?postalCode=${form.postal_code.trim()}`);
        const json = await res.json();
        if (json.district_id) districtId = json.district_id;
      } catch { /* silent */ }
    }

    const payload = { ...form, label: form.label.trim() || "Alamat", customer_id: customerId, is_default: shouldBeDefault, district_id: districtId };

    if (shouldBeDefault) {
      await supabase.from("saved_addresses").update({ is_default: false }).eq("customer_id", customerId);
    }

    if (editing) {
      await supabase.from("saved_addresses").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("saved_addresses").insert(payload);
    }
    const { data } = await supabase.from("saved_addresses").select("*").eq("customer_id", customerId).order("is_default", { ascending: false }).order("created_at", { ascending: true });
    if (data) setAddresses(data);
    setModalOpen(false);
    setSaving(false);
  }

  async function handleDelete(addr: Address) {
    await supabase.from("saved_addresses").delete().eq("id", addr.id);
    const remaining = addresses.filter((a) => a.id !== addr.id);
    if (addr.is_default && remaining.length > 0) {
      const newDefault = remaining[0];
      await supabase.from("saved_addresses").update({ is_default: true }).eq("id", newDefault.id);
      remaining[0] = { ...newDefault, is_default: true };
    }
    setAddresses(remaining);
    setDeleteConfirm(null);
  }

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
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary, #f8f5f1)" }}>
      {/* SIDEBAR (desktop) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 shrink-0 px-6 py-8 sticky top-0 h-screen" style={{ borderRight: "1px solid rgba(64,50,37,.09)", background: "var(--bg-secondary, #f0ebe5)" }}>
        <div className="flex items-center gap-3 mb-8 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(64,50,37,.06)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
            {customer?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--espresso)" }}>{customer?.name || "Pelanggan"}</p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{customer?.whatsapp || ""}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors" style={{ background: isActive(item) ? "var(--espresso)" : "transparent", color: isActive(item) ? "#f8f5f1" : "var(--text-secondary)" }}>
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #403225, #2d211b, #1c1511)" }}>
          <p className="italic text-lg mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Konsultasi Ukuran</p>
          <p className="text-xs mb-4" style={{ color: "rgba(248,245,241,.7)" }}>Bingung pilih ukuran? Tim kami siap membantu Anda.</p>
          <a href={getWhatsAppLink("Halo, saya butuh bantuan konsultasi ukuran.")} target="_blank" rel="noopener noreferrer" className="block text-center rounded-full text-xs font-medium py-2.5 transition-colors" style={{ background: "#b58c4a", color: "white" }}>Hubungi Kami</a>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30" style={{ backdropFilter: "blur(12px)", background: "rgba(248,245,241,.85)", borderBottom: "1px solid rgba(64,50,37,.09)" }}>
          <div className="flex items-center gap-4 px-5 sm:px-8 py-4">
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/logo.svg" alt="SAMAQU" className="h-8 w-auto" />
            </div>
            <div className="hidden sm:flex flex-1 max-w-md items-center gap-2 rounded-full px-4 py-2.5" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
              <Search size={16} style={{ color: "var(--text-muted)" }} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari thobe, koko, vest…" className="bg-transparent outline-none text-sm w-full" style={{ color: "var(--espresso)" }} />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button className="h-10 w-10 rounded-full relative flex items-center justify-center" style={{ background: "var(--bg-secondary, #f0ebe5)", border: "1px solid rgba(64,50,37,.09)" }}>
                <Bell size={18} style={{ color: "var(--espresso)" }} />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: "#b58c4a" }} />
              </button>
              <ProfileDropdown />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
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

            <button onClick={openAdd} className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90" style={{ background: "var(--espresso)" }}>
              <Plus size={16} /> Tambah Alamat Baru
            </button>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40" style={{ background: "rgba(248,245,241,.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(64,50,37,.09)" }}>
        <div className="px-6 py-2.5 flex items-center justify-between">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 text-[10px]" style={{ color: isActive(item) ? "#8b6f42" : "var(--text-muted)" }}>
              <span className="text-lg">{item.icon}</span>
              {item.label.split(" ")[0]}
            </Link>
          ))}
        </div>
      </nav>

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
                <div><label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Label Alamat</label><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Rumah / Kantor / dll" /></div>
                <div><label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Nama Penerima *</label><input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: errors.recipient_name ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />{errors.recipient_name && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.recipient_name}</p>}</div>
                <div><label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>No. HP *</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: errors.phone ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="0812xxxx" />{errors.phone && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.phone}</p>}</div>
                <div><label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Alamat Lengkap *</label><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={{ border: errors.address ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />{errors.address && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.address}</p>}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Kota/Kabupaten *</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: errors.city ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />{errors.city && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.city}</p>}</div>
                  <div><label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Kode Pos *</label><input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: errors.postal_code ? "1px solid #e74c3c" : "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="12345" />{errors.postal_code && <p className="text-[11px] mt-1" style={{ color: "#e74c3c" }}>{errors.postal_code}</p>}</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="rounded" style={{ accentColor: "var(--gold)" }} /><span className="text-sm" style={{ color: "var(--espresso)" }}>Jadikan alamat utama</span></label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--espresso)" }}>Batal</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--espresso)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-2" /> : null} Simpan</button>
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
    </div>
  );
}
