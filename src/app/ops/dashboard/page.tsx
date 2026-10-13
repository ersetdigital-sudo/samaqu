"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, LayoutDashboard, RefreshCw, TrendingUp, Users } from "lucide-react";
// Catatan: beberapa ikon (Activity, CalendarClock, PackageSearch, Wallet) ada di
// runtime lucide-react tapi belum masuk definisi tipe versi ini — jadi diambil
// lewat namespace dengan fallback, pola yang sama seperti OpsShell.tsx.
import * as LucideIcons from "lucide-react";
const IconActivity: any = (LucideIcons as any).Activity ?? (LucideIcons as any).Pulse;
const IconCalendarClock: any = (LucideIcons as any).CalendarClock ?? (LucideIcons as any).Clock;
const IconPackageSearch: any = (LucideIcons as any).PackageSearch ?? (LucideIcons as any).Package;
const IconWallet: any =
  (LucideIcons as any).Wallet ?? (LucideIcons as any).WalletMinimal ?? (LucideIcons as any).Banknote;

/* ──────────────────────────────────────────────────────────────────────────
   Dashboard internal SAMAQU (/ops) — gaya mengikuti app Base44 lama.
   Semua angka diambil dari /api/ops/dashboard (hitung WIB, butuh admin).
   Tidak ada data hardcode / dummy dan tidak ada grafik (API belum menyediakan
   data tren).
   ────────────────────────────────────────────────────────────────────────── */

type TopProduct = { name: string; qty: number; total: number };

type AktivitasItem = {
  id: string;
  lead_id: string;
  action: string;
  note: string;
  created_at: string;
  actor: string;
};

type TodayTask = {
  id: string;
  kontak: string;
  produk?: string | null;
  pic?: string | null;
  sumber?: string | null;
  next_followup_at?: string | null;
  outcome?: string | null;
};

type DashboardData = {
  generatedAt: string;
  hariIni: { startIso: string; endIso: string };
  bulan: string;
  leads: {
    total: number;
    baruHariIni: number;
    belumMembalas: number;
    perluDijadwalkan: number;
    followupHariIni: number;
    terlambat: number;
    closingBulanIni: number;
  };
  penjualan: {
    omsetHariIni: number;
    orderHariIni: number;
    omsetBulanIni: number;
    orderBulanIni: number;
    orderBatal: number;
    aov: number;
  };
  stok: { totalUnit: number; varianHabis: number; varianMenipis: number; totalVarian: number };
  topProducts: TopProduct[];
  aktivitas: AktivitasItem[];
  todayTasks: TodayTask[];
};

const nfmt = (v: number | null | undefined) => (Number(v) || 0).toLocaleString("id-ID");
const rp = (v: number | null | undefined) => `Rp ${nfmt(v)}`;

const wibTime = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
};

const wibDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
};

const ACTION_LABEL: Record<string, string> = {
  open_wa: "Buka WhatsApp",
  result: "Hasil dicatat",
  schedule: "Jadwal diubah",
  set_pic: "PIC diubah",
  created: "Lead dibuat",
};

