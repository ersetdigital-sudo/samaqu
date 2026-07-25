"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2, ToggleLeft, ToggleRight, GripVertical, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/katalog-data";

interface HeroContent { tagline: string; is_active: boolean; }
interface FeaturedProduct { id: string; product_id: string; display_order: number; is_active: boolean; }
interface OrderStep { id: string; step_number: number; title: string; description: string; is_active: boolean; }

export default function KontenWebsitePage() {
  const [hero, setHero] = useState<HeroContent | null>(null);
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [steps, setSteps] = useState<OrderStep[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [heroTagline, setHeroTagline] = useState("");
  const [heroActive, setHeroActive] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editSteps, setEditSteps] = useState<OrderStep[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [heroRes, featuredRes, stepsRes, productsRes] = await Promise.all([
        supabase.from("hero_content").select("*").eq("id", 1).single(),
        supabase.from("featured_products").select("*").order("display_order"),
        supabase.from("order_steps").select("*").order("step_number"),
        supabase.from("products").select("*").order("name"),
      ]);
      if (heroRes.data) setHero(heroRes.data);
      if (featuredRes.data) setFeatured(featuredRes.data);
      if (stepsRes.data) setSteps(stepsRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  function openHeroEdit() {
    setHeroTagline(hero?.tagline || "");
    setHeroActive(hero?.is_active ?? true);
    setEditModal("hero");
  }

  function openKoleksiEdit() {
    setSelectedProducts(featured.map((f) => f.product_id));
    setEditModal("koleksi");
  }

  function openStepsEdit() {
    setEditSteps([...steps]);
    setEditModal("steps");
  }

  async function saveHero() {
    setSaving(true);
    await supabase.from("hero_content").upsert({ id: 1, tagline: heroTagline, is_active: heroActive, updated_at: new Date().toISOString() });
    setHero({ tagline: heroTagline, is_active: heroActive });
    setSaving(false);
    setEditModal(null);
  }

  async function saveKoleksi() {
    setSaving(true);
    await supabase.from("featured_products").delete().neq("id", "");
    const rows = selectedProducts.map((pid, i) => ({ product_id: pid, display_order: i, is_active: true }));
    if (rows.length > 0) await supabase.from("featured_products").insert(rows);
    setFeatured(rows.map((r, i) => ({ id: String(i), ...r })));
    setSaving(false);
    setEditModal(null);
  }

  async function saveSteps() {
    setSaving(true);
    await supabase.from("order_steps").delete().neq("id", "");
    const rows = editSteps.map((s, i) => ({ step_number: i + 1, title: s.title, description: s.description, is_active: true }));
    if (rows.length > 0) await supabase.from("order_steps").insert(rows);
    setSteps(rows.map((r, i) => ({ id: String(i), ...r })));
    setSaving(false);
    setEditModal(null);
  }

  function addStep() {
    setEditSteps([...editSteps, { id: String(Date.now()), step_number: editSteps.length + 1, title: "", description: "", is_active: true }]);
  }

  function removeStep(idx: number) {
    setEditSteps(editSteps.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: string, value: string) {
    const updated = [...editSteps];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditSteps(updated);
  }

  if (loading) {
    return <section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><Loader2 size={24} className="animate-spin" style={{ color: "var(--gold)" }} /></section>;
  }

  const sections = [
    { key: "hero", title: "Hero / Banner Utama", desc: hero?.tagline || "Tagline di homepage", status: hero?.is_active ? "Aktif" : "Nonaktif", active: hero?.is_active ?? true, edit: openHeroEdit },
    { key: "koleksi", title: "Koleksi Pilihan", desc: `${featured.length} produk ditampilkan di beranda`, status: featured.length > 0 ? "Aktif" : "Kosong", active: featured.length > 0, edit: openKoleksiEdit },
    { key: "steps", title: "Cara Pemesanan", desc: `${steps.length} langkah pemesanan`, status: steps.length > 0 ? "Aktif" : "Kosong", active: steps.length > 0, edit: openStepsEdit },
    { key: "testimoni", title: "Testimoni Pelanggan", desc: "Dikelola dari halaman Testimoni", status: "Aktif", active: true, edit: () => {} },
  ];

  return (
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
                  <span className="badge text-[10px]" style={{ background: s.active ? "#e7ecdf" : "#f0ebe5", color: s.active ? "#5b6b45" : "#6b5d50" }}>{s.status}</span>
                </div>
                <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              </div>
              {s.key !== "testimoni" && (
                <button onClick={s.edit} className="text-sm font-semibold px-4 py-2 rounded-lg shrink-0" style={{ border: "1px solid rgba(64,50,37,.15)", color: "var(--gold)" }}>
                  Edit Bagian
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hero Edit Modal */}
      <AnimatePresence>
        {editModal === "hero" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Edit Hero</h3>
                <button onClick={() => setEditModal(null)} className="p-1"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tagline</label>
                  <input value={heroTagline} onChange={(e) => setHeroTagline(e.target.value.slice(0, 60))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                  <p className="text-[11px] mt-1" style={{ color: heroTagline.length > 55 ? "#8a6f42" : "var(--text-muted)" }}>{heroTagline.length}/60 karakter</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Tampilkan di homepage</span>
                  <button onClick={() => setHeroActive(!heroActive)} style={{ color: heroActive ? "var(--gold)" : "var(--text-muted)" }}>
                    {heroActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveHero} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
                  {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Koleksi Edit Modal */}
      <AnimatePresence>
        {editModal === "koleksi" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Koleksi Pilihan</h3>
                <button onClick={() => setEditModal(null)} className="p-1"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Pilih produk yang tampil di beranda (max 8)</p>
              <div className="space-y-2 mb-4">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors" style={{ background: selectedProducts.includes(p.id) ? "rgba(181,140,74,.08)" : "transparent", border: `1px solid ${selectedProducts.includes(p.id) ? "var(--gold)" : "rgba(64,50,37,.06)"}` }}>
                    <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={(e) => {
                      if (e.target.checked && selectedProducts.length < 8) setSelectedProducts([...selectedProducts, p.id]);
                      else if (!e.target.checked) setSelectedProducts(selectedProducts.filter((id) => id !== p.id));
                    }} className="rounded" style={{ accentColor: "var(--gold)" }} />
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: "#e8dfd1" }}>
                      <img src={p.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--espresso)" }}>{p.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.category} · Rp {p.price.toLocaleString("id-ID")}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{selectedProducts.length}/8 produk dipilih</p>
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveKoleksi} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
                  {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps Edit Modal */}
      <AnimatePresence>
        {editModal === "steps" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.4)" }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Cara Pemesanan</h3>
                <button onClick={() => setEditModal(null)} className="p-1"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <div className="space-y-4 mb-4">
                {editSteps.map((s, i) => (
                  <div key={s.id} className="p-4 rounded-xl" style={{ border: "1px solid rgba(64,50,37,.1)", background: "rgba(255,255,255,.5)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: "var(--gold)" }}>Langkah {i + 1}</span>
                      {editSteps.length > 1 && <button onClick={() => removeStep(i)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} style={{ color: "#e74c3c" }} /></button>}
                    </div>
                    <input value={s.title} onChange={(e) => updateStep(i, "title", e.target.value.slice(0, 30))} placeholder="Judul langkah" className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    <p className="text-[10px] mb-2" style={{ color: s.title.length > 25 ? "#8a6f42" : "var(--text-muted)" }}>{s.title.length}/30</p>
                    <textarea value={s.description} onChange={(e) => updateStep(i, "description", e.target.value.slice(0, 100))} placeholder="Deskripsi langkah" rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                    <p className="text-[10px] mt-1" style={{ color: s.description.length > 90 ? "#8a6f42" : "var(--text-muted)" }}>{s.description.length}/100</p>
                  </div>
                ))}
              </div>
              {editSteps.length < 6 && (
                <button onClick={addStep} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: "var(--gold)" }}><Plus size={14} /> Tambah Langkah</button>
              )}
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
                <button onClick={saveSteps} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
                  {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`.card { background: #fffdfb; border: 1px solid rgba(64,50,37,.06); border-radius: 1rem; box-shadow: 0 1px 2px rgba(64,50,37,.03); } .badge { font-size: .72rem; font-weight: 600; padding: .2rem .6rem; border-radius: 999px; white-space: nowrap; }`}</style>
    </section>
  );
}
