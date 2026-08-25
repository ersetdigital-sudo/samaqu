"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2, GripVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/AdminToast";
import ConfirmModal from "@/components/ConfirmModal";

interface BioLink {
  id: string;
  section: string;
  label: string;
  subtitle: string;
  href: string;
  icon: string;
  sort_order: number;
  enabled: boolean;
  target: string;
}

const SECTIONS = ["Belanja", "Informasi", "Tentang", "Ikuti"];

const ICON_OPTIONS = [
  { value: "shopping-bag", label: "Shopping Bag" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "tag", label: "Tag / Promo" },
  { value: "ruler", label: "Panduan Ukuran" },
  { value: "star", label: "Bintang / Review" },
  { value: "clipboard", label: "Clipboard" },
  { value: "shield", label: "Shield / Garansi" },
  { value: "info", label: "Info" },
  { value: "book", label: "Buku" },
  { value: "instagram", label: "Instagram" },
  { value: "globe", label: "Globe / Website" },
  { value: "link", label: "Link Default" },
  { value: "home", label: "Home" },
  { value: "heart", label: "Heart" },
];

function getIconSVG(name: string) {
  const map: Record<string, string> = {
    "shopping-bag": "M6 8h12l1 12H5L6 8zM9 8V6a3 3 0 0 1 6 0v2",
    whatsapp: "M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5zM8.7 9.2c.3 2.6 3.5 5.4 5.9 5.7l1.2-1.4 1.7 1-.8 1.5c-2.9.6-7.6-3.3-8.6-6.6l1.4-.9 1 1.6-1.8-.9z",
    tag: "M20 12l-8 8-8-8V4h8l8 8zM8.5 8.5h.01",
    ruler: "M15 4l5 5L8 21H3v-5L15 4z",
    star: "M12 4l2.4 5 5.6.7-4 3.8 1 5.5-5-2.7-5 2.7 1-5.5-4-3.8 5.6-.7L12 4z",
    clipboard: "M5 4h14a1 1 0 0 1 1 1v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM9 3h6v3H9zM9 11h6M9 15h4",
    shield: "M12 3l7 3v6c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6l7-3zM9 12l2 2 4-4",
    info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zM13 9h-2V7h2v2z",
    book: "M3 5h6a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H3V5zM21 5h-6a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h6V5z",
    instagram: "M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 21a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM17 7h.01",
    globe: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM2 12h20M12 2c2.5 2.7 2.5 15.3 0 18M12 2c-2.5 2.7-2.5 15.3 0 18",
    home: "M4 21V7l8-4 8 4v14M10 21v-6h4v6",
    heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  };
  return map[name] || map.link;
}

const emptyForm = {
  section: "Belanja",
  label: "",
  subtitle: "",
  href: "#",
  icon: "link",
  sort_order: 0,
  enabled: true,
  target: "",
};

