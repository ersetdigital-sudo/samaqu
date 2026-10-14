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

type TopProduct = {
  name: string;
  kain: string;
  series: string;
  /** "B-01 · Imalah" — baris bawah kartu. */
  sub: string;
  units: number;
  /** Omzet baris (Rp) dari harga tercatat di item pesanan. */
  revenue: number;
};
type TrendPoint = { tanggal: string; hari: string; omset: number };
type TrendHarian = { tanggal: string; label: string; omset: number };

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
  trendHarian: TrendHarian[];
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
      {/* Nominal WAJIB satu baris ("Rp" tidak boleh terpisah dari angkanya) —
          ukuran font fluid supaya nominal panjang tetap muat di layar sempit. */}
      <p className="font-black text-white mt-3 whitespace-nowrap text-[clamp(1.05rem,1.5vw,1.8rem)]">{value}</p>
      <p className="text-blue-100 text-xs mt-1">{caption}</p>
    </div>
  );
}

function StatCard({ label, value, caption, tone }: { label: string; value: string; caption: string; tone?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`font-black mt-2 whitespace-nowrap text-[clamp(1.15rem,1.6vw,1.75rem)] ${tone || "text-slate-900"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{caption}</p>
    </div>
  );
}

/* ── Grafik "Tren Penjualan" (SVG inline, tanpa library/tambahan dependency) ── */

const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "2026-10-12" → "12 Okt" (untuk tooltip). */
function tanggalRingkas(tanggal: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal || "");
  if (!m) return tanggal || "";
  return `${Number(m[3])} ${BULAN_SINGKAT[Number(m[2]) - 1] || m[2]}`;
}

/** Label sumbu Y ringkas: 1.200.000 → "1,2jt"; 800.000 → "800rb"; 0 → "0". */
function fmtSumbu(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (v >= 1000) return `${Math.round(v / 1000).toLocaleString("id-ID")}rb`;
  return nfmt(v);
}

/** Batas atas "bulat enak dibaca" supaya tiap tick rapi (mis. 800.000 = 4 × 200.000). */
function niceTop(rawMax: number, ticks = 4): number {
  if (!(rawMax > 0)) return ticks;
  const step = rawMax / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(step)));
  const f = step / pow;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * pow * ticks;
}

/** Path batang dengan HANYA sudut atas yang membulat (radius `r`). */
function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + rr}`,
    `Q ${x} ${y} ${x + rr} ${y}`,
    `L ${x + w - rr} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rr}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
}

/** Grafik batang vertikal 7 hari terakhir + gradient biru, grid putus-putus, label sumbu. */
function TrendChart({ trend }: { trend: TrendHarian[] }) {
  const max = (trend || []).reduce((m, d) => Math.max(m, Number(d.omset) || 0), 0);
  if (!trend || trend.length === 0 || max <= 0) {
    return <p className="text-sm text-gray-500 py-16 text-center">Belum ada penjualan 7 hari terakhir</p>;
  }

  const VB_W = 720;
  const VB_H = 300;
  const padL = 54; // ruang label sumbu Y
  const padR = 14;
  const padT = 18; // sedikit ruang di atas batang tertinggi
  const padB = 30; // ruang label sumbu X
  const plotW = VB_W - padL - padR;
  const plotH = VB_H - padT - padB;
  const baseY = padT + plotH;
  const top = niceTop(max);
  const n = trend.length;
  const slot = plotW / n;
  const barW = Math.min(slot * 0.58, 66); // batang melebar, tidak kurus
  const radius = 7;
  const hMin = 3; // nilai 0 tetap digambar tipis menempel garis dasar

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-[220px] md:h-[260px]"
      role="img"
      aria-label="Tren penjualan 7 hari terakhir"
    >
      <defs>
        <linearGradient id="trendBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Grid horizontal putus-putus + label sumbu Y: 0 dan 4 tick ke atas */}
      {[0, 1, 2, 3, 4].map((i) => {
        const value = (top / 4) * i;
        const y = baseY - (value / top) * plotH;
        return (
          <g key={`grid-${i}`}>
            <line x1={padL} y1={y} x2={VB_W - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padL - 9} y={y} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="#94a3b8">
              {fmtSumbu(value)}
            </text>
          </g>
        );
      })}

      {/* Batang + label sumbu X (DD/MM) */}
      {trend.map((d, i) => {
        const value = Number(d.omset) || 0;
        const h = value > 0 ? Math.max((value / top) * plotH, hMin) : hMin;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = baseY - h;
        return (
          <g key={d.tanggal}>
            <g>
              <title>{`${tanggalRingkas(d.tanggal)} · ${rp(value)}`}</title>
              <path d={barPath(x, y, barW, h, radius)} fill="url(#trendBarGrad)" />
            </g>
            <text x={x + barW / 2} y={baseY + 20} textAnchor="middle" fontSize="12" fill="#64748b">
              {d.label}
            </text>
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
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl relative overflow-hidden p-6 md:p-8">
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

  const { ringkasan: r, trendHarian, topProducts } = data;
  const profit = r.netProfit >= 0;

  return (
    <div className="space-y-5">
      {/* ── Header gradient + 4 card kaca ── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl relative overflow-hidden p-6 md:p-8">
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
              <p className={`font-black mt-3 whitespace-nowrap text-[clamp(1.05rem,1.5vw,1.8rem)] ${profit ? "text-emerald-300" : "text-red-300"}`}>
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
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-4">7 HARI TERAKHIR</p>
          <TrendChart trend={trendHarian} />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                <IconProfit size={17} />
              </span>
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900 leading-tight truncate">Produk Terlaris</h2>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 truncate">
                  {monthName} {yearLabel}
                </p>
              </div>
            </div>
            {topProducts.length > 0 && (
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold whitespace-nowrap">
                Top {Math.min(topProducts.length, 5)}
              </span>
            )}
          </div>

          {topProducts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-slate-800">Belum ada penjualan</p>
              <p className="text-xs text-gray-500 mt-1">
                Periode {monthName} {yearLabel}
              </p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {topProducts.slice(0, 5).map((p, i) => {
                const maxQty = Math.max(1, topProducts[0]?.units || 1);
                const pct = Math.max(6, Math.round((p.units / maxQty) * 100));
                const subline = [p.sub, p.revenue > 0 ? rp(p.revenue) : ""].filter(Boolean).join(" · ");
                const rankCls =
                  i === 0
                    ? "bg-amber-400 text-amber-950"
                    : i === 1
                    ? "bg-slate-300 text-slate-800"
                    : i === 2
                    ? "bg-orange-300 text-orange-950"
                    : "bg-gray-100 text-gray-600";
                return (
                  <li
                    key={`${p.name}-${p.kain}-${p.series}-${i}`}
                    className="relative overflow-hidden rounded-xl border border-gray-100 px-3 py-2.5"
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-y-0 left-0 ${i === 0 ? "bg-amber-50" : "bg-blue-50/70"}`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg text-[11px] font-black grid place-items-center shrink-0 ${rankCls}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate" title={subline ? `${p.name} — ${subline}` : p.name}>
                          {p.name}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate" title={subline || undefined}>
                          {subline || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-black text-slate-900 leading-none tabular-nums">{nfmt(p.units)}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mt-0.5">terjual</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
