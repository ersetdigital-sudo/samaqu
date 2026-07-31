"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { JenisKain } from "@/lib/katalog-data";

interface JenisKainFormProps {
  initialData?: JenisKain;
  onSave: (data: JenisKain) => void;
  onCancel: () => void;
}

export default function JenisKainForm({ initialData, onSave, onCancel }: JenisKainFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return alert("Nama kain wajib diisi");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
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
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid rgba(64,50,37,.15)", background: "white", color: "var(--espresso)" }} placeholder="Contoh: B-01, B-02, A-02" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid rgba(64,50,37,.15)" }}>Batal</button>
        <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
          {saving ? <><Loader2 size={14} className="animate-spin inline mr-1" /> Menyimpan...</> : "Simpan"}
        </button>
      </div>
    </div>
  );
}
