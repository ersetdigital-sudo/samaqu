"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
// Catatan: sebagian ikon lucide-react ada di runtime tapi belum masuk definisi
// tipe versi ini — jadi semuanya diambil lewat namespace (pola yang sama seperti
// OpsShell.tsx). Nilainya `any`, jadi tidak bisa gagal type-check.
import * as LucideIcons from "lucide-react";

const IconDashboard: any = (LucideIcons as any).LayoutDashboard ?? (LucideIcons as any).Gauge;
const IconRefresh: any = (LucideIcons as any).RefreshCw;
const IconChevronLeft: any = (LucideIcons as any).ChevronLeft;
const IconChevronRight: any = (LucideIcons as any).ChevronRight;
const IconAlert: any = (LucideIcons as any).AlertTriangle ?? (LucideIcons as any).TriangleAlert;
const IconWallet: any =
  (LucideIcons as any).Wallet ?? (LucideIcons as any).WalletMinimal ?? (LucideIcons as any).Banknote ?? (LucideIcons as any).DollarSign;
const IconPackage: any = (LucideIcons as any).Package;
const IconReceipt: any = (LucideIcons as any).Receipt ?? (LucideIcons as any).FileText ?? (LucideIcons as any).ScrollText;
const IconProfit: any = (LucideIcons as any).TrendingUp ?? (LucideIcons as any).LineChart;

/* ──────────────────────────────────────────────────────────────────────────
   Dashboard internal SAMAQU (/ops) — tampilan disamakan dengan dashboard
   Base44: header gradient + 4 card kaca (omset/HPP/biaya/net profit),
   3 card putih (transaksi/AOV/margin), lalu Tren Penjualan & Produk Terlaris.
   Semua angka dari /api/ops/dashboard (hitung WIB, butuh admin). Tidak ada
   data hardcode / dummy. Grafik tren pakai SVG inline (tanpa dependency baru).
   ────────────────────────────────────────────────────────────────────────── */

type TopProduct = { name: string; qty: number; total: number };
type TrendPoint = { tanggal: string; hari: string; omset: number };

type DashboardData = {
  generatedAt: string;
  hariIni: { startIso: string; endIso: string };
  bulan: string;
  bulanLabel: string;
  bulanValue: string;
  ringkasan: {
    omset: number;
    hpp: number;
    biaya: number;
    netProfit: number;
    margin: number;
    transaksi: number;
    rataRata: number;
  };
  trend: TrendPoint[];
  topProducts: TopProduct[];
};

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const nfmt = (v: number | null | undefined) => (Number(v) || 0).toLocaleString("id-ID");
const rp = (v: number | null | undefined) => `Rp ${nfmt(v)}`;

