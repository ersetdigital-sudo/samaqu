"use client";

/**
 * Grafik "Leads Masuk vs Closing" (halaman Laporan Leads).
 *
 * Dibangun di atas Recharts yang SUDAH ada di proyek (tanpa dependensi baru).
 *
 * Yang membedakan dari versi lama:
 * - DUA sumbu: Leads Masuk di kiri, Closing di kanan dengan skala sendiri. Dulu keduanya
 *   satu skala sehingga garis Closing (0-4) menempel rata di dasar bersama Leads (30-60).
 * - Batang rounded bergradasi biru→indigo, batang puncak lebih pekat + label "Puncak N".
 * - Garis Closing halus (monotone) + area gradasi tipis, titik kecil, titik hover membesar.
 * - Grid horizontal tipis putus-putus, tanpa garis vertikal & tanpa garis tepi sumbu.
 * - Tooltip kartu (tanggal lengkap, leads, closing, konversi) + garis penunjuk vertikal;
 *   titik/batang pada tanggal itu menyorot, yang lain meredup.
 * - Legenda di kanan atas bisa diklik untuk sembunyikan/tampilkan seri.
 * - Animasi masuk: batang tumbuh berurutan kiri→kanan, garis & area tergambar, lalu titiknya.
 *   Menghormati prefers-reduced-motion (langsung tampil tanpa animasi).
 */

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";

const BLUE = "#2563eb";
const INDIGO = "#4f46e5";
const EMERALD = "#10b981";

const LEADS_LABEL = "Leads Masuk";
const CLOSING_LABEL = "Closing";

/** Path persegi membulat (dipakai batang, semua sudut). */
function roundedPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (h <= 0 || w <= 0) return "";
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

/** Batang dengan animasi tumbuh dari dasar + jeda bertahap kiri→kanan. */
function AnimatedBar(props) {
  const {
    x, y, width, height, payload,
    peakIndex = -1, activeIndex = null, reduce = false,
  } = props;
  const index = payload?.i ?? 0;
  if (!height || height <= 0) return null;
  const peak = index === peakIndex;
  const dim = activeIndex !== null && activeIndex !== index;
  const radius = Math.min(8, width / 2);
  return (
    <motion.path
      d={roundedPath(Number(x), Number(y), Number(width), Number(height), radius)}
      fill={peak ? "url(#leadsBarPeak)" : "url(#leadsBarSoft)"}
      initial={reduce ? false : { scaleY: 0 }}
      animate={{ scaleY: 1, opacity: dim ? 0.35 : 1 }}
      transition={{
        scaleY: { duration: 0.5, delay: reduce ? 0 : Math.min(index * 0.035, 0.45), ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.18 },
      }}
      style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
    />
  );
}

/** Kotak tooltip; diposisikan Recharts dan digeser supaya tidak terpotong di tepi. */
function ChartTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const conv = row.leads > 0 ? ((row.closing / row.leads) * 100).toFixed(1) : "0.0";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#1a1d28]/95 backdrop-blur px-3 py-2 shadow-lg shadow-slate-900/10 min-w-[150px]">
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{row.full}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px]" style={{ background: BLUE }} /> {LEADS_LABEL}
          </span>
          <span>{row.leads}</span>
        </p>
        <p className="text-xs font-bold flex items-center justify-between gap-3" style={{ color: EMERALD }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: EMERALD }} /> {CLOSING_LABEL}
          </span>
          <span>{row.closing}</span>
        </p>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Konversi: {conv}%</p>
    </div>
  );
}

/** Deteksi layar sempit (untuk menipiskan label tanggal). */
function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 640px)");
    setNarrow(mq.matches);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return narrow;
}

export default function LeadsTrendChart({ data = [], subtitle = "", emptyMessage = "Belum ada data untuk periode ini" }) {
  const reduce = useReducedMotion();
  const narrow = useNarrow();
  const [activeIndex, setActiveIndex] = useState(null);
  const [visible, setVisible] = useState({ leads: true, closing: true });

  const peakIndex = useMemo(() => {
    let best = -1;
    let bestValue = 0;
    data.forEach((d, i) => {
      if (d.leads > bestValue) { best = i; bestValue = d.leads; }
    });
    return bestValue > 0 ? best : -1;
  }, [data]);

  const hasData = data.some((d) => d.leads > 0 || d.closing > 0);

  if (!hasData) {
    return (
      <div>
        {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.6" className="mb-2">
            <path d="M3 3v18h18" />
            <path d="M7 15l4-5 3 3 4-6" />
          </svg>
          <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const legendButton = (key, label, color, dot) => {
    const on = visible[key];
    return (
      <button
        type="button"
        key={key}
        onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
        aria-pressed={on}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold transition-opacity duration-200"
        style={{ opacity: on ? 1 : 0.4, color: "#64748b" }}
      >
        <span className={dot ? "w-2.5 h-2.5 rounded-full" : "w-2.5 h-2.5 rounded-[3px]"} style={{ background: color }} />
        {label}
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        <div className="flex items-center gap-3 shrink-0">
          {legendButton("leads", LEADS_LABEL, BLUE, false)}
          {legendButton("closing", CLOSING_LABEL, EMERALD, true)}
        </div>
      </div>

      <div className="h-64 sm:h-72 mt-3 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 22, right: 6, left: -10, bottom: 0 }}
            onMouseMove={(state) => setActiveIndex(state?.activeTooltipIndex ?? null)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="leadsBarSoft" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93b4fb" />
                <stop offset="100%" stopColor="#c7d7fd" />
              </linearGradient>
              <linearGradient id="leadsBarPeak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor={INDIGO} />
              </linearGradient>
              <linearGradient id="closingArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EMERALD} stopOpacity={0.28} />
                <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 4" stroke="#eef2f7" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={narrow ? 2 : 0}
            />
            <YAxis
              yAxisId="leads"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#93a3b8" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <YAxis
              yAxisId="closing"
              orientation="right"
              allowDecimals={false}
              domain={[0, "dataMax"]}
              tick={{ fontSize: 11, fill: EMERALD }}
              tickLine={false}
              axisLine={false}
              width={30}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }}
              wrapperStyle={{ outline: "none" }}
              allowEscapeViewBox={{ x: true, y: true }}
            />

            {visible.leads && (
              <Bar
                yAxisId="leads"
                dataKey="leads"
                maxBarSize={narrow ? 14 : 26}
                isAnimationActive={false}
                shape={<AnimatedBar peakIndex={peakIndex} activeIndex={activeIndex} reduce={reduce} />}
              >
                <LabelList
                  dataKey="leads"
                  content={(props) => {
                    const { x, y, width, value, index } = props;
                    if (index !== peakIndex || !value) return null;
                    return (
                      <text
                        x={Number(x) + Number(width) / 2}
                        y={Number(y) - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill={BLUE}
                      >
                        {`Puncak ${value}`}
                      </text>
                    );
                  }}
                />
              </Bar>
            )}

            {visible.closing && (
              <Area
                yAxisId="closing"
                type="monotone"
                dataKey="closing"
                stroke={EMERALD}
                strokeWidth={2.5}
                fill="url(#closingArea)"
                isAnimationActive={!reduce}
                animationDuration={900}
                animationBegin={reduce ? 0 : 260}
                dot={{ r: 3, fill: EMERALD, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: EMERALD, stroke: "#ffffff", strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
