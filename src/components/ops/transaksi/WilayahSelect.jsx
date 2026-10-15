"use client";

/**
 * Dropdown yang bisa dicari untuk Provinsi / Kota / Kecamatan.
 *
 * Dipakai supaya nama kota seragam (bukan ketik bebas) — pilihannya datang dari
 * `/api/ops/wilayah`, yang sumbernya dataset area J&T yang sudah dipakai pengiriman.
 * Nilai yang sedang terpilih tetap ditampilkan walau tidak ada di daftar (mis. alamat lama),
 * jadi transaksi lama tidak kehilangan alamatnya saat diubah.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export default function WilayahSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "— Pilih —",
  disabled = false,
  loading = false,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle ? options.filter((option) => option.toLowerCase().includes(needle)) : options;
    // Nilai terpilih tetap muncul walau tidak ada di daftar.
    if (value && !filtered.includes(value)) return [value, ...filtered];
    return filtered.slice(0, 80);
  }, [options, query, value]);

  const pick = (option) => {
    onChange(option);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
          {label} <span className="text-red-500">*</span>
        </label>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 bg-gray-50 dark:bg-slate-900 text-left text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-red-300 dark:border-red-900/60" : "border-gray-200 dark:border-slate-700"
        } ${open ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30" : ""}`}
      >
        <span className={`truncate ${value ? "text-slate-900 dark:text-white" : "text-slate-400 font-normal"}`}>
          {value || (loading ? "Memuat…" : placeholder)}
        </span>
        <ChevronDown size={15} className="shrink-0 text-slate-400" />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d28] shadow-xl overflow-hidden">
          <div className="relative border-b border-slate-100 dark:border-slate-800">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ketik untuk mencari…"
              className="w-full px-3 py-2.5 pr-8 text-sm outline-none bg-transparent text-slate-900 dark:text-white placeholder-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600"
                aria-label="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {list.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">Tidak ada pilihan yang cocok.</p>
            ) : (
              list.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => pick(option)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    option === value ? "font-bold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {option === value ? <Check size={14} className="shrink-0 text-blue-600" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error ? <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">{error}</p> : null}
    </div>
  );
}
