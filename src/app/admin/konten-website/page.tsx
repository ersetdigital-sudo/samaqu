"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ToggleLeft, ToggleRight, Plus, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/AdminToast";
import ConfirmModal from "@/components/ConfirmModal";
import AdminShell from "@/components/AdminShell";
import type { Product } from "@/lib/katalog-data";

/* ── Defaults ── */
const HERO_DEFAULTS = {
  eyebrow_text: "Premium Muslim Menswear", title_line1: "Busana yang Layak", title_line2: "Menemani Setiap Momen.",
  description: "Dirancang dengan material pilihan, potongan yang presisi, dan detail yang dibuat untuk kenyamanan dalam setiap aktivitas.",
  feature1: "6 Koleksi Eksklusif", feature2: "Berbagai Jenis Kain", feature3: "Panduan Size Lengkap", is_active: true,
};

interface HeroContent { eyebrow_text: string; title_line1: string; title_line2: string; description: string; feature1: string; feature2: string; feature3: string; is_active: boolean; }
interface FeaturedProduct { id: string; product_id: string; display_order: number; }
interface OrderStep { id: string; step_number: number; title: string; description: string; }
interface GaransiItem { id: string; title: string; description: string; display_order: number; }
interface TrustBadge { id: string; label: string; display_order: number; }
interface FaqItem { id: string; question: string; answer: string; display_order: number; }
interface MarqueeItem { id: string; label: string; display_order: number; }