/** Ambil data dashboard dengan token admin (semua /api/ops/* butuh Bearer token). */
async function fetchDashboard(): Promise<DashboardData> {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch("/api/ops/dashboard", {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `Gagal memuat dashboard (${res.status})`);
  return json as DashboardData;
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${tone || "text-slate-900"}`}>{value}</span>
    </div>
  );
}

export default function OpsDashboardPage() {
  // PENTING: jangan set `initialData` di sini — QueryClient global memakai
  // `initialDataUpdatedAt: 0`, jadi query tetap fetch. Data awal kosong akan
  // membuat dashboard tampil nol.
  const { data, isLoading, isError, isFetching, refetch } = useQuery<DashboardData>({
    queryKey: ["ops-dashboard"],
    queryFn: fetchDashboard,
    staleTime: 30_000,
  });

  /* ── Loading: skeleton (jangan tampilkan angka 0 dulu) ── */
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl relative overflow-hidden p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 animate-pulse" />
              <div className="space-y-2 pt-1">
                <div className="h-7 w-44 rounded-lg bg-white/20 animate-pulse" />
                <div className="h-4 w-72 max-w-full rounded bg-white/10 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-white/10 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-white border border-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-56 rounded-xl bg-white border border-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Gagal memuat ── */
  if (isError || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 grid place-items-center mx-auto mb-3">
          <AlertTriangle size={24} />
        </div>
        <p className="font-bold text-slate-900">Dashboard belum berhasil dimuat.</p>
        <p className="text-sm text-gray-500 mt-1">Periksa koneksi lalu coba lagi.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all"
        >
          <RefreshCw size={14} /> Coba Lagi
        </button>
      </div>
    );
  }

  const { leads, penjualan, stok, topProducts, aktivitas, todayTasks, bulan } = data;

  const kpi = [
    {
      key: "omset-hari-ini",
      icon: IconWallet,
      label: "Omset Hari Ini",
      value: rp(penjualan.omsetHariIni),
      caption: `${nfmt(penjualan.orderHariIni)} order hari ini`,
    },
    {
      key: "omset-bulan",
      icon: TrendingUp,
      label: `Omset ${bulan}`,
      value: rp(penjualan.omsetBulanIni),
      caption: `${nfmt(penjualan.orderBulanIni)} order · AOV ${rp(penjualan.aov)}${
        penjualan.orderBatal > 0 ? ` · ${nfmt(penjualan.orderBatal)} batal` : ""
      }`,
    },
    {
      key: "followup",
      icon: IconCalendarClock,
      label: "Follow-up Hari Ini",
      value: nfmt(leads.followupHariIni),
      caption: `${nfmt(leads.terlambat)} terlambat · ${nfmt(leads.perluDijadwalkan)} perlu dijadwalkan`,
    },
    {
      key: "stok-kritis",
      icon: AlertTriangle,
      label: "Stok Kritis",
      value: `${nfmt(stok.varianHabis)} habis`,
      caption: `${nfmt(stok.varianMenipis)} varian menipis · total ${nfmt(stok.totalUnit)} unit`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header gradient + KPI ── */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl relative overflow-hidden p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner shrink-0">
                <LayoutDashboard size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
                <p className="text-blue-100 font-medium mt-1">
                  Ringkasan operasional SAMAQU hari ini · {bulan} (WIB)
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-sm font-bold transition-all"
              >
                <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
                Muat ulang
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpi.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.key}
                  className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition-all duration-300"
                >
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div className="flex items-center gap-2 text-blue-100">
                      <Icon size={16} />
                      <span className="text-[11px] font-bold uppercase tracking-wider">{c.label}</span>
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-black text-white">{c.value}</p>
                      <p className="text-blue-100 text-xs mt-1">{c.caption}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Ringkasan Lead · Produk Terlaris · Stok ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ringkasan Lead */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-900">Ringkasan Lead</h2>
          </div>
          <div className="space-y-2.5">
            <SummaryRow label="Total Lead" value={nfmt(leads.total)} />
            <SummaryRow label="Lead Baru (Hari Ini)" value={nfmt(leads.baruHariIni)} />
            <SummaryRow label="Belum Membalas" value={nfmt(leads.belumMembalas)} />
            <SummaryRow
              label="Perlu Dijadwalkan"
              value={nfmt(leads.perluDijadwalkan)}
              tone="text-amber-600"
            />
            <SummaryRow label="Follow-up Hari Ini" value={nfmt(leads.followupHariIni)} />
            <SummaryRow label="Terlambat" value={nfmt(leads.terlambat)} tone="text-red-600" />
            <SummaryRow
              label="Closing Bulan Ini"
              value={nfmt(leads.closingBulanIni)}
              tone="text-emerald-600"
            />
          </div>
        </div>

        {/* Produk Terlaris */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-900">Produk Terlaris</h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada penjualan bulan ini</p>
          ) : (
            <ol className="space-y-3">
              {topProducts.slice(0, 5).map((p, i) => (
                <li key={`${p.name}-${i}`} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {nfmt(p.qty)} unit · {rp(p.total)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Stok Menipis / Habis */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <IconPackageSearch size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-900">Stok Menipis / Habis</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">Habis</p>
              <p className="text-2xl font-black text-red-700 mt-1">{nfmt(stok.varianHabis)}</p>
              <p className="text-[11px] text-red-600 mt-0.5">varian</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Menipis</p>
              <p className="text-2xl font-black text-amber-700 mt-1">{nfmt(stok.varianMenipis)}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">varian</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Dari total {nfmt(stok.totalVarian)} varian · {nfmt(stok.totalUnit)} unit stok
          </p>
          <Link
            href="/ops/master-produk"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Lihat Laporan Stok <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Tugas Follow-up Hari Ini · Aktivitas Terbaru ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tugas Follow-up Hari Ini */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <IconCalendarClock size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-900">Tugas Follow-up Hari Ini</h2>
          </div>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada tugas untuk hari ini</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {todayTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{t.kontak || "-"}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {t.produk || "-"}
                      {t.pic ? ` · PIC ${t.pic}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-black text-slate-700 bg-slate-100 rounded-lg px-2 py-1 shrink-0">
                    {wibTime(t.next_followup_at)} WIB
                  </span>
                  <Link
                    href="/ops/follow-up"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-all shrink-0"
                  >
                    Buka Follow-up
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Aktivitas Terbaru */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <IconActivity size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-900">Aktivitas Terbaru</h2>
          </div>
          {aktivitas.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada aktivitas terbaru</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {aktivitas.slice(0, 6).map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {ACTION_LABEL[a.action] || a.action || "-"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{a.note || a.lead_id || "-"}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                      {wibDateTime(a.created_at)} WIB
                    </span>
                  </div>
                  {a.actor && <p className="text-[11px] text-gray-400 mt-1">oleh {a.actor}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
