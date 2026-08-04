"use client";

import { useState } from "react";
import { colorMap } from "@/lib/katalog-data";

interface PresetColorPickerProps {
  existing: string[];
  onAdd: (color: string, hex?: string) => void;
}

// Picker warna admin: pilih dari daftar preset (colorMap) atau tambah warna
// baru manual kalau belum ada di daftar. Warna yang sudah terpakai
// (existing) disembunyikan dari preset supaya tidak klik dua kali.
export default function PresetColorPicker({ existing, onAdd }: PresetColorPickerProps) {
  const [customHex, setCustomHex] = useState("#141414");
  const [customColorName, setCustomColorName] = useState("");

  const usedKeys = new Set(existing.map((c) => c.toLowerCase()));

  function addCustomColor() {
    const nama = customColorName.trim();
    if (!nama) { alert("Nama warna wajib diisi."); return; }
    if (usedKeys.has(nama.toLowerCase())) { alert(`Warna "${nama}" sudah ada.`); return; }
    onAdd(nama, customHex);
    setCustomColorName("");
  }

  const presets = Object.entries(colorMap).filter(([name]) => !usedKeys.has(name.toLowerCase()));

  return (
    <div className="w-full rounded-xl p-3" style={{ border: "1px dashed rgba(181,140,74,.4)", background: "rgba(255,255,255,.4)" }}>
      <p className="text-[11px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>
        Pilih warna yang tersedia
      </p>
      {presets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {presets.map(([name, hex]) => (
            <button key={name} type="button" onClick={() => onAdd(name, hex)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all hover:scale-105"
              style={{ border: "1px solid rgba(201,183,156,.35)", color: "var(--coffee)", background: "rgba(255,255,255,.7)" }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hex, border: "1px solid rgba(42,33,27,.1)" }} />
              {name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
          Semua warna preset sudah terpakai — tambahkan warna baru di bawah.
        </p>
      )}
      <p className="text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
        atau tambah warna baru
      </p>
      <div className="flex items-center gap-1.5">
        <input type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} className="w-6 h-6 rounded-full border-0 cursor-pointer p-0 bg-transparent" title="Pilih warna" />
        <input value={customColorName} onChange={(e) => setCustomColorName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomColor(); } }}
          placeholder="Nama warna baru…" className="w-[130px] bg-transparent outline-none text-xs" style={{ color: "var(--espresso)" }} />
        <button type="button" onClick={addCustomColor} className="font-semibold hover:opacity-70">+</button>
      </div>
    </div>
  );
}
