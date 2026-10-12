"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/lib/ops-api";
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
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

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

  const start = `${year}-${pad(month + 1)}-01`;
  const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads_report', start, end],
    queryFn: async () => {
      const page = await base44.entities.Lead.filter({ tanggal: { $gte: start, $lte: end } }, { sort: 'tanggal', limit: 500 });
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

  const totals = useMemo(() => {
    return dailyRows.reduce(
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
  }, [dailyRows]);

  const rate = totals.total ? (totals.closing / totals.total) * 100 : 0;
  const bestSource = SOURCES.reduce((best, s) => ((totals.perSumber[s] || 0) > (totals.perSumber[best] || 0) ? s : best), SOURCES[0]);

  const statCards = [
    { label: "Total Leads", value: totals.total, icon: Users, chip: "bg-blue-500" },
    { label: "Total Closing", value: totals.closing, icon: CheckCircle2, chip: "bg-emerald-500" },
    { label: "Konversi", value: `${rate.toFixed(1)}%`, icon: Target, chip: "bg-purple-500" },
    { label: "Nominal Closing", value: `Rp ${formatRupiah(totals.nominal)}`, icon: TrendingUp, chip: "bg-teal-500" },
  ];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else { setMonth(month - 1); }
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else { setMonth(month + 1); }
  };

  const SOURCE_CARD_CONFIG = {
    "Meta ads": { icon: Megaphone, chip: "bg-indigo-500" },
    "WA": { icon: MessageCircle, chip: "bg-green-500" },
    "IG": { icon: Target, chip: "bg-pink-500" },
    "Website": { icon: Users, chip: "bg-blue-500" },
  };

  const chartData = dailyRows.map((r) => ({
    tanggal: formatTanggalPendek(r.tanggal),
    leads: r.total,
    closing: r.closing,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-600/20">
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Leads Masuk vs Closing per Tanggal</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sumber terbanyak: <span className="font-bold text-slate-900 dark:text-white">{bestSource}</span>
          </p>
        </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <Database size={26} className="text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada leads bulan ini</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value, name) => [value, name === 'leads' ? 'Leads Masuk' : 'Closing']}
                  />
                  <Legend formatter={(v) => (v === 'leads' ? 'Leads Masuk' : 'Closing')} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="leads" name="leads" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Line type="monotone" dataKey="closing" name="closing" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>

      {/* Tabel Rekap per Tanggal */}
      <div className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-600">
          <h2 className="font-heading font-bold text-white">Data Rekap Leads Closing â {MONTHS[month]} {year}</h2>
        </div>
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : dailyRows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Database size={26} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white">Belum ada data bulan ini</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pindahkan bulan atau tambahkan leads dulu di menu Leads</p>
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
                {dailyRows.map((r, idx) => (
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