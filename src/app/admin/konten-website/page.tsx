"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/AdminToast";
import AdminShell from "@/components/AdminShell";

const HERO_DEFAULTS = {
  eyebrow_text: "Premium Muslim Menswear", title_line1: "Busana yang Layak", title_line2: "Menemani Setiap Momen.",
  description: "Dirancang dengan material pilihan, potongan yang presisi, dan detail yang dibuat untuk kenyamanan dalam setiap aktivitas.",
  feature1: "6 Koleksi Eksklusif", feature2: "Berbagai Jenis Kain", feature3: "Panduan Size Lengkap", is_active: true,
};

interface HeroContent { eyebrow_text: string; title_line1: string; title_line2: string; description: string; feature1: string; feature2: string; feature3: string; is_active: boolean; }
interface CategoryImage { id: string; name: string; description: string; image_url: string; display_order: number; }
interface OrderStep { id: string; step_number: number; title: string; description: string; }
interface GaransiItem { id: string; title: string; description: string; display_order: number; }
interface TrustBadge { id: string; label: string; display_order: number; }
interface FaqItem { id: string; question: string; answer: string; display_order: number; }
interface MarqueeItem { id: string; label: string; display_order: number; }

export default function KontenWebsitePage() {
  const [hero, setHero] = useState<HeroContent>(HERO_DEFAULTS);
  const [categories, setCategories] = useState<CategoryImage[]>([]);
  const [steps, setSteps] = useState<OrderStep[]>([]);
  const [garansi, setGaransi] = useState<GaransiItem[]>([]);
  const [badges, setBadges] = useState<TrustBadge[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [marquee, setMarquee] = useState<MarqueeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Edit states
  const [editHero, setEditHero] = useState<HeroContent>(HERO_DEFAULTS);
  const [editSteps, setEditSteps] = useState<OrderStep[]>([]);
  const [editGaransi, setEditGaransi] = useState<GaransiItem[]>([]);
  const [editBadges, setEditBadges] = useState<TrustBadge[]>([]);
  const [editFaqs, setEditFaqs] = useState<FaqItem[]>([]);
  const [editMarquee, setEditMarquee] = useState<MarqueeItem[]>([]);
  const [editCategories, setEditCategories] = useState<CategoryImage[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [heroRes, catRes, stepsRes, garansiRes, badgesRes, faqsRes, marqueeRes] = await Promise.all([
      supabase.from("hero_content").select("*").eq("id", 1).single(),
      supabase.from("category_images").select("*").order("display_order"),
      supabase.from("order_steps").select("*").order("step_number"),
      supabase.from("garansi_items").select("*").order("display_order"),
      supabase.from("trust_badges").select("*").order("display_order"),
      supabase.from("faq_items").select("*").order("display_order"),
      supabase.from("marquee_items").select("*").order("display_order"),
    ]);
    if (heroRes.data) setHero(heroRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (stepsRes.data) setSteps(stepsRes.data);
    if (garansiRes.data) setGaransi(garansiRes.data);
    if (badgesRes.data) setBadges(badgesRes.data);
    if (faqsRes.data) setFaqs(faqsRes.data);
    if (marqueeRes.data) setMarquee(marqueeRes.data);
    setLoading(false);
  }

  // Hero handlers
  function openHeroEdit() { setEditHero({ ...hero }); setEditModal("hero"); }
  async function saveHero() {
    setSaving(true);
    await supabase.from("hero_content").upsert({ id: 1, ...editHero }, { onConflict: "id" });
    setHero(editHero); setEditModal(null); setSaving(false);
    toast.showToast("success", "Hero berhasil disimpan");
  }

  // Category handlers
  function openCategoryEdit() { setEditCategories(categories.map((c) => ({ ...c }))); setEditModal("kategori"); }
  async function saveCategories() {
    setSaving(true);
    await supabase.from("category_images").delete().neq("id", "");
    if (editCategories.length > 0) {
      await supabase.from("category_images").insert(editCategories.map((c, i) => ({ name: c.name, description: c.description, image_url: c.image_url, display_order: i })));
    }
    setCategories(editCategories); setEditModal(null); setSaving(false);
    toast.showToast("success", "Kategori berhasil disimpan");
  }
  async function uploadCategoryImage(idx: number, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "samaqu_unsigned");
    setUploadingId(editCategories[idx].id);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/dgtixuop0/image/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url) {
        const u = [...editCategories]; u[idx] = { ...u[idx], image_url: data.secure_url }; setEditCategories(u);
        toast.showToast("success", "Gambar berhasil diupload");
      }
    } catch { toast.showToast("error", "Gagal upload gambar"); }
    setUploadingId(null);
  }

  // Steps handlers
  function openStepsEdit() { setEditSteps(steps.map((s) => ({ ...s }))); setEditModal("steps"); }
  async function saveSteps() {
    setSaving(true);
    await supabase.from("order_steps").delete().neq("id", "");
    if (editSteps.length > 0) {
      await supabase.from("order_steps").insert(editSteps.map((s, i) => ({ step_number: i + 1, title: s.title, description: s.description })));
    }
    setSteps(editSteps); setEditModal(null); setSaving(false);
    toast.showToast("success", "Cara Pemesanan berhasil disimpan");
  }

  // Garansi handlers
  function openGaransiEdit() { setEditGaransi(garansi.map((g) => ({ ...g }))); setEditBadges(badges.map((b) => ({ ...b }))); setEditModal("garansi"); }
  async function saveGaransi() {
    setSaving(true);
    await supabase.from("garansi_items").delete().neq("id", "");
    if (editGaransi.length > 0) await supabase.from("garansi_items").insert(editGaransi.map((g, i) => ({ title: g.title, description: g.description, display_order: i })));
    await supabase.from("trust_badges").delete().neq("id", "");
    if (editBadges.length > 0) await supabase.from("trust_badges").insert(editBadges.map((b, i) => ({ label: b.label, display_order: i })));
    setGaransi(editGaransi); setBadges(editBadges); setEditModal(null); setSaving(false);
    toast.showToast("success", "Jaminan berhasil disimpan");
  }

  // FAQ handlers
  function openFaqEdit() { setEditFaqs(faqs.map((f) => ({ ...f }))); setEditModal("faq"); }
  async function saveFaqs() {
    setSaving(true);
    await supabase.from("faq_items").delete().neq("id", "");
    if (editFaqs.length > 0) await supabase.from("faq_items").insert(editFaqs.map((f, i) => ({ question: f.question, answer: f.answer, display_order: i })));
    setFaqs(editFaqs); setEditModal(null); setSaving(false);
    toast.showToast("success", "FAQ berhasil disimpan");
  }

  // Marquee handlers
  function openMarqueeEdit() { setEditMarquee(marquee.map((m) => ({ ...m }))); setEditModal("marquee"); }
  async function saveMarquee() {
    setSaving(true);
    await supabase.from("marquee_items").delete().neq("id", "");
    if (editMarquee.length > 0) await supabase.from("marquee_items").insert(editMarquee.map((m, i) => ({ label: m.label, display_order: i })));
    setMarquee(editMarquee); setEditModal(null); setSaving(false);
    toast.showToast("success", "Marquee berhasil disimpan");
  }

  function CharCounter({ current, max }: { current: number; max: number }) {
    return <p className="text-[10px] mt-0.5" style={{ color: current > max * 0.9 ? "#8a6f42" : "var(--text-muted)" }}>{current}/{max}</p>;
  }

  if (loading) return <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><Loader2 size={24} className="animate-spin" style={{ color: "var(--gold)" }} /></section>;

  const sections = [
    { key: "hero", title: "Hero / Banner Utama", desc: hero.title_line1 + " " + hero.title_line2, active: hero.is_active, edit: openHeroEdit },
    { key: "kategori", title: "Kategori Koleksi", desc: `${categories.length} kategori`, active: categories.length > 0, edit: openCategoryEdit },
    { key: "steps", title: "Cara Pemesanan", desc: `${steps.length} langkah`, active: steps.length > 0, edit: openStepsEdit },
    { key: "garansi", title: "Jaminan SAMAQU", desc: `${garansi.length} jaminan + ${badges.length} badges`, active: true, edit: openGaransiEdit },
    { key: "faq", title: "FAQ", desc: `${faqs.length} pertanyaan`, active: true, edit: openFaqEdit },
    { key: "marquee", title: "Trust Marquee", desc: `${marquee.length} item scrolling`, active: true, edit: openMarqueeEdit },
  ];

  return (
    <AdminShell>
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      <div className="max-w-4xl mx-auto px-5 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl italic" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Konten Website</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Kelola konten yang tampil di halaman publik SAMAQU</p>
        </div>

        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.key} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold" style={{ color: "var(--espresso)" }}>{s.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: s.active ? "#e7ecdf" : "#f0ebe5", color: s.active ? "#5b6b45" : "var(--text-muted)" }}>{s.active ? "Aktif" : "Kosong"}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              </div>
              {s.edit && <button onClick={s.edit} className="shrink-0 px-5 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-[rgba(64,50,37,.05)]" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>Edit Bagian</button>}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Hero Modal ═══ */}
      <AnimatePresence>
        {editModal === "hero" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Hero / Banner Utama</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <div className="space-y-3">
                <div><label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Eyebrow Text</label><input value={editHero.eyebrow_text} onChange={(e) => setEditHero({ ...editHero, eyebrow_text: e.target.value.slice(0, 40) })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} /><CharCounter current={editHero.eyebrow_text.length} max={40} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Title Line 1</label><input value={editHero.title_line1} onChange={(e) => setEditHero({ ...editHero, title_line1: e.target.value.slice(0, 30) })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} /><CharCounter current={editHero.title_line1.length} max={30} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Title Line 2</label><input value={editHero.title_line2} onChange={(e) => setEditHero({ ...editHero, title_line2: e.target.value.slice(0, 30) })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} /><CharCounter current={editHero.title_line2.length} max={30} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Deskripsi</label><textarea value={editHero.description} onChange={(e) => setEditHero({ ...editHero, description: e.target.value.slice(0, 150) })} rows={3} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} /><CharCounter current={editHero.description.length} max={150} /></div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((n) => { const k = `feature${n}` as keyof HeroContent; return <div key={k}><label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Fitur {n}</label><input value={editHero[k] as string} onChange={(e) => setEditHero({ ...editHero, [k]: e.target.value.slice(0, 30) })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} /><CharCounter current={(editHero[k] as string).length} max={30} /></div>; })}
                </div>
              </div>
              <div className="flex gap-3 mt-5"><button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button><button onClick={saveHero} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Kategori Koleksi Modal ═══ */}
      <AnimatePresence>
        {editModal === "kategori" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Kategori Koleksi</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: "#f0e7d8", color: "#8a6f42" }}>Ukuran gambar yang disarankan: <strong>800×800px</strong> (aspect ratio 1:1, format JPG/PNG, max 2MB) agar tampil optimal di grid homepage.</p>
              <div className="space-y-4 mb-4">
                {editCategories.map((cat, i) => (
                  <div key={cat.id || i} className="p-4 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.1)", background: "rgba(255,255,255,.5)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <input value={cat.name} onChange={(e) => { const u = [...editCategories]; u[i] = { ...u[i], name: e.target.value }; setEditCategories(u); }} className="text-sm font-semibold outline-none bg-transparent" style={{ color: "var(--espresso)" }} placeholder="Nama kategori" />
                      {editCategories.length > 1 && <button onClick={() => setEditCategories(editCategories.filter((_, j) => j !== i))} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                    </div>
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ background: "#e8dfd1" }}>
                        {cat.image_url ? <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={20} style={{ color: "var(--text-muted)" }} /></div>}
                      </div>
                      <div className="flex-1">
                        <textarea value={cat.description} onChange={(e) => { const u = [...editCategories]; u[i] = { ...u[i], description: e.target.value }; setEditCategories(u); }} rows={2} placeholder="Deskripsi singkat kategori" className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none mb-2" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                        <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-lg transition-colors hover:bg-[rgba(64,50,37,.05)]" style={{ border: "1px dashed rgba(64,50,37,.2)", color: "var(--gold)" }}>
                          <Upload size={14} />
                          {uploadingId === cat.id ? "Uploading..." : "Ganti Gambar"}
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCategoryImage(i, f); }} />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {editCategories.length < 6 && <button onClick={() => setEditCategories([...editCategories, { id: "new-" + Date.now(), name: "", description: "", image_url: "", display_order: editCategories.length }])} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah Kategori</button>}
              <div className="flex gap-3"><button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button><button onClick={saveCategories} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Steps Modal ═══ */}
      <AnimatePresence>
        {editModal === "steps" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Cara Pemesanan</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <div className="space-y-4 mb-4">
                {editSteps.map((s, i) => (
                  <div key={s.id} className="p-4 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.1)", background: "rgba(255,255,255,.5)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>Langkah {i + 1}</span>
                      {editSteps.length > 1 && <button onClick={() => setEditSteps(editSteps.filter((_, j) => j !== i))} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                    </div>
                    <input value={s.title} onChange={(e) => { const u = [...editSteps]; u[i] = { ...u[i], title: e.target.value.slice(0, 30) }; setEditSteps(u); }} placeholder="Judul" className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-1" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                    <textarea value={s.description} onChange={(e) => { const u = [...editSteps]; u[i] = { ...u[i], description: e.target.value.slice(0, 100) }; setEditSteps(u); }} placeholder="Deskripsi" rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                  </div>
                ))}
              </div>
              {editSteps.length < 6 && <button onClick={() => setEditSteps([...editSteps, { id: String(Date.now()), step_number: editSteps.length + 1, title: "", description: "" }])} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah</button>}
              <div className="flex gap-3"><button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button><button onClick={saveSteps} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Garansi Modal ═══ */}
      <AnimatePresence>
        {editModal === "garansi" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Jaminan SAMAQU</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--espresso)" }}>Kartu Jaminan</p>
              <div className="space-y-3 mb-6">
                {editGaransi.map((g, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ border: "1px solid rgba(64,50,37,.1)" }}>
                    <input value={g.title} onChange={(e) => { const u = [...editGaransi]; u[i] = { ...u[i], title: e.target.value }; setEditGaransi(u); }} placeholder="Judul" className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                    <textarea value={g.description} onChange={(e) => { const u = [...editGaransi]; u[i] = { ...u[i], description: e.target.value }; setEditGaransi(u); }} placeholder="Deskripsi" rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--espresso)" }}>Trust Badges</p>
              <div className="space-y-2 mb-4">
                {editBadges.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={b.label} onChange={(e) => { const u = [...editBadges]; u[i] = { ...u[i], label: e.target.value }; setEditBadges(u); }} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                    {editBadges.length > 1 && <button onClick={() => setEditBadges(editBadges.filter((_, j) => j !== i))} className="p-1"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                  </div>
                ))}
                {editBadges.length < 5 && <button onClick={() => setEditBadges([...editBadges, { id: String(Date.now()), label: "", display_order: editBadges.length }])} className="text-sm font-medium" style={{ color: "var(--gold)" }}><Plus size={14} className="inline mr-1" />Tambah Badge</button>}
              </div>
              <div className="flex gap-3"><button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button><button onClick={saveGaransi} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FAQ Modal ═══ */}
      <AnimatePresence>
        {editModal === "faq" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>FAQ</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <div className="space-y-4 mb-4">
                {editFaqs.map((f, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.1)", background: "rgba(255,255,255,.5)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>Pertanyaan {i + 1}</span>
                      {editFaqs.length > 1 && <button onClick={() => setEditFaqs(editFaqs.filter((_, j) => j !== i))} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                    </div>
                    <input value={f.question} onChange={(e) => { const u = [...editFaqs]; u[i] = { ...u[i], question: e.target.value }; setEditFaqs(u); }} placeholder="Pertanyaan" className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-1" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                    <textarea value={f.answer} onChange={(e) => { const u = [...editFaqs]; u[i] = { ...u[i], answer: e.target.value }; setEditFaqs(u); }} placeholder="Jawaban" rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                  </div>
                ))}
              </div>
              {editFaqs.length < 10 && <button onClick={() => setEditFaqs([...editFaqs, { id: String(Date.now()), question: "", answer: "", display_order: editFaqs.length }])} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah</button>}
              <div className="flex gap-3"><button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button><button onClick={saveFaqs} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Marquee Modal ═══ */}
      <AnimatePresence>
        {editModal === "marquee" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Trust Marquee</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <div className="space-y-2 mb-4">
                {editMarquee.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={m.label} onChange={(e) => { const u = [...editMarquee]; u[i] = { ...u[i], label: e.target.value }; setEditMarquee(u); }} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white" }} />
                    {editMarquee.length > 1 && <button onClick={() => setEditMarquee(editMarquee.filter((_, j) => j !== i))} className="p-1"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                  </div>
                ))}
                {editMarquee.length < 10 && <button onClick={() => setEditMarquee([...editMarquee, { id: String(Date.now()), label: "", display_order: editMarquee.length }])} className="text-sm font-medium" style={{ color: "var(--gold)" }}><Plus size={14} className="inline mr-1" />Tambah Item</button>}
              </div>
              <div className="flex gap-3"><button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button><button onClick={saveMarquee} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
    </AdminShell>
  );
}