export default function KontenWebsitePage() {
  const [hero, setHero] = useState<HeroContent>(HERO_DEFAULTS);
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [steps, setSteps] = useState<OrderStep[]>([]);
  const [garansi, setGaransi] = useState<GaransiItem[]>([]);
  const [badges, setBadges] = useState<TrustBadge[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [marquee, setMarquee] = useState<MarqueeItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Form states
  const [heroForm, setHeroForm] = useState<HeroContent>(HERO_DEFAULTS);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editSteps, setEditSteps] = useState<OrderStep[]>([]);
  const [editGaransi, setEditGaransi] = useState<GaransiItem[]>([]);
  const [editBadges, setEditBadges] = useState<TrustBadge[]>([]);
  const [editFaqs, setEditFaqs] = useState<FaqItem[]>([]);
  const [editMarquee, setEditMarquee] = useState<MarqueeItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [heroRes, featuredRes, stepsRes, garansiRes, badgesRes, faqsRes, marqueeRes, productsRes] = await Promise.all([
        supabase.from("hero_content").select("*").eq("id", 1).single(),
        supabase.from("featured_products").select("*").order("display_order"),
        supabase.from("order_steps").select("*").order("step_number"),
        supabase.from("garansi_items").select("*").order("display_order"),
        supabase.from("trust_badges").select("*").order("display_order"),
        supabase.from("faq_items").select("*").order("display_order"),
        supabase.from("marquee_items").select("*").order("display_order"),
        supabase.from("products").select("*").order("name"),
      ]);
      if (heroRes.data) {
        const h = heroRes.data;
        setHero({ eyebrow_text: h.eyebrow_text || HERO_DEFAULTS.eyebrow_text, title_line1: h.title_line1 || HERO_DEFAULTS.title_line1, title_line2: h.title_line2 || HERO_DEFAULTS.title_line2, description: h.description || HERO_DEFAULTS.description, feature1: h.feature1 || HERO_DEFAULTS.feature1, feature2: h.feature2 || HERO_DEFAULTS.feature2, feature3: h.feature3 || HERO_DEFAULTS.feature3, is_active: h.is_active ?? true });
      }
      if (featuredRes.data) setFeatured(featuredRes.data);
      if (stepsRes.data) setSteps(stepsRes.data);
      if (garansiRes.data) setGaransi(garansiRes.data);
      if (badgesRes.data) setBadges(badgesRes.data);
      if (faqsRes.data) setFaqs(faqsRes.data);
      if (marqueeRes.data) setMarquee(marqueeRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // ── Hero ──
  function openHeroEdit() { setHeroForm({ ...hero }); setEditModal("hero"); }
  function updateHeroField(field: keyof HeroContent, value: string | boolean) { setHeroForm((p) => ({ ...p, [field]: value })); }
  async function saveHero() {
    setSaving(true);
    await supabase.from("hero_content").upsert({ id: 1, ...heroForm, updated_at: new Date().toISOString() });
    setHero(heroForm);
    setSaving(false); setEditModal(null);
    toast.showToast("success", "Hero berhasil disimpan");
  }
  function resetHeroToDefault() { setHeroForm({ ...HERO_DEFAULTS }); }

  // ── Koleksi ──
  function openKoleksiEdit() { setSelectedProducts(featured.map((f) => f.product_id)); setEditModal("koleksi"); }
  async function saveKoleksi() {
    setSaving(true);
    await supabase.from("featured_products").delete().neq("id", "");
    const rows = selectedProducts.map((pid, i) => ({ product_id: pid, display_order: i, is_active: true }));
    if (rows.length > 0) await supabase.from("featured_products").insert(rows);
    setFeatured(rows.map((r, i) => ({ id: String(i), ...r })));
    setSaving(false); setEditModal(null);
    toast.showToast("success", "Koleksi pilihan berhasil disimpan");
  }

  // ── Steps ──
  function openStepsEdit() { setEditSteps([...steps]); setEditModal("steps"); }
  async function saveSteps() {
    setSaving(true);
    await supabase.from("order_steps").delete().neq("id", "");
    const rows = editSteps.map((s, i) => ({ step_number: i + 1, title: s.title, description: s.description, is_active: true }));
    if (rows.length > 0) await supabase.from("order_steps").insert(rows);
    setSteps(rows.map((r, i) => ({ id: String(i), ...r })));
    setSaving(false); setEditModal(null);
    toast.showToast("success", "Cara pemesanan berhasil disimpan");
  }

  // ── Garansi ──
  function openGaransiEdit() { setEditGaransi([...garansi]); setEditBadges([...badges]); setEditModal("garansi"); }
  async function saveGaransi() {
    setSaving(true);
    await supabase.from("garansi_items").delete().neq("id", "");
    const rows = editGaransi.map((g, i) => ({ title: g.title, description: g.description, display_order: i, is_active: true }));
    if (rows.length > 0) await supabase.from("garansi_items").insert(rows);
    setGaransi(rows.map((r, i) => ({ id: String(i), ...r })));

    await supabase.from("trust_badges").delete().neq("id", "");
    const bRows = editBadges.map((b, i) => ({ label: b.label, display_order: i, is_active: true }));
    if (bRows.length > 0) await supabase.from("trust_badges").insert(bRows);
    setBadges(bRows.map((r, i) => ({ id: String(i), ...r })));

    setSaving(false); setEditModal(null);
    toast.showToast("success", "Jaminan berhasil disimpan");
  }

  // ── FAQ ──
  function openFaqEdit() { setEditFaqs([...faqs]); setEditModal("faq"); }
  async function saveFaq() {
    setSaving(true);
    await supabase.from("faq_items").delete().neq("id", "");
    const rows = editFaqs.map((f, i) => ({ question: f.question, answer: f.answer, display_order: i, is_active: true }));
    if (rows.length > 0) await supabase.from("faq_items").insert(rows);
    setFaqs(rows.map((r, i) => ({ id: String(i), ...r })));
    setSaving(false); setEditModal(null);
    toast.showToast("success", "FAQ berhasil disimpan");
  }

  // ── Marquee ──
  function openMarqueeEdit() { setEditMarquee([...marquee]); setEditModal("marquee"); }
  async function saveMarquee() {
    setSaving(true);
    await supabase.from("marquee_items").delete().neq("id", "");
    const rows = editMarquee.map((m, i) => ({ label: m.label, display_order: i, is_active: true }));
    if (rows.length > 0) await supabase.from("marquee_items").insert(rows);
    setMarquee(rows.map((r, i) => ({ id: String(i), ...r })));
    setSaving(false); setEditModal(null);
    toast.showToast("success", "Trust marquee berhasil disimpan");
  }

  // ── Helpers ──
  function CharCounter({ current, max }: { current: number; max: number }) {
    return <p className="text-[10px] mt-0.5" style={{ color: current > max * 0.9 ? "#8a6f42" : "var(--text-muted)" }}>{current}/{max}</p>;
  }

  if (loading) return <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><Loader2 size={24} className="animate-spin" style={{ color: "var(--gold)" }} /></section>;

  const sections = [
    { key: "hero", title: "Hero / Banner Utama", desc: hero.title_line1 + " " + hero.title_line2, active: hero.is_active, edit: openHeroEdit },
    { key: "koleksi", title: "Koleksi Pilihan", desc: `${featured.length} produk`, active: featured.length > 0, edit: openKoleksiEdit },
    { key: "steps", title: "Cara Pemesanan", desc: `${steps.length} langkah`, active: steps.length > 0, edit: openStepsEdit },
    { key: "garansi", title: "Jaminan SAMAQU", desc: `${garansi.length} jaminan + ${badges.length} badges`, active: true, edit: openGaransiEdit },
    { key: "faq", title: "FAQ", desc: `${faqs.length} pertanyaan`, active: true, edit: openFaqEdit },
    { key: "marquee", title: "Trust Marquee", desc: `${marquee.length} item scrolling`, active: true, edit: openMarqueeEdit },
    { key: "testimoni", title: "Testimoni Pelanggan", desc: "Kelola testimoni pelanggan", active: true, edit: null },
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
                  <span className="badge text-[10px]" style={{ background: s.active ? "#e7ecdf" : "#f0ebe5", color: s.active ? "#5b6b45" : "#6b5d50" }}>{s.active ? "Aktif" : "Kosong"}</span>
                </div>
                <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              </div>
              {s.key === "testimoni" ? (
                <Link href="/admin/testimoni" className="text-sm font-semibold px-4 py-2 rounded-lg shrink-0 text-center" style={{ background: "var(--gold)", color: "white" }}>
                  Kelola Testimoni
                </Link>
              ) : s.edit ? (
                <button onClick={s.edit} className="text-sm font-semibold px-4 py-2 rounded-lg shrink-0" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>
                  Edit Bagian
                </button>
              ) : null}
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
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Edit Hero</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <div className="space-y-4">
                {(["eyebrow_text", "title_line1", "title_line2", "description", "feature1", "feature2", "feature3"] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</label>
                    {field === "description" ? (
                      <textarea value={heroForm[field]} onChange={(e) => updateHeroField(field, e.target.value.slice(0, 150))} rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    ) : (
                      <input value={heroForm[field]} onChange={(e) => updateHeroField(field, e.target.value.slice(0, field === "eyebrow_text" ? 40 : 30))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    )}
                    <CharCounter current={heroForm[field].length} max={field === "description" ? 150 : field === "eyebrow_text" ? 40 : 30} />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Aktif</span>
                  <button onClick={() => updateHeroField("is_active", !heroForm.is_active)} style={{ color: heroForm.is_active ? "var(--gold)" : "var(--text-muted)" }}>
                    {heroForm.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={resetHeroToDefault} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--text-secondary)" }}><RotateCcw size={14} /> Reset</button>
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveHero} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Koleksi Modal ═══ */}
      <AnimatePresence>
        {editModal === "koleksi" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Koleksi Pilihan</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Pilih produk (max 8)</p>
              <div className="space-y-2 mb-4">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ background: selectedProducts.includes(p.id) ? "rgba(181,140,74,.08)" : "transparent", border: `1px solid ${selectedProducts.includes(p.id) ? "var(--gold)" : "rgba(64,50,37,.06)"}` }}>
                    <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={(e) => { if (e.target.checked && selectedProducts.length < 8) setSelectedProducts([...selectedProducts, p.id]); else if (!e.target.checked) setSelectedProducts(selectedProducts.filter((id) => id !== p.id)); }} style={{ accentColor: "var(--gold)" }} />
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: "#e8dfd1" }}><img src={p.image} alt="" className="w-full h-full object-cover" /></div>
                    <div className="min-w-0"><p className="text-sm font-medium truncate" style={{ color: "var(--espresso)" }}>{p.name}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.category}</p></div>
                  </label>
                ))}
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{selectedProducts.length}/8 dipilih</p>
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveKoleksi} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button>
              </div>
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
                    <input value={s.title} onChange={(e) => { const u = [...editSteps]; u[i] = { ...u[i], title: e.target.value.slice(0, 30) }; setEditSteps(u); }} placeholder="Judul" className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-1" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    <textarea value={s.description} onChange={(e) => { const u = [...editSteps]; u[i] = { ...u[i], description: e.target.value.slice(0, 100) }; setEditSteps(u); }} placeholder="Deskripsi" rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                  </div>
                ))}
              </div>
              {editSteps.length < 6 && <button onClick={() => setEditSteps([...editSteps, { id: String(Date.now()), step_number: editSteps.length + 1, title: "", description: "" }])} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah</button>}
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveSteps} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button>
              </div>
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
                    <input value={g.title} onChange={(e) => { const u = [...editGaransi]; u[i] = { ...u[i], title: e.target.value }; setEditGaransi(u); }} placeholder="Judul" className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    <textarea value={g.description} onChange={(e) => { const u = [...editGaransi]; u[i] = { ...u[i], description: e.target.value }; setEditGaransi(u); }} placeholder="Deskripsi" rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                  </div>
                ))}
              </div>

              <p className="text-sm font-medium mb-3" style={{ color: "var(--espresso)" }}>Trust Badges</p>
              <div className="space-y-2 mb-4">
                {editBadges.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={b.label} onChange={(e) => { const u = [...editBadges]; u[i] = { ...u[i], label: e.target.value }; setEditBadges(u); }} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    {editBadges.length > 1 && <button onClick={() => setEditBadges(editBadges.filter((_, j) => j !== i))} className="p-1"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                  </div>
                ))}
                {editBadges.length < 5 && <button onClick={() => setEditBadges([...editBadges, { id: String(Date.now()), label: "", display_order: editBadges.length }])} className="text-sm font-medium" style={{ color: "var(--gold)" }}><Plus size={14} className="inline mr-1" />Tambah Badge</button>}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveGaransi} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button>
              </div>
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
                      <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>FAQ {i + 1}</span>
                      {editFaqs.length > 1 && <button onClick={() => setEditFaqs(editFaqs.filter((_, j) => j !== i))} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                    </div>
                    <input value={f.question} onChange={(e) => { const u = [...editFaqs]; u[i] = { ...u[i], question: e.target.value }; setEditFaqs(u); }} placeholder="Pertanyaan" className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    <textarea value={f.answer} onChange={(e) => { const u = [...editFaqs]; u[i] = { ...u[i], answer: e.target.value }; setEditFaqs(u); }} placeholder="Jawaban" rows={3} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                  </div>
                ))}
              </div>
              {editFaqs.length < 8 && <button onClick={() => setEditFaqs([...editFaqs, { id: String(Date.now()), question: "", answer: "", display_order: editFaqs.length }])} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah FAQ</button>}
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveFaq} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Marquee Modal ═══ */}
      <AnimatePresence>
        {editModal === "marquee" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Trust Marquee</h3>
                <button onClick={() => setEditModal(null)}><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Teks yang scrolling di homepage</p>
              <div className="space-y-2 mb-4">
                {editMarquee.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={m.label} onChange={(e) => { const u = [...editMarquee]; u[i] = { ...u[i], label: e.target.value }; setEditMarquee(u); }} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    {editMarquee.length > 1 && <button onClick={() => setEditMarquee(editMarquee.filter((_, j) => j !== i))} className="p-1"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                  </div>
                ))}
              </div>
              {editMarquee.length < 6 && <button onClick={() => setEditMarquee([...editMarquee, { id: String(Date.now()), label: "", display_order: editMarquee.length }])} className="text-sm font-medium mb-4" style={{ color: "var(--gold)" }}><Plus size={14} className="inline mr-1" />Tambah Item</button>}
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveMarquee} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>{saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`.card { background: #fffdfb; border: 1px solid rgba(64,50,37,.06); border-radius: 1rem; box-shadow: 0 1px 2px rgba(64,50,37,.03); } .badge { font-size: .72rem; font-weight: 600; padding: .2rem .6rem; border-radius: 999px; white-space: nowrap; }`}</style>
    </section>
    </AdminShell>
  );
}
