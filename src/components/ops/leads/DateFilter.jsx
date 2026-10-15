"use client";

/**
 * Filter TANGGAL (satu tanggal) untuk Daftar Leads.
 *
 * Melengkapi kotak cari + pemilih bulan: tombol "Semua tanggal" membuka popover kalender,
 * memilih satu tanggal menutup popover, dan tombolnya berubah jadi tanggal terpilih dengan
 * tombol x (hapus filter) serta panah kiri/kanan (pindah hari).
 *
 * Semua tanggal dihitung dalam WIB (Asia/Jakarta) dan memakai string "YYYY-MM-DD" — sama
 * seperti kolom `leads.tanggal`, jadi leads dini hari tidak salah hari.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const pad = (n) => String(n).padStart(2, "0");

/** Tanggal hari ini menurut WIB (UTC+7) dalam bentuk YYYY-MM-DD. */
function todayWib() {
  const w = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(w.getUTCDate())}`;
}

/** "2026-10-01" → "1 Oktober 2026". */
export function formatTanggalID(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Geser tanggal ISO sejumlah hari (aman lintas bulan/tahun). */
function shiftIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export default function DateFilter({
  value = "",
  onChange,
  month,
  year,
  onMonthChange,
  /** Tanggal (YYYY-MM-DD) yang punya leads — dipakai untuk titik penanda. */
  markedDates = [],
  /** Keterangan titik penanda; menu Transaksi memakai "ada transaksi". */
  markedLabel = "ada leads",
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({ y: year, m: month }));
  const rootRef = useRef(null);
  const today = todayWib();
  const yesterday = shiftIso(today, -1);

  // Kalender mengikuti bulan yang dipilih di halaman.
  useEffect(() => {
    setView({ y: year, m: month });
  }, [month, year]);

  // Tutup saat klik di luar / tekan Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const marked = useMemo(() => new Set(markedDates), [markedDates]);
  const daysInView = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Senin = 0
  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInView }, (_, i) => i + 1),
  ];
  const viewCanGoNext = `${view.y}-${pad(view.m + 1)}` < today.slice(0, 7);

  const shiftView = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  function pick(iso) {
    if (iso > today) return; // tanggal masa depan tidak bisa dipilih
    onChange(iso);
    setOpen(false);
    const yy = Number(iso.slice(0, 4));
    const mm = Number(iso.slice(5, 7)) - 1;
    if (yy !== year || mm !== month) onMonthChange?.(yy, mm);
  }

  function stepDay(delta) {
    const next = shiftIso(value, delta);
    if (next > today) return;
    onChange(next);
    const yy = Number(next.slice(0, 4));
    const mm = Number(next.slice(5, 7)) - 1;
    if (yy !== year || mm !== month) onMonthChange?.(yy, mm);
  }

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1">
        {value ? (
          <>
            <button
              type="button"
              onClick={() => stepDay(-1)}
              aria-label="Hari sebelumnya"
              className="h-11 w-9 grid place-items-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={open}
              className="h-11 px-3 flex items-center gap-2 rounded-lg text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <CalendarDays size={15} className="text-blue-600 dark:text-blue-400" />
              <span className="whitespace-nowrap">{formatTanggalID(value)}</span>
            </button>
            <button
              type="button"
              onClick={() => stepDay(1)}
              disabled={shiftIso(value, 1) > today}
              aria-label="Hari berikutnya"
              className="h-11 w-9 grid place-items-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-transparent"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Hapus filter tanggal"
              className="h-11 w-9 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="h-11 px-3 flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <CalendarDays size={15} />
            Semua tanggal
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Pilih tanggal"
          className="absolute right-0 z-40 mt-2 w-[min(92vw,320px)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d28] p-3 shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftView(-1)}
              aria-label="Bulan sebelumnya"
              className="h-11 w-11 grid place-items-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {MONTHS[view.m]} {view.y}
            </p>
            <button
              type="button"
              onClick={() => shiftView(1)}
              disabled={!viewCanGoNext}
              aria-label="Bulan berikutnya"
              className="h-11 w-11 grid place-items-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-transparent"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Pintasan */}
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => pick(today)}
              className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400"
            >
              Hari ini
            </button>
            <button
              type="button"
              onClick={() => pick(yesterday)}
              className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400"
            >
              Kemarin
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DOW.map((d) => (
              <span key={d} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={`empty-${i}`} />;
              const iso = `${view.y}-${pad(view.m + 1)}-${pad(day)}`;
              const disabled = iso > today;
              const active = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => pick(iso)}
                  disabled={disabled}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={active}
                  className={`relative h-11 rounded-lg text-xs font-bold transition-colors ${
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                      : disabled
                        ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {day}
                  {marked.has(iso) && (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                        active ? "bg-white" : "bg-blue-500"
                      }`}
                    />
                  )}
                  {isToday && !active && (
                    <span className="absolute inset-x-2 top-1 h-0.5 rounded-full bg-blue-500/70" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {markedLabel}
            <span className="ml-2 w-4 h-0.5 rounded-full bg-blue-500/70" /> hari ini
          </p>
        </div>
      )}
    </div>
  );
}
