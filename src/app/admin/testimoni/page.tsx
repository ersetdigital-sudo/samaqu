"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, X, Star, Loader2, CheckCircle, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/AdminToast";
import ConfirmModal from "@/components/ConfirmModal";
import AdminShell from "@/components/AdminShell";

const CATEGORIES = ["Thobe", "Kandora", "Koko", "Vest", "Kabak", "Cover & Hanger"] as const;

interface Testimoni {
  id: string;
  customer_name: string;
  content: string;
  rating: number;
  category: string;
  type: string;
  verified: boolean;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  created_at: string;
}

const DEFAULT_FORM = {
  customer_name: "",
  content: "",
  rating: 5,
  category: "Thobe",
  type: "text",
  verified: false,
  image_url: "",
  video_url: "",
  caption: "",
};

export default function AdminTestimoniPage() {
  const [testimonials, setTestimonials] = useState<Testimoni[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} });
  const toast = useToast();

  const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "dgtixuop0";
  const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "samaqu_unsigned";

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) { toast.showToast("error", `File terlalu besar. Maks: ${isVideo ? "50MB" : "10MB"}`); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_PRESET);
      const endpoint = isVideo ? "video" : "image";
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${endpoint}/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload gagal");
      const data = await res.json();
      if (isVideo) setForm({ ...form, video_url: data.secure_url, image_url: "", type: "video" });
      else setForm({ ...form, image_url: data.secure_url, video_url: "", type: "photo" });
      toast.showToast("success", "Media berhasil diupload");
    } catch {
      toast.showToast("error", "Gagal upload media");
    }
    setUploading(false);
    e.target.value = "";
  }

  function removeMedia() {
    setForm({ ...form, image_url: "", video_url: "", type: "text" });
  }

  useEffect(() => {
    fetchTestimonials();
  }, []);

  async function fetchTestimonials() {
    const { data } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
    if (data) setTestimonials(data as Testimoni[]);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
    setEditModal(true);
  }

  function openEdit(t: Testimoni) {
    setEditingId(t.id);
    setForm({
      customer_name: t.customer_name,
      content: t.content,
      rating: t.rating,
      category: t.category,
      type: t.type,
      verified: t.verified,
      image_url: t.image_url || "",
      video_url: t.video_url || "",
      caption: t.caption || "",
    });
    setEditModal(true);
  }

  async function handleSave() {
    if (!form.customer_name.trim() || !form.content.trim()) {
      toast.showToast("error", "Nama dan isi testimoni wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from("testimonials").update({
          customer_name: form.customer_name,
          content: form.content,
          rating: form.rating,
          category: form.category,
          type: form.type,
          verified: form.verified,
          image_url: form.image_url || null,
          video_url: form.video_url || null,
          caption: form.caption || null,
        }).eq("id", editingId);
        toast.showToast("success", "Testimoni berhasil diupdate");
      } else {
        await supabase.from("testimonials").insert({
          customer_name: form.customer_name,
          content: form.content,
          rating: form.rating,
          category: form.category,
          type: form.type,
          verified: form.verified,
          image_url: form.image_url || null,
          video_url: form.video_url || null,
          caption: form.caption || null,
        });
        toast.showToast("success", "Testimoni berhasil ditambahkan");
      }
      setEditModal(false);
      fetchTestimonials();
    } catch {
      toast.showToast("error", "Gagal menyimpan testimoni");
    }
    setSaving(false);
  }

  function handleDelete(id: string, name: string) {
    setConfirmModal({
      open: true,
      onConfirm: async () => {
        await supabase.from("testimonials").delete().eq("id", id);
        setTestimonials((prev) => prev.filter((t) => t.id !== id));
        toast.showToast("success", `Testimoni ${name} berhasil dihapus`);
      },
    });
  }

  if (loading) {
    return <AdminShell><section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><Loader2 size={24} className="animate-spin" style={{ color: "var(--gold)" }} /></section></AdminShell>;
  }

  return (
    <AdminShell>
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Testimoni Pelanggan</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{testimonials.length} testimoni</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white" style={{ background: "var(--gold)" }}>
            <Plus size={16} strokeWidth={2} /> Tambah
          </button>
        </div>

        <div className="space-y-3">
          {testimonials.map((t) => (
            <div key={t.id} className="card p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold" style={{ background: "var(--espresso)", color: "var(--gold)", fontFamily: "Georgia, serif" }}>
                {t.customer_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--espresso)" }}>{t.customer_name}</p>
                  {t.verified && <CheckCircle size={12} style={{ color: "var(--gold)" }} />}
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full" style={{ background: "rgba(181,140,74,.08)", color: "var(--gold)" }}>{t.category}</span>
                </div>
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} fill={i < t.rating ? "var(--gold)" : "none"} stroke="var(--gold)" />)}
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t.content}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]" style={{ color: "var(--text-muted)" }}><Edit size={16} /></button>
                <button onClick={() => handleDelete(t.id, t.customer_name)} className="p-2 rounded-lg hover:bg-red-50" style={{ color: "#e74c3c" }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>{editingId ? "Edit Testimoni" : "Tambah Testimoni"}</h3>
                <button onClick={() => setEditModal(false)} className="p-1"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nama Pelanggan</label>
                  <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Isi Testimoni</label>
                  <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Rating</label>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button key={i} onClick={() => setForm({ ...form, rating: i + 1 })} className="p-1">
                          <Star size={20} fill={i < form.rating ? "var(--gold)" : "none"} stroke="var(--gold)" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Kategori</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Media upload */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Foto / Video (opsional)</label>
                  {(form.image_url || form.video_url) ? (
                    <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(64,50,37,.15)" }}>
                      {form.video_url ? (
                        <video src={form.video_url} className="w-full max-h-48 object-cover" muted />
                      ) : (
                        <img src={form.image_url} alt="" className="w-full max-h-48 object-cover" />
                      )}
                      <button onClick={removeMedia} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,.6)", color: "white" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="block rounded-xl p-6 text-center cursor-pointer transition-all hover:border-[var(--gold)]" style={{ border: "2px dashed rgba(201,183,156,.3)", background: "rgba(255,255,255,.5)" }}>
                      {uploading ? (
                        <Loader2 size={24} className="animate-spin mx-auto" style={{ color: "var(--gold)" }} />
                      ) : (
                        <>
                          <Upload size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                          <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>Upload foto atau video</p>
                          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>JPG, PNG (10MB) · MP4 (50MB)</p>
                        </>
                      )}
                      <input type="file" accept="image/jpeg,image/png,video/mp4" onChange={handleMediaUpload} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Caption media (opsional)</label>
                  <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Contoh: Koko harian favorit" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Terverifikasi</span>
                  <button onClick={() => setForm({ ...form, verified: !form.verified })} style={{ color: form.verified ? "var(--gold)" : "var(--text-muted)" }}>
                    {form.verified ? <CheckCircle size={24} /> : <CheckCircle size={24} strokeWidth={1} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
                  {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal open={confirmModal.open} title="Hapus Testimoni?" message="Tindakan ini tidak bisa dibatalkan." onConfirm={() => { confirmModal.onConfirm(); setConfirmModal({ open: false, onConfirm: () => {} }); }} onCancel={() => setConfirmModal({ open: false, onConfirm: () => {} })} />

      <style jsx global>{`.card { background: #fffdfb; border: 1px solid rgba(64,50,37,.06); border-radius: 1rem; box-shadow: 0 1px 2px rgba(64,50,37,.03); }`}</style>
    </section>
    </AdminShell>
  );
}
