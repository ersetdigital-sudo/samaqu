"use client";

import { useState, useMemo, useDeferredValue } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/ops-api";
import { motion } from "framer-motion";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Target,
  Wallet,
  UserPlus,
  Database,
  ClipboardPaste,
  Search,
  X
} from "lucide-react";
import { useToast } from "@/components/ops/ui/use-toast";
import LeadFormModal from "@/components/ops/leads/LeadFormModal";
import PasteImportModal from "@/components/ops/leads/PasteImportModal";
import ConfirmDeleteModal from "@/components/ops/ConfirmDeleteModal";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const SUMBER_STYLES = {
  "Website": "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  "IG": "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
  "WA": "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  "Meta ads": "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
};

const formatRupiah = (value) => (value || 0).toLocaleString('id-ID');

const pad = (n) => String(n).padStart(2, '0');
const formatDateID = (d) => {
  if (!d) return '-';
  const parts = String(d).split('-');
  if (parts.length < 3) return d;
  const [y, m, day] = parts;
  return `${parseInt(day, 10)} ${MONTHS[parseInt(m, 10) - 1] || m} ${y}`;
};

export default function Leads() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const start = `${year}-${pad(month + 1)}-01`;
  const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput).trim();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', start, end, search],
    queryFn: async () => {
      const query = { tanggal: { $gte: start, $lte: end } };
      if (search) query.kontak = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      const page = await base44.entities.Lead.filter(query, { sort: 'tanggal', limit: 1000 });
      // Urut pasti: tgl 1 di atas, dalam satu tanggal urut jam
      return (page.items || []).sort((a, b) =>
        (a.tanggal || '').localeCompare(b.tanggal || '') || (a.jam || '').localeCompare(b.jam || '')
      );
    },
  });

  const stats = useMemo(() => {
    const closing = leads.filter((l) => l.status === 'closing');
    return {
      total: leads.length,
      closing: closing.length,
      belum: leads.length - closing.length,
      rate: leads.length ? (closing.length / leads.length) * 100 : 0,
      nominal: closing.reduce((s, l) => s + (l.nominal || 0), 0),
    };
  }, [leads]);

  const [formOpen, setFormOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else { setMonth(month - 1); }
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else { setMonth(month + 1); }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await base44.entities.Lead.delete(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
    queryClient.invalidateQueries(['leads']);
    toast({ title: "â Lead dihapus", variant: "success" });
  };

  const statCards = [
    { label: "Total Leads", value: stats.total, icon: Users, chip: "bg-gradient-to-br from-blue-500 to-blue-600", wash: "from-blue-500/10 to-blue-500/0 dark:from-blue-500/20", glow: "bg-blue-400" },
    { label: "Closing", value: stats.closing, icon: CheckCircle2, chip: "bg-gradient-to-br from-emerald-500 to-teal-600", wash: "from-emerald-500/10 to-emerald-500/0 dark:from-emerald-500/20", glow: "bg-emerald-400" },
    { label: "Belum Closing", value: stats.belum, icon: Clock, chip: "bg-gradient-to-br from-amber-400 to-orange-500", wash: "from-amber-500/10 to-amber-500/0 dark:from-amber-500/20", glow: "bg-amber-400" },
    { label: "Konversi", value: `${stats.rate.toFixed(1)}%`, icon: Target, chip: "bg-gradient-to-br from-purple-500 to-fuchsia-600", wash: "from-purple-500/10 to-purple-500/0 dark:from-purple-500/20", glow: "bg-purple-400" },
    { label: "Nominal Closing", value: `Rp ${formatRupiah(stats.nominal)}`, icon: Wallet, chip: "bg-gradient-to-br from-rose-500 to-pink-600", wash: "from-rose-500/10 to-rose-500/0 dark:from-rose-500/20", glow: "bg-rose-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-600/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold font-heading">Database Leads</h1>
              <p className="text-white/80 text-sm font-medium mt-1">Catat leads masuk & pantau closing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPasteOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl hover:bg-white/25 transition-all active:scale-95"
            >
              <ClipboardPaste size={18} />
              Import Paste
            </button>
            <button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="flex items-center gap-2 px-5 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 shadow-md transition-all active:scale-95"
            >
              <Plus size={18} />
              Tambah Lead
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="relative overflow-hidden bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${c.wash}`} />
              <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-25 ${c.glow}`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 ${c.chip} rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10`}>
                    <Icon size={19} className="text-white" />
                  </div>
                  <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 tracking-widest">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{c.label}</p>
                <p className="text-2xl font-black font-heading text-slate-900 dark:text-white mt-0.5 tracking-tight">{c.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1d28] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white">Daftar Leads</h2>
          {/* Pencarian kontak */}
          <div className="relative ml-auto mr-2 w-full max-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nomor / kontak..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Bulan sebelumnya">
              <ChevronLeft size={16} className="text-slate-600 dark:text-slate-300" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-900 dark:text-white min-w-[130px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Bulan berikutnya">
              <ChevronRight size={16} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {search ? <Search size={26} className="text-slate-400" /> : <Database size={26} className="text-slate-400" />}
            </div>
            {search ? (
              <>
                <p className="font-bold text-slate-900 dark:text-white">Tidak ada hasil</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nomor {search} tidak ditemukan di bulan ini</p>
              </>
            ) : (
              <p className="font-bold text-slate-900 dark:text-white">Belum ada leads bulan ini</p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Klik "Tambah Lead" untuk mulai mencatat leads masuk</p>
            <button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
            >
              <UserPlus size={16} />
              Tambah Lead
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-left">
                  <th className="w-[18%] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggal</th>
                  <th className="w-[8%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jam</th>
                  <th className="w-[16%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kontak</th>
                  <th className="w-[12%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sumber</th>
                  <th className="w-[16%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Keterangan</th>
                  <th className="w-[16%] px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Nominal</th>
                  <th className="w-[14%] px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, idx) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap truncate">{formatDateID(lead.tanggal)}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{lead.jam || '-'}</td>
                    <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">{lead.kontak}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${SUMBER_STYLES[lead.sumber] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        {lead.sumber}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {lead.status === 'closing' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                          <CheckCircle2 size={12} /> Closing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                          <Clock size={12} /> Belum Closing
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {lead.status === 'closing' && lead.nominal ? `Rp ${formatRupiah(lead.nominal)}` : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(lead); setFormOpen(true); }}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          aria-label="Edit lead"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(lead)}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          aria-label="Hapus lead"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PasteImportModal
        isOpen={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onSuccess={async (_count, latestDate) => {
          setSearchInput('');
          if (latestDate) {
            const [savedYear, savedMonth] = latestDate.split('-').map(Number);
            setYear(savedYear);
            setMonth(savedMonth - 1);
          }
          await queryClient.invalidateQueries({ queryKey: ['leads'] });
        }}
      />

      <LeadFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={editing}
        defaultDate={`${year}-${pad(month + 1)}-${pad(now.getDate())}`}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Yakin ingin menghapus lead ini?"
        itemName={deleteTarget ? `${deleteTarget.kontak} (${formatDateID(deleteTarget.tanggal)})` : undefined}
        isDeleting={isDeleting}
      />
    </div>
  );
}