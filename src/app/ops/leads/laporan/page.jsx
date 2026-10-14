"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/ops-api";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  CheckCircle2,
  Target,
  Megaphone,
  BarChart3,
  Database,
  TrendingUp,
  FileDown,
  Loader2,
  Check,
  Copy,
} from "lucide-react";
import DateFilter from "@/components/ops/leads/DateFilter";
import LeadsTrendChart from "@/components/ops/leads/LeadsTrendChart";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const SOURCES = ["Meta ads", "WA", "IG", "Website"];

const pad = (n) => String(n).padStart(2, '0');
const formatRupiah = (value) => (value || 0).toLocaleString('id-ID');
const formatTanggalID = (d) => {
  if (!d) return '-';
  const parts = String(d).split('-');
  if (parts.length < 3) return d;
  return `${parseInt(parts[2], 10)} ${MONTHS[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}`;
};
const formatTanggalPendek = (d) => {
  const parts = String(d).split('-');
  return parts.length < 3 ? d : `${parts[2]}/${parts[1]}`;
};

const SUMBER_STYLES = {
  "Meta ads": "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  "WA": "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  "IG": "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
  "Website": "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
};

export default function LaporanLeads() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  // Filter per tanggal: SATU hari di dalam bulan terpilih (kosong = seluruh bulan).
  // Memakai komponen DateFilter yang sama dengan menu Leads.
  const [selectedDate, setSelectedDate] = useState("");
  // Status tombol Export PDF / Salin ringkasan.
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [copied, setCopied] = useState(false);

  const start = `${year}-${pad(month + 1)}-01`;
  const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads_report', start, end],
    queryFn: async () => {
      const page = await base44.entities.Lead.filter({ tanggal: { $gte: start, $lte: end } }, { sort: 'tanggal', limit: 1000 });
      return page.items || [];
    },
  });

  // Rekap per tanggal: { tanggal, per sumber, total, closing, closingMetaAds }
  const dailyRows = useMemo(() => {
    const map = {};
    leads.forEach((l) => {
      if (!map[l.tanggal]) {
        map[l.tanggal] = { tanggal: l.tanggal, perSumber: {}, perSumberClosing: {}, perSumberNominal: {}, total: 0, closing: 0, closingMetaAds: 0, nominal: 0 };
      }
      const row = map[l.tanggal];
      row.perSumber[l.sumber] = (row.perSumber[l.sumber] || 0) + 1;
      row.total += 1;
      if (l.status === 'closing') {
        row.closing += 1;
        row.perSumberClosing[l.sumber] = (row.perSumberClosing[l.sumber] || 0) + 1;
        row.perSumberNominal[l.sumber] = (row.perSumberNominal[l.sumber] || 0) + (l.nominal || 0);
        row.nominal += l.nominal || 0;
        if (l.sumber === 'Meta ads') row.closingMetaAds += 1;
      }
    });
    return Object.values(map).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [leads]);

  // Filter per tanggal: satu hari di dalam bulan terpilih (kosong = seluruh bulan).
  const rangeActive = selectedDate !== "";
  /** Tanggal yang punya leads di bulan ini — untuk titik penanda di kalender. */
  const markedDates = useMemo(() => dailyRows.map((row) => row.tanggal), [dailyRows]);
  const rowsInRange = useMemo(
    () => (rangeActive ? dailyRows.filter((row) => row.tanggal === selectedDate) : dailyRows),
    [dailyRows, selectedDate, rangeActive]
  );
  /** Label periode aktif: "13 Oktober 2026" saat difilter satu hari, kalau tidak nama bulan. */
  const rangeLabel = rangeActive ? formatTanggalID(selectedDate) : `${MONTHS[month]} ${year}`;

  const totals = useMemo(() => {
    return rowsInRange.reduce(
      (acc, r) => {
        SOURCES.forEach((s) => {
          acc.perSumber[s] = (acc.perSumber[s] || 0) + (r.perSumber[s] || 0);
          acc.perSumberClosing[s] = (acc.perSumberClosing[s] || 0) + (r.perSumberClosing[s] || 0);
          acc.perSumberNominal[s] = (acc.perSumberNominal[s] || 0) + (r.perSumberNominal[s] || 0);
        });
        acc.total += r.total;
        acc.closing += r.closing;
        acc.closingMetaAds += r.closingMetaAds;
        acc.nominal += r.nominal;
        return acc;
      },
      { perSumber: {}, perSumberClosing: {}, perSumberNominal: {}, total: 0, closing: 0, closingMetaAds: 0, nominal: 0 }
    );
  }, [rowsInRange]);

  const rate = totals.total ? (totals.closing / totals.total) * 100 : 0;
  const bestSource = SOURCES.reduce((best, s) => ((totals.perSumber[s] || 0) > (totals.perSumber[best] || 0) ? s : best), SOURCES[0]);

  const statCards = [
    { label: "Total Leads", value: totals.total, icon: Users, chip: "bg-blue-500" },
    { label: "Total Closing", value: totals.closing, icon: CheckCircle2, chip: "bg-emerald-500" },
    { label: "Konversi", value: `${rate.toFixed(1)}%`, icon: Target, chip: "bg-purple-500" },
    { label: "Nominal Closing", value: `Rp ${formatRupiah(totals.nominal)}`, icon: TrendingUp, chip: "bg-teal-500" },
  ];

  const prevMonth = () => {
    setSelectedDate("");
    if (month === 0) { setMonth(11); setYear(year - 1); } else { setMonth(month - 1); }
  };
  const nextMonth = () => {
    setSelectedDate("");
    if (month === 11) { setMonth(0); setYear(year + 1); } else { setMonth(month + 1); }
  };

  /** Export PDF bulan terpilih — dibuat di server (data & definisi sama dengan halaman). */
  async function handleExportPdf() {
    setExportError("");
    setExporting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const bulan = `${year}-${pad(month + 1)}`;
      const res = await fetch(`/api/ops/leads/report?bulan=${bulan}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || `Gagal membuat laporan (${res.status})`);
      }
      const blob = await res.blob();
      const match = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] || `Laporan-Leads-SAMAQU-${MONTHS[month]}-${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err?.message || "Gagal membuat laporan PDF");
    } finally {
      setExporting(false);
    }
  }

  /** Salin ringkasan teks (tanpa emoji) untuk caption WhatsApp. */
  async function handleCopySummary() {
    setExportError("");
    const lines = [
      `Laporan Leads SAMAQU — ${MONTHS[month]} ${year}`,
      `Periode: ${rangeActive ? rangeLabel : `${MONTHS[month]} ${year}`}`,
      `Total leads: ${totals.total}`,
      `Total closing: ${totals.closing}`,
      `Konversi: ${rate.toFixed(1)}%`,
      `Sumber terbesar: ${bestSource} (${totals.perSumber[bestSource] || 0})`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setExportError("Gagal menyalin. Browser memblokir akses clipboard.");
    }
  }

  const SOURCE_CARD_CONFIG = {
    "Meta ads": { icon: Megaphone, chip: "bg-indigo-500" },
    "WA": { icon: MessageCircle, chip: "bg-green-500" },
    "IG": { icon: Target, chip: "bg-pink-500" },
    "Website": { icon: Users, chip: "bg-blue-500" },
  };

  // Data grafik: label "01/10" untuk sumbu X, tanggal lengkap untuk tooltip.
  const chartData = rowsInRange.map((r, i) => ({
    i,
    label: formatTanggalPendek(r.tanggal),
    full: formatTanggalID(r.tanggal),
    leads: r.total,
    closing: r.closing,
  }));
  const peakPoint = chartData.reduce((best, d) => (d.leads > (best?.leads ?? -1) ? d : best), null);
  const peakLabel = peakPoint && peakPoint.leads > 0 ? `puncak ${peakPoint.label}, ${peakPoint.leads} leads` : "";
  const chartSubtitle = rangeActive
    ? `${rangeLabel}${peakLabel ? `, ${peakLabel}` : ""}`
    : `Per tanggal, ${rangeLabel}${peakLabel ? `, ${peakLabel}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#18181b] to-[#27272a] rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold font-heading">Laporan Leads</h1>
              <p className="text-white/80 text-sm font-medium mt-1">Rekap leads & closing bulanan</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-xl p-1 border border-white/20">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/20 transition-colors" aria-label="Bulan sebelumnya">
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 text-sm font-bold min-w-[130px] text-center">
                {MONTHS[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/20 transition-colors" aria-label="Bulan berikutnya">
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 text-sm font-bold shadow-sm transition-colors hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              {exporting ? "Menyiapkan laporan..." : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm text-white text-sm font-bold transition-colors hover:bg-white/25"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Tersalin" : "Salin ringkasan"}
            </button>
          </div>
        </div>
        {exportError && (
          <p className="mt-3 text-xs font-semibold text-red-50 bg-red-500/25 border border-red-200/40 rounded-lg px-3 py-2">
            {exportError}
          </p>
        )}
      </div>

      {/* Filter per tanggal — komponen yang sama dengan menu Leads */}
      <div className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pilih tanggal</p>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <DateFilter
              value={selectedDate}
              onChange={setSelectedDate}
              month={month}
              year={year}
              onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
              markedDates={markedDates}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rangeActive ? (
                <>Difilter: <span className="font-bold text-slate-900 dark:text-white">{rangeLabel}</span></>
              ) : (
                "Menampilkan seluruh bulan"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${c.chip} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon size={19} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{c.label}</p>
                  <p className="text-xl font-black font-heading text-slate-900 dark:text-white tracking-tight truncate">{c.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card per Sumber */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-1">Performa per Sumber</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {SOURCES.map((s) => {
            const cfg = SOURCE_CARD_CONFIG[s];
            const Icon = cfg.icon;
            const totalLeads = totals.perSumber[s] || 0;
            const totalClosing = totals.perSumberClosing[s] || 0;
            const conv = totalLeads ? (totalClosing / totalLeads) * 100 : 0;
            return (
              <div key={s} className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${cfg.chip} rounded-xl flex items-center justify-center`}>
                    <Icon size={19} className="text-white" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${SUMBER_STYLES[s]}`}>{s}</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Leads</p>
                    <p className="text-2xl font-black font-heading text-slate-900 dark:text-white mt-0.5 tracking-tight">{totalLeads}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Closing</p>
                    <p className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-tight">{totalClosing}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Konversi</span>
                  <span className={`text-xs font-black ${conv >= rate ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'}`}>{conv.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${conv}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-emerald-500"
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nominal</span>
                  <span className="text-sm font-black text-teal-600 dark:text-teal-400">
                    {(totals.perSumberNominal[s] || 0) > 0 ? `Rp ${formatRupiah(totals.perSumberNominal[s])}` : 'Rp 0'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sumber Terbaik + Chart */}
      <div className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Leads Masuk vs Closing</p>
        {isLoading ? (
          <div className="h-64 sm:h-72 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <LeadsTrendChart
            data={chartData}
            subtitle={chartSubtitle}
            emptyMessage={rangeActive ? "Belum ada data untuk tanggal ini" : "Belum ada data untuk periode ini"}
          />
        )}
      </div>

      {/* Tabel Rekap per Tanggal */}
      <div className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-[#18181b] to-[#27272a]">
          <h2 className="font-heading font-bold text-white">Data Rekap Leads Closing — {rangeLabel}</h2>
        </div>
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : rowsInRange.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Database size={26} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white">
              {rangeActive ? "Tidak ada data di rentang tanggal ini" : "Belum ada data bulan ini"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {rangeActive
                ? "Ubah atau reset filter tanggal di atas"
                : "Pindahkan bulan atau tambahkan leads dulu di menu Leads"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  <th className="w-[15%] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">Tanggal</th>
                  {SOURCES.map((s) => (
                    <th key={s} className="w-[13%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">{s}</th>
                  ))}
                  <th className="w-[13%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 text-center">Total Leads</th>
                  <th className="w-[13%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 text-center">Total Closing</th>
                  <th className="w-[14%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 text-center">Closing Meta Ads</th>
                </tr>
              </thead>
              <tbody>
                {rowsInRange.map((r, idx) => (
                  <motion.tr
                    key={r.tanggal}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className={`border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-900/50 ${idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''}`}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{formatTanggalID(r.tanggal)}</td>
                    {SOURCES.map((s) => (
                      <td key={s} className="px-2 py-3 text-center text-slate-600 dark:text-slate-400">{r.perSumber[s] || 0}</td>
                    ))}
                    <td className="px-2 py-3 text-center font-bold text-blue-600 dark:text-blue-400">{r.total}</td>
                    <td className="px-2 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{r.closing}</td>
                    <td className="px-2 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{r.closingMetaAds}</td>
                  </motion.tr>
                ))}
                {/* Baris TOTAL */}
                <tr className="border-t-2 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40">
                  <td className="px-3 py-3 font-black text-slate-900 dark:text-white uppercase text-xs">Total</td>
                  {SOURCES.map((s) => (
                    <td key={s} className="px-2 py-3 text-center font-black text-slate-900 dark:text-white">{totals.perSumber[s] || 0}</td>
                  ))}
                  <td className="px-2 py-3 text-center font-black text-blue-600 dark:text-blue-400">{totals.total}</td>
                  <td className="px-2 py-3 text-center font-black text-emerald-600 dark:text-emerald-400">{totals.closing}</td>
                  <td className="px-2 py-3 text-center font-black text-indigo-600 dark:text-indigo-400">{totals.closingMetaAds}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}