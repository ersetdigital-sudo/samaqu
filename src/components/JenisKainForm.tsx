"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { JenisKain } from "@/lib/katalog-data";

interface JenisKainFormProps {
  initialData?: JenisKain;
  onSave: (data: JenisKain) => void;
  onCancel: () => void;
}

export default function JenisKainForm({ initialData, onSave, onCancel }: JenisKainFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [material, setMaterial] = useState(initialData?.material || "");
  const [texture, setTexture] = useState(initialData?.texture || "");
  const [suitableFor, setSuitableFor] = useState(initialData?.suitable_for || "");
  const [careInstructions, setCareInstructions] = useState(initialData?.care_instructions || "");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch {
      alert("Upload gagal");
    }
    setUploading(false);
  }

  async function handleSubmit() {
    if (!name.trim()) return alert("Nama kain wajib diisi");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        material: material.trim() || null,
        texture: texture.trim() || null,
        suitable_for: suitableFor.trim() || null,
        care_instructions: careInstructions.trim() || null,
        image_url: imageUrl || null,
        display_order: initialData?.display_order ?? 0,
      };

      if (initialData?.id) {
        const { data, error } = await supabase.from("jenis_kain").update(payload).eq("id", initialData.id).select().single();
        if (error) throw error;
        onSave(data as JenisKain);
      } else {
        const { data, error } = await supabase.from("jenis_kain").insert(payload).select().single();
        if (error) throw error;
        onSave(data as JenisKain);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Gagal menyimpan Jenis Kain");
    }
    setSaving(false);
  }

  return (
    <div className="p-4 rounded-xl space-y-3" style={{ border: "1px solid rgba(181,140,74,.3)", background: "rgba(181,140,74,.04)" }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>{initialData ? "Edit Jenis Kain" : "Tambah Jenis Kain Baru"}</p>
        <button onClick={onCancel} className="p-1 rounded hover:bg-red-50"><X size={16} style={{ color: "#e74c3c" }} /></button>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Nama Kain <span style={{ color: "var(--gold)" }}>*</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Contoh: Kain B-01" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Bahan</label>
          <input value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Katun Combed 30s" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Cocok Untuk</label>
          <input value={suitableFor} onChange={(e) => setSuitableFor(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Cuaca panas, sehari-hari" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Tekstur</label>
        <textarea value={texture} onChange={(e) => setTexture(e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Lembut, ringan, jatuh" />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Cara Perawatan</label>
        <textarea value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Cuci dingin, jangan diperas" />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Foto Tekstur Kain</label>
        <div className="flex items-center gap-3">
          {imageUrl && (
            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid rgba(64,50,37,.1)" }}>
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-lg transition-colors hover:bg-[rgba(64,50,37,.05)]" style={{ border: "1px dashed rgba(64,50,37,.2)", color: "var(--gold)" }}>
            <Upload size={14} />
            {uploading ? "Uploading..." : imageUrl ? "Ganti Foto" : "Upload Foto"}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
        <button onClick={handleSubmit} disabled={saving || uploading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
          {saving ? <><Loader2 size={14} className="animate-spin inline mr-1" /> Menyimpan...</> : "Simpan"}
        </button>
      </div>
    </div>
  );
}