export default function BiolinkPage() {
  const [links, setLinks] = useState<BioLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BioLink | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} });
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    setLoading(true);
    const { data } = await supabase.from("bio_links").select("*").order("section").order("sort_order");
    if (data) setLinks(data);
    setLoading(false);
  }

  function openAdd(section: string) {
    setEditing(null);
    const maxOrder = links.filter((l) => l.section === section).reduce((max, l) => Math.max(max, l.sort_order), 0);
    setForm({ ...emptyForm, section, sort_order: maxOrder + 1 });
    setModalOpen(true);
  }

  function openEdit(link: BioLink) {
    setEditing(link);
    setForm({
      section: link.section,
      label: link.label,
      subtitle: link.subtitle || "",
      href: link.href || "#",
      icon: link.icon || "link",
      sort_order: link.sort_order,
      enabled: link.enabled,
      target: link.target || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.label.trim()) {
      toast.showToast("error", "Label wajib diisi");
      return;
    }
    setSaving(true);

    if (editing) {
      const { error } = await supabase.from("bio_links").update(form).eq("id", editing.id);
      if (error) {
        toast.showToast("error", "Gagal menyimpan");
        setSaving(false);
        return;
      }
      setLinks(links.map((l) => (l.id === editing.id ? { ...l, ...form } : l)));
      toast.showToast("success", "Link berhasil diperbarui");
    } else {
      const { data, error } = await supabase.from("bio_links").insert(form).select().single();
      if (error) {
        toast.showToast("error", "Gagal menyimpan");
        setSaving(false);
        return;
      }
      setLinks([...links, data]);
      toast.showToast("success", "Link berhasil ditambahkan");
    }
    setModalOpen(false);
    setSaving(false);
  }

  function handleDelete(link: BioLink) {
    setConfirmModal({
      open: true,
      onConfirm: async () => {
        await supabase.from("bio_links").delete().eq("id", link.id);
        setLinks(links.filter((l) => l.id !== link.id));
        toast.showToast("success", "Link berhasil dihapus");
        setConfirmModal({ open: false, onConfirm: () => {} });
      },
    });
  }

  async function toggleEnabled(link: BioLink) {
    const newVal = !link.enabled;
    await supabase.from("bio_links").update({ enabled: newVal }).eq("id", link.id);
    setLinks(links.map((l) => (l.id === link.id ? { ...l, enabled: newVal } : l)));
  }

  async function moveLink(link: BioLink, direction: "up" | "down") {
    const sectionLinks = links.filter((l) => l.section === link.section).sort((a, b) => a.sort_order - b.sort_order);
    const idx = sectionLinks.findIndex((l) => l.id === link.id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sectionLinks.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const swapLink = sectionLinks[swapIdx];

    await supabase.from("bio_links").update({ sort_order: swapLink.sort_order }).eq("id", link.id);
    await supabase.from("bio_links").update({ sort_order: link.sort_order }).eq("id", swapLink.id);

    setLinks((prev) =>
      prev.map((l) => {
        if (l.id === link.id) return { ...l, sort_order: swapLink.sort_order };
        if (l.id === swapLink.id) return { ...l, sort_order: link.sort_order };
        return l;
      })
    );
  }

  return (
    <AdminShell>
      <section className="p-5 lg:p-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--espresso)" }}>Biolink</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Kelola link di halaman samaqu.id/bio</p>
        </div>

        {loading ? (
          <div className="card p-12 flex justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--gold)" }} />
          </div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map((section) => {
              const sectionLinks = links.filter((l) => l.section === section).sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div key={section} className="rounded-2xl overflow-hidden" style={{ background: "#fffdfb", border: "1px solid rgba(64,50,37,.06)", boxShadow: "0 1px 3px rgba(64,50,37,.04)" }}>
                  <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid rgba(64,50,37,.08)", background: "rgba(200,169,126,.06)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(200,169,126,.15)" }}>
                        <GripVertical size={14} style={{ color: "var(--gold)" }} />
                      </div>
                      <h2 className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>{section}</h2>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(64,50,37,.06)", color: "var(--text-muted)" }}>{sectionLinks.length}</span>
                    </div>
                    <button
                      onClick={() => openAdd(section)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--gold)", border: "1px solid rgba(200,169,126,.25)" }}
                    >
                      <Plus size={14} /> Tambah
                    </button>
                  </div>

                  <div className="divide-y" style={{ borderColor: "rgba(64,50,37,.06)" }}>
                    {sectionLinks.map((link) => (
                      <div key={link.id} className="flex items-center gap-3 px-5 py-3.5 group" style={{ opacity: link.enabled ? 1 : 0.5 }}>
                        {/* Icon preview */}
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(180deg, #ece6dd, #e3dcd1)" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1613" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d={getIconSVG(link.icon)} />
                          </svg>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate" style={{ color: "var(--espresso)" }}>{link.label}</span>
                            {link.target === "_blank" && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                              </svg>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{link.href}</span>
                            {link.subtitle && <span className="text-[11px]" style={{ color: "var(--gold)" }}>| {link.subtitle}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveLink(link, "up")} className="p-1.5 rounded-lg text-[11px]" style={{ color: "var(--text-muted)" }} title="Naik">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                          </button>
                          <button onClick={() => moveLink(link, "down")} className="p-1.5 rounded-lg text-[11px]" style={{ color: "var(--text-muted)" }} title="Turun">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                        </div>

                        <button
                          onClick={() => toggleEnabled(link)}
                          className="w-9 h-5 rounded-full transition-colors relative shrink-0"
                          style={{ background: link.enabled ? "var(--gold)" : "rgba(64,50,37,.15)" }}
                          title={link.enabled ? "Nonaktifkan" : "Aktifkan"}
                        >
                          <div
                            className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                            style={{ left: link.enabled ? "18px" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }}
                          />
                        </button>

                        <button onClick={() => openEdit(link)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--gold)", border: "1px solid rgba(64,50,37,.12)" }} title="Edit">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(link)} className="p-1.5 rounded-lg transition-colors" style={{ color: "#e74c3c", border: "1px solid rgba(231,76,60,.15)" }} title="Hapus">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {sectionLinks.length === 0 && (
                      <div className="px-5 py-6 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
                        Belum ada link. Klik "Tambah" untuk menambahkan.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(42,33,27,.4)", backdropFilter: "blur(4px)" }} onClick={() => setModalOpen(false)}>
            <div className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: "var(--cream)", boxShadow: "0 25px 60px -12px rgba(42,33,27,.5)" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>{editing ? "Edit Link" : "Tambah Link"}</h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}><X size={18} /></button>
              </div>

              <div className="space-y-4">
                {/* Section */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Section</label>
                  <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}>
                    {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Label *</label>
                  <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Lihat Koleksi Samaqu" />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Subtitle (opsional)</label>
                  <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Official Website" />
                </div>

                {/* Href */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>URL</label>
                  <input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="https://..." />
                </div>

                {/* Target */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Buka di</label>
                  <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }}>
                    <option value="">Tab yang sama</option>
                    <option value="_blank">Tab baru</option>
                  </select>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Ikon</label>
                  <div className="grid grid-cols-7 gap-2">
                    {ICON_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setForm({ ...form, icon: opt.value })}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
                        style={{
                          border: form.icon === opt.value ? "2px solid var(--gold)" : "1px solid rgba(64,50,37,.12)",
                          background: form.icon === opt.value ? "rgba(200,169,126,.1)" : "white",
                        }}
                        title={opt.label}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={form.icon === opt.value ? "var(--gold)" : "var(--espresso)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d={getIconSVG(opt.value)} />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort order */}
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Urutan</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} />
                </div>

                {/* Enabled */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
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

        <ConfirmModal open={confirmModal.open} title="Hapus Link?" message="Link yang dihapus tidak bisa dikembalikan." onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ open: false, onConfirm: () => {} })} />
      </section>
    </AdminShell>
  );
}