/** Bulan WIB sekarang dalam format YYYY-MM. */
function currentMonthValue(): string {
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-10" → "Oktober" / "2026". */
function monthParts(value: string): { name: string; year: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return { name: BULAN[new Date().getUTCMonth()], year: String(new Date().getUTCFullYear()) };
  const idx = Number(m[2]) - 1;
  return { name: BULAN[idx] || m[2], year: m[1] };
}

/** Ambil data dashboard dengan token admin (semua /api/ops/* butuh Bearer token). */
async function fetchDashboard(month: string): Promise<DashboardData> {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`/api/ops/dashboard?month=${encodeURIComponent(month)}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `Gagal memuat dashboard (${res.status})`);
  return json as DashboardData;
}

function GlassCard({ icon: Icon, label, value, caption }: { icon: any; label: string; value: string; caption: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-blue-100">
        <Icon size={16} />
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl md:text-3xl font-black text-white mt-3 break-words">{value}</p>
      <p className="text-blue-100 text-xs mt-1">{caption}</p>
    </div>
  );
}

function StatCard({ label, value, caption, tone }: { label: string; value: string; caption: string; tone?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-2xl font-black mt-2 break-words ${tone || "text-slate-900"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{caption}</p>
    </div>
  );
}

/** Grafik batang sederhana (SVG inline, tanpa recharts). */
function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const max = trend.reduce((m, d) => Math.max(m, Number(d.omset) || 0), 0);
  if (trend.length === 0 || max <= 0) {
    return <p className="text-sm text-gray-500 py-12 text-center">Belum ada penjualan bulan ini</p>;
  }

  const count = trend.length;
  const barW = 10;
  const gap = 6;
  const step = barW + gap;
  const width = count * step + gap;
  const chartH = 140;
  const axisH = 22;
  const height = chartH + axisH;
  const labelEvery = count > 20 ? 5 : count > 10 ? 3 : 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Tren penjualan harian">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <line x1="0" y1={chartH} x2={width} y2={chartH} stroke="#e2e8f0" strokeWidth="1" />
      {trend.map((d, i) => {
        const value = Number(d.omset) || 0;
        const h = (value / max) * (chartH - 8);
        const x = gap + i * step;
        const showLabel = i === 0 || (i + 1) % labelEvery === 0 || i === count - 1;
        return (
          <g key={d.tanggal}>
            <rect x={x} y={chartH - h} width={barW} height={h} rx="2" fill="url(#barGrad)">
              <title>{`${d.tanggal} · ${rp(value)}`}</title>
            </rect>
            {showLabel && (
              <text x={x + barW / 2} y={chartH + 15} textAnchor="middle" fontSize="10" fill="#94a3b8">
                {d.hari}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function OpsDashboardPage() {
  // Bulan terpilih (YYYY-MM) — default bulan WIB sekarang.
  const [bulanValue, setBulanValue] = useState<string>(() => currentMonthValue());

  // PENTING: jangan set `initialData` di sini — QueryClient global memakai
  // `initialDataUpdatedAt: 0`, jadi query tetap fetch. Data awal kosong akan
  // membuat dashboard tampil nol.
  const { data, isLoading, isError, isFetching, refetch } = useQuery<DashboardData>({
    queryKey: ["ops-dashboard", bulanValue],
    queryFn: () => fetchDashboard(bulanValue),
    staleTime: 30_000,
  });

  const parts = monthParts(bulanValue);
  const monthName = data?.bulanLabel ? data.bulanLabel.split(" ")[0] : parts.name;
  const yearLabel = data?.bulanLabel ? data.bulanLabel.split(" ")[1] || parts.year : parts.year;

  const shiftMonth = (delta: number) => {
    const m = /^(\d{4})-(\d{2})$/.exec(bulanValue);
    const y = m ? Number(m[1]) : Number(parts.year);
    const mi = m ? Number(m[2]) - 1 : 0;
    const d = new Date(Date.UTC(y, mi + delta, 1));
    setBulanValue(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  const pick = useMemo(() => ({ onPrev: () => shiftMonth(-1), onNext: () => shiftMonth(1) }), [bulanValue]);

  /* ── Loading: skeleton (jangan tampilkan angka 0 dulu) ── */
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl relative overflow-hidden p-6 md:p-8">
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 animate-pulse" />
                <div className="space-y-2 pt-1">
                  <div className="h-7 w-44 rounded-lg bg-white/20 animate-pulse" />
                  <div className="h-4 w-72 max-w-full rounded bg-white/10 animate-pulse" />
                </div>
              </div>
              <div className="h-11 w-64 rounded-xl bg-white/10 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/10 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-white border border-gray-200 animate-pulse" />
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
          <IconAlert size={24} />
        </div>
        <p className="font-bold text-slate-900">Dashboard belum berhasil dimuat.</p>
        <p className="text-sm text-gray-500 mt-1">Periksa koneksi lalu coba lagi.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all"
        >
          <IconRefresh size={14} /> Coba Lagi
        </button>
      </div>
    );
  }

  const { ringkasan: r, trend, topProducts } = data;
  const profit = r.netProfit >= 0;

  return (
    <div className="space-y-5">
      {/* ── Header gradient + 4 card kaca ── */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl relative overflow-hidden p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner shrink-0">
                <IconDashboard size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
                <p className="text-blue-100 font-medium mt-1">Ringkasan aktivitas bisnis Anda</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md p-1">
                <button
                  type="button"
                  onClick={pick.onPrev}
                  aria-label="Bulan sebelumnya"
                  className="w-8 h-8 grid place-items-center rounded-lg text-white/90 hover:bg-white/15 transition-all"
                >
                  <IconChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1 px-0.5">
                  <button
                    type="button"
                    onClick={() => setBulanValue(currentMonthValue())}
                    title="Kembali ke bulan ini"
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 text-[11px] font-bold text-white hover:bg-white/20 transition-all"
                  >
                    {monthName}
                  </button>
                  <span className="text-white/40 text-[11px]">|</span>
                  <button
                    type="button"
                    onClick={() => setBulanValue(currentMonthValue())}
                    title="Kembali ke bulan ini"
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 text-[11px] font-bold text-white hover:bg-white/20 transition-all"
                  >
                    {yearLabel}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={pick.onNext}
                  aria-label="Bulan berikutnya"
                  className="w-8 h-8 grid place-items-center rounded-lg text-white/90 hover:bg-white/15 transition-all"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-sm font-bold transition-all"
              >
                <IconRefresh size={16} className={isFetching ? "animate-spin" : ""} />
                Muat ulang
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard icon={IconWallet} label="Total Omset" value={rp(r.omset)} caption="Pendapatan kotor" />
            <GlassCard icon={IconPackage} label="Total HPP" value={rp(r.hpp)} caption="Modal produk terjual" />
            <GlassCard icon={IconReceipt} label="Total Biaya" value={rp(r.biaya)} caption="Operasional & packing" />

            <div className="relative bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <span
                className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${
                  profit ? "bg-emerald-400/90 text-emerald-950" : "bg-red-400/90 text-red-950"
                }`}
              >
                {profit ? "PROFIT" : "RUGI"}
              </span>
              <div className="flex items-center gap-2 text-blue-100">
                <IconProfit size={16} />
                <span className="text-[11px] font-bold uppercase tracking-wider">Net Profit</span>
              </div>
              <p className={`text-2xl md:text-3xl font-black mt-3 break-words ${profit ? "text-emerald-300" : "text-red-300"}`}>
                {rp(r.netProfit)}
              </p>
              <p className="text-blue-100 text-xs mt-1">Keuntungan bersih</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3 card putih ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Transaksi" value={nfmt(r.transaksi)} caption="transaksi bulan ini" />
        <StatCard label="Rata-rata / Transaksi" value={rp(r.rataRata)} caption="nilai rata-rata" />
        <StatCard
          label="Margin Profit"
          value={`${nfmt(r.margin)}%`}
          caption="persentase margin"
          tone={r.margin >= 0 ? "text-slate-900" : "text-red-600"}
        />
      </div>

      {/* ── Tren Penjualan · Produk Terlaris ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <IconProfit size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-900">Tren Penjualan</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Melihat pola penjualan harian</p>
          <TrendChart trend={trend} />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <IconProfit size={18} className="text-blue-600" />
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
      </div>
    </div>
  );
}
