/**
 * Laporan Leads & Closing → PDF (A4 portrait, vektor, font ter-embed).
 *
 * Dipakai endpoint `GET /api/ops/leads/report?bulan=YYYY-MM`.
 *
 * Pustaka: pdf-lib + @pdf-lib/fontkit (murni JS → aman di Vercel serverless).
 * Gradasi, kartu rounded, grafik dua sumbu, heatmap tabel semuanya digambar VEKTOR oleh
 * modul ini (tanpa headless browser), jadi hasilnya tajam dan ringan (~20-40 KB).
 *
 * Catatan penting soal ANGKA: agregasi di sini memakai definisi yang sama persis dengan
 * halaman /ops/leads/laporan (lihat buildDailyRows/buildTotals). Modul ini TIDAK menulis
 * apa pun ke database.
 */

import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ────────────────────────────── data & agregasi ────────────────────────────── */

export interface LeadRow {
  tanggal: string;
  sumber?: string | null;
  status?: string | null;
  nominal?: number | null;
}

export interface DailyLeadRow {
  tanggal: string;
  perSumber: Record<string, number>;
  perSumberClosing: Record<string, number>;
  total: number;
  closing: number;
  closingMetaAds: number;
}

export interface LeadsTotals {
  perSumber: Record<string, number>;
  total: number;
  closing: number;
  closingMetaAds: number;
}

export interface LeadsSummary {
  month: string;
  monthLabel: string;
  periodLabel: string;
  running: boolean;
  periodStart: string;
  periodEnd: string;
  dayCount: number;
  totals: LeadsTotals;
  conversion: number;
  averagePerDay: number;
  sources: { name: string; count: number; pct: number }[];
  topSource: string;
  highlights: string[];
  peakLeadsDate: string | null;
  peakClosingDate: string | null;
  peakLeads: number;
  peakClosing: number;
}

export const REPORT_SOURCES = ["Meta ads", "WA", "IG", "Website"] as const;

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_ID_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const pad = (n: number) => String(n).padStart(2, "0");
const nfmt = (n: number) => n.toLocaleString("id-ID");

/** "2026-10-13" → "13 Oktober 2026". */
export function tanggalID(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "-";
  return `${Number(m[3])} ${MONTHS_ID[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

/** Tanggal (YYYY-MM-DD) untuk "hari ini" menurut WIB (UTC+7). */
export function todayWib(now: Date = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}`;
}

/** Waktu pembuatan: "14 Oktober 2026, 16.04 WIB". */
export function generatedAtID(now: Date): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCDate()} ${MONTHS_ID[wib.getUTCMonth()]} ${wib.getUTCFullYear()}, ${pad(wib.getUTCHours())}.${pad(wib.getUTCMinutes())} WIB`;
}

/** Rekap per tanggal — definisi identik dengan halaman Laporan Leads. */
export function buildDailyRows(leads: LeadRow[]): DailyLeadRow[] {
  const map: Record<string, DailyLeadRow> = {};
  for (const lead of leads) {
    const tanggal = String(lead?.tanggal || "");
    if (!tanggal) continue;
    if (!map[tanggal]) {
      map[tanggal] = { tanggal, perSumber: {}, perSumberClosing: {}, total: 0, closing: 0, closingMetaAds: 0 };
    }
    const row = map[tanggal];
    const sumber = String(lead.sumber ?? "");
    row.perSumber[sumber] = (row.perSumber[sumber] || 0) + 1;
    row.total += 1;
    if (lead.status === "closing") {
      row.closing += 1;
      row.perSumberClosing[sumber] = (row.perSumberClosing[sumber] || 0) + 1;
      if (sumber === "Meta ads") row.closingMetaAds += 1;
    }
  }
  return Object.values(map).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export function buildTotals(rows: DailyLeadRow[]): LeadsTotals {
  const totals: LeadsTotals = { perSumber: {}, total: 0, closing: 0, closingMetaAds: 0 };
  for (const row of rows) {
    for (const s of REPORT_SOURCES) {
      totals.perSumber[s] = (totals.perSumber[s] || 0) + (row.perSumber[s] || 0);
    }
    totals.total += row.total;
    totals.closing += row.closing;
    totals.closingMetaAds += row.closingMetaAds;
  }
  return totals;
}

export interface LeadsReportInput {
  /** "YYYY-MM" */
  month: string;
  leads: LeadRow[];
  now?: Date;
}

export function summarizeLeadsReport({ month, leads, now = new Date() }: LeadsReportInput): LeadsSummary {
  const m = /^(\d{4})-(\d{2})$/.exec(month || "");
  const year = m ? Number(m[1]) : now.getFullYear();
  const monthIdx = m ? Number(m[2]) - 1 : now.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const monthLabel = `${MONTHS_ID[monthIdx]} ${year}`;
  const first = `${year}-${pad(monthIdx + 1)}-01`;
  const last = `${year}-${pad(monthIdx + 1)}-${pad(daysInMonth)}`;

  const today = todayWib(now);
  const currentMonth = today.slice(0, 7) === `${year}-${pad(monthIdx + 1)}`;
  const inMonth = (leads || []).filter((l) => String(l?.tanggal || "").slice(0, 7) === `${year}-${pad(monthIdx + 1)}`);
  const dailyRows = buildDailyRows(inMonth);

  let periodEnd = last;
  let running = false;
  if (currentMonth) {
    running = true;
    const lastDataDate = dailyRows.length > 0 ? dailyRows[dailyRows.length - 1].tanggal : null;
    periodEnd = lastDataDate ? (lastDataDate < today ? lastDataDate : today) : today;
  }

  const dayCount = Number(periodEnd.slice(8, 10));
  const rowsInPeriod = dailyRows.filter((r) => r.tanggal >= first && r.tanggal <= periodEnd);
  const totals = buildTotals(rowsInPeriod);

  const conversion = totals.total > 0 ? (totals.closing / totals.total) * 100 : 0;
  const averagePerDay = dayCount > 0 ? totals.total / dayCount : 0;

  const sources = REPORT_SOURCES.map((name) => ({
    name,
    count: totals.perSumber[name] || 0,
    pct: totals.total > 0 ? ((totals.perSumber[name] || 0) / totals.total) * 100 : 0,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const topSource = sources[0]?.name || "-";
  const peakLeads = rowsInPeriod.reduce<DailyLeadRow | null>((best, r) => (!best || r.total > best.total ? r : best), null);
  const peakClosing = rowsInPeriod.reduce<DailyLeadRow | null>((best, r) => (!best || r.closing > best.closing ? r : best), null);
  const peakLeadsDate = peakLeads && peakLeads.total > 0 ? peakLeads.tanggal : null;
  const peakClosingDate = peakClosing && peakClosing.closing > 0 ? peakClosing.tanggal : null;

  const highlights: string[] = [];
  highlights.push(
    peakLeadsDate
      ? `Leads terbanyak: ${tanggalID(peakLeadsDate)} dengan ${nfmt(peakLeads!.total)} leads.`
      : "Belum ada leads pada periode ini."
  );
  highlights.push(
    peakClosingDate
      ? `Closing terbanyak: ${tanggalID(peakClosingDate)} dengan ${nfmt(peakClosing!.closing)} closing.`
      : "Belum ada closing pada periode ini."
  );
  highlights.push(
    (sources[0]?.count || 0) > 0
      ? `Sumber terbesar: ${topSource} dengan ${nfmt(sources[0].count)} leads (${sources[0].pct.toFixed(1)}% dari total).`
      : "Sumber leads belum ada datanya pada periode ini."
  );

  const periodLabel = running
    ? `${Number(first.slice(8, 10))} sampai ${Number(periodEnd.slice(8, 10))} ${MONTHS_ID[monthIdx]} ${year} (data berjalan)`
    : monthLabel;

  return {
    month: `${year}-${pad(monthIdx + 1)}`,
    monthLabel,
    periodLabel,
    running,
    periodStart: first,
    periodEnd,
    dayCount,
    totals,
    conversion,
    averagePerDay,
    sources,
    topSource,
    highlights,
    peakLeadsDate,
    peakClosingDate,
    peakLeads: peakLeads?.total || 0,
    peakClosing: peakClosing?.closing || 0,
  };
}

/** Teks ringkas siap tempel ke WhatsApp (tanpa emoji). */
export function summaryText(summary: LeadsSummary): string {
  return [
    `Laporan Leads SAMAQU — ${summary.monthLabel}`,
    `Total leads: ${nfmt(summary.totals.total)}`,
    `Total closing: ${nfmt(summary.totals.closing)}`,
    `Konversi: ${summary.conversion.toFixed(1)}%`,
    `Sumber terbesar: ${summary.topSource} (${nfmt(summary.sources[0]?.count || 0)})`,
  ].join("\n");
}

/** Nama file unduhan: "Laporan-Leads-SAMAQU-Oktober-2026.pdf". */
export function reportFileName(summary: LeadsSummary): string {
  const [y, mm] = summary.month.split("-");
  return `Laporan-Leads-SAMAQU-${MONTHS_ID[Number(mm) - 1]}-${y}.pdf`;
}

/* ────────────────────────────── palet & tata letak ────────────────────────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 36; // margin halaman (lega, kelipatan 4)
const CW = PAGE_W - M * 2; // 523.28
const FOOTER_Y = 26;

const hex = (h: string) => {
  const s = h.replace("#", "");
  return rgb(parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255);
};
const mix = (a: string, b: string, t: number) => {
  const pa = hex(a);
  const pb = hex(b);
  return rgb(pa.red + (pb.red - pa.red) * t, pa.green + (pb.green - pa.green) * t, pa.blue + (pb.blue - pa.blue) * t);
};

const BLUE = "#2563eb";
const INDIGO = "#4f46e5";
const EMERALD = "#10b981";
const INK = "#0f172a";
const SLATE = "#475569";
const MUTED = "#94a3b8";
const LINE = "#e2e8f0";
const SOFT = "#f8fafc";
const TOTAL_BG = "#1e3a8a";

const SOURCE_COLOR: Record<string, string> = {
  "Meta ads": "#4f46e5",
  WA: "#10b981",
  IG: "#ec4899",
  Website: "#2563eb",
};

export interface ReportFonts {
  regular: Uint8Array | ArrayBuffer;
  bold: Uint8Array | ArrayBuffer;
}

export function loadReportFonts(): ReportFonts {
  const dir = path.join(process.cwd(), "src", "assets", "fonts");
  return {
    regular: fs.readFileSync(path.join(dir, "PlusJakartaSans-Regular.ttf")),
    bold: fs.readFileSync(path.join(dir, "PlusJakartaSans-Bold.ttf")),
  };
}

interface Ctx {
  doc: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
}

/* ── primitif gambar ── */

function roundedRect(
  page: PDFPage,
  o: { x: number; y: number; w: number; h: number; r?: number; fill?: string; border?: string; borderWidth?: number; opacity?: number }
) {
  const r = Math.min(o.r ?? 12, o.w / 2, o.h / 2);
  const p = [
    `M ${r} 0`,
    `H ${o.w - r}`,
    `A ${r} ${r} 0 0 1 ${o.w} ${r}`,
    `V ${o.h - r}`,
    `A ${r} ${r} 0 0 1 ${o.w - r} ${o.h}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${o.h - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ");
  page.drawSvgPath(p, {
    x: o.x,
    y: o.y + o.h, // drawSvgPath menggambar ke arah bawah dari titik y
    color: o.fill ? hex(o.fill) : undefined,
    borderColor: o.border ? hex(o.border) : undefined,
    borderWidth: o.borderWidth ?? (o.border ? 0.8 : 0),
    opacity: o.opacity,
  });
}

/** Gradasi horizontal (kiri→kanan) dengan beberapa pita. */
function hGradient(page: PDFPage, o: { x: number; y: number; w: number; h: number; from: string; to: string; steps?: number }) {
  const steps = o.steps ?? 48;
  const sw = o.w / steps;
  for (let i = 0; i < steps; i++) {
    page.drawRectangle({ x: o.x + i * sw, y: o.y, width: sw + 0.6, height: o.h, color: mix(o.from, o.to, i / (steps - 1)) });
  }
}

/** Gradasi vertikal (atas→bawah) di dalam kotak — dipakai batang grafik. */
function vGradient(page: PDFPage, o: { x: number; y: number; w: number; h: number; from: string; to: string; steps?: number }) {
  const steps = Math.max(6, Math.min(16, Math.round(o.h / 12)));
  const sh = o.h / steps;
  for (let i = 0; i < steps; i++) {
    page.drawRectangle({
      x: o.x,
      y: o.y + o.h - (i + 1) * sh,
      width: o.w,
      height: sh + 0.6,
      color: mix(o.from, o.to, i / (steps - 1)),
    });
  }
}

/** Garis putus-putus (emulasi dash pdf-lib). */
function dottedLine(page: PDFPage, x1: number, x2: number, y: number, color = LINE, dash = 1.6, gap = 2.6, thickness = 0.6) {
  for (let x = x1; x < x2; x += dash + gap) {
    page.drawLine({ start: { x, y }, end: { x: Math.min(x + dash, x2), y }, thickness, color: hex(color) });
  }
}

/* ── helper teks ── */

function label(page: PDFPage, font: PDFFont, value: string, o: { x: number; y: number; size?: number; color?: string }) {
  const size = o.size ?? 10;
  page.drawText(value, { x: o.x, y: o.y, size, font, color: hex(o.color ?? INK) });
}

function labelRight(page: PDFPage, font: PDFFont, value: string, o: { right: number; y: number; size?: number; color?: string }) {
  const size = o.size ?? 10;
  const w = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: o.right - w, y: o.y, size, font, color: hex(o.color ?? INK) });
}

function labelCenter(page: PDFPage, font: PDFFont, value: string, o: { center: number; y: number; size?: number; color?: string }) {
  const size = o.size ?? 10;
  const w = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: o.center - w / 2, y: o.y, size, font, color: hex(o.color ?? INK) });
}

const spaced = (s: string) => s.split("").join(" ");

/* ────────────────────────────── kartu ringkasan ────────────────────────────── */

function statCard(
  ctx: Ctx,
  o: { x: number; y: number; w: number; h: number; label: string; value: string; note: string; dot: string; big?: boolean; progress?: number }
) {
  roundedRect(ctx.page, { x: o.x, y: o.y, w: o.w, h: o.h, r: 12, fill: "#ffffff", border: LINE });
  ctx.page.drawCircle({ x: o.x + 20, y: o.y + o.h - 22, size: 3.2, color: hex(o.dot) });
  label(ctx.page, ctx.bold, spaced(o.label.toUpperCase()), { x: o.x + 30, y: o.y + o.h - 25, size: 8, color: MUTED });
  label(ctx.page, ctx.bold, o.value, { x: o.x + 20, y: o.y + o.h - (o.big ? 62 : 54), size: o.big ? 32 : 24, color: INK });
  label(ctx.page, ctx.regular, o.note, { x: o.x + 20, y: o.y + 10, size: 9, color: SLATE });
  if (typeof o.progress === "number") {
    const px = o.x + 20;
    const pw = o.w - 40;
    roundedRect(ctx.page, { x: px, y: o.y + 22, w: pw, h: 5, r: 3, fill: "#eef2f7" });
    const fillW = Math.max(3, Math.min(pw, (Math.min(o.progress, 100) / 100) * pw));
    roundedRect(ctx.page, { x: px, y: o.y + 22, w: fillW, h: 5, r: 3, fill: INDIGO });
  }
}

/* ────────────────────────────── grafik dua sumbu ────────────────────────────── */

function drawChart(ctx: Ctx, rows: DailyLeadRow[], peakTotal: number) {
  const page = ctx.page;
  const top = ctx.y;
  const titleH = 20;
  const plotH = 190; // ≈ 67 mm — memenuhi minimal ~70 mm bersama label
  const labelH = 16;
  const plotLeft = M + 34;
  const plotRight = M + CW - 30;
  const plotW = plotRight - plotLeft;
  const plotBottom = top - titleH - plotH;

  label(page, ctx.bold, "Leads Masuk vs Closing per Tanggal", { x: M, y: top - 10, size: 10, color: INK });

  // legenda di kanan
  const legendY = top - 8;
  labelRight(page, ctx.bold, "Closing", { right: M + CW - 2, y: legendY, size: 8, color: SLATE });
  const closingLegendW = ctx.bold.widthOfTextAtSize("Closing", 8);
  const legendLineRight = M + CW - 2 - closingLegendW - 6;
  page.drawLine({ start: { x: legendLineRight - 14, y: legendY + 3.5 }, end: { x: legendLineRight, y: legendY + 3.5 }, thickness: 1.6, color: hex(EMERALD) });
  page.drawCircle({ x: legendLineRight - 7, y: legendY + 3.5, size: 2, color: hex(EMERALD) });
  labelRight(page, ctx.bold, "Leads Masuk", { right: legendLineRight - 22, y: legendY, size: 8, color: SLATE });
  const leadsLegendW = ctx.bold.widthOfTextAtSize("Leads Masuk", 8);
  const swatchRight = legendLineRight - 22 - leadsLegendW - 6;
  vGradient(page, { x: swatchRight - 9, y: legendY, w: 9, h: 9, from: "#8fb2fb", to: INDIGO });

  const maxLeads = Math.max(1, rows.reduce((m, r) => Math.max(m, r.total), 0));
  const maxClosing = Math.max(1, rows.reduce((m, r) => Math.max(m, r.closing), 0));
  const niceLeads = Math.ceil(maxLeads / 4) * 4;

  // grid + tick kiri (leads) & kanan (closing)
  for (let i = 0; i <= 4; i++) {
    const fy = plotBottom + (i / 4) * plotH;
    dottedLine(page, plotLeft, plotRight, fy);
    labelRight(page, ctx.regular, String((niceLeads / 4) * i), { right: plotLeft - 6, y: fy - 3.5, size: 8, color: MUTED });
    const closingTick = Math.round((maxClosing / 4) * i);
    label(page, ctx.regular, String(closingTick), { x: plotRight + 6, y: fy - 3.5, size: 8, color: EMERALD });
  }

  const n = Math.max(1, rows.length);
  const slot = plotW / n;
  const barW = Math.max(4, Math.min(slot * 0.62, n > 20 ? 12 : 22));
  const labelStep = n > 20 ? 3 : n > 12 ? 2 : 1;

  rows.forEach((row, i) => {
    const cx = plotLeft + slot * i + slot / 2;
    const h = Math.max((row.total / niceLeads) * plotH, row.total > 0 ? 2 : 0);
    if (h > 0) {
      const isPeak = row.total === peakTotal && row.total > 0;
      vGradient(page, {
        x: cx - barW / 2,
        y: plotBottom,
        w: barW,
        h,
        from: isPeak ? "#3b82f6" : "#c9dbfe",
        to: isPeak ? INDIGO : "#8fb2fb",
      });
      if (isPeak) {
        labelCenter(page, ctx.bold, `Puncak ${row.total}`, { center: cx, y: plotBottom + h + 5, size: 8, color: BLUE });
      }
    }
    if (i % labelStep === 0 || i === n - 1) {
      labelCenter(page, ctx.regular, String(Number(row.tanggal.slice(8, 10))), { center: cx, y: plotBottom - 11, size: 8, color: MUTED });
    }
  });

  // garis closing: spline Catmull-Rom disampel → segmen pendek (halus, tanpa menembus 0)
  const pts = rows.map((row, i) => ({
    x: plotLeft + slot * i + slot / 2,
    y: plotBottom + (row.closing / maxClosing) * plotH,
  }));
  const curve: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    for (let s = 0; s < 8; s++) {
      const t = s / 8;
      const t2 = t * t;
      const t3 = t2 * t;
      curve.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  curve.push(pts[pts.length - 1]);
  for (let i = 1; i < curve.length; i++) {
    if (!curve[i - 1] || !curve[i]) continue;
    page.drawLine({ start: curve[i - 1], end: curve[i], thickness: 1.8, color: hex(EMERALD) });
  }
  for (const p of pts) {
    page.drawCircle({ x: p.x, y: p.y, size: 2.4, color: hex("#ffffff"), borderColor: hex(EMERALD), borderWidth: 1.2 });
  }

  ctx.y = plotBottom - labelH - 6;
}

/* ────────────────────────────── blok lain halaman 1 ────────────────────────────── */

function drawSources(ctx: Ctx, summary: LeadsSummary, x: number, y: number, w: number) {
  const page = ctx.page;
  label(page, ctx.bold, spaced("SUMBER LEADS"), { x, y, size: 8, color: MUTED });
  let ry = y - 18;
  const maxCount = Math.max(1, summary.sources.reduce((m, s) => Math.max(m, s.count), 0));
  const nameW = 62;
  const valueW = 74;
  const barW = w - nameW - valueW;
  summary.sources.forEach((s) => {
    label(page, ctx.bold, s.name, { x, y: ry, size: 9.5, color: INK });
    const bx = x + nameW;
    roundedRect(page, { x: bx, y: ry - 1, w: barW, h: 9, r: 4.5, fill: "#eef2f7" });
    const fw = Math.max((s.count / maxCount) * (barW - 4), s.count > 0 ? 4 : 0);
    if (fw > 0) roundedRect(page, { x: bx + 2, y: ry, w: fw, h: 7, r: 3.5, fill: SOURCE_COLOR[s.name] || INDIGO });
    labelRight(page, ctx.regular, `${nfmt(s.count)} · ${s.pct.toFixed(1)}%`, { right: x + w, y: ry, size: 9, color: SLATE });
    ry -= 24;
  });
  return ry;
}

function drawHighlights(ctx: Ctx, summary: LeadsSummary, x: number, y: number, w: number) {
  const page = ctx.page;
  label(page, ctx.bold, spaced("SOROTAN"), { x, y, size: 8, color: MUTED });
  const cards = [
    { value: summary.peakLeads || 0, note: summary.peakLeadsDate ? `puncak ${DAY_SHORT[new Date(`${summary.peakLeadsDate}T00:00:00Z`).getUTCDay()]}, ${Number(summary.peakLeadsDate.slice(8, 10))} ${MONTHS_ID_SHORT[Number(summary.peakLeadsDate.slice(5, 7)) - 1]}` : "belum ada", label: "leads terbanyak" },
    { value: summary.peakClosing || 0, note: summary.peakClosingDate ? `${Number(summary.peakClosingDate.slice(8, 10))} ${MONTHS_ID_SHORT[Number(summary.peakClosingDate.slice(5, 7)) - 1]}` : "belum ada", label: "closing terbanyak" },
    { value: summary.sources[0]?.count || 0, note: summary.topSource, label: "sumber terbesar" },
  ];
  let cy = y - 14;
  const h = 34;
  cards.forEach((c) => {
    roundedRect(page, { x, y: cy - h, w, h, r: 10, fill: SOFT, border: LINE });
    label(page, ctx.bold, nfmt(c.value), { x: x + 12, y: cy - 24, size: 17, color: INK });
    label(page, ctx.regular, c.label, { x: x + 12, y: cy - 31, size: 8, color: MUTED });
    labelRight(page, ctx.bold, c.note, { right: x + w - 12, y: cy - 20, size: 8.5, color: SLATE });
    cy -= h + 8;
  });
  return cy;
}

function weeklyBlocks(rows: DailyLeadRow[]) {
  const out: { label: string; days: number; total: number; closing: number; rate: number; partial: boolean }[] = [];
  for (let i = 0; i < rows.length; i += 7) {
    const chunk = rows.slice(i, i + 7);
    if (chunk.length === 0) continue;
    const total = chunk.reduce((s, r) => s + r.total, 0);
    const closing = chunk.reduce((s, r) => s + r.closing, 0);
    const a = Number(chunk[0].tanggal.slice(8, 10));
    const b = Number(chunk[chunk.length - 1].tanggal.slice(8, 10));
    const month = MONTHS_ID_SHORT[Number(chunk[0].tanggal.slice(5, 7)) - 1];
    out.push({
      label: a === b ? `${a} ${month}` : `${a}–${b} ${month}`,
      days: chunk.length,
      total,
      closing,
      rate: total > 0 ? (closing / total) * 100 : 0,
      partial: chunk.length < 7,
    });
  }
  return out;
}

function drawWeekly(ctx: Ctx, rows: DailyLeadRow[]) {
  const page = ctx.page;
  const blocks = weeklyBlocks(rows);
  label(page, ctx.bold, spaced("PERBANDINGAN MINGGUAN"), { x: M, y: ctx.y, size: 8, color: MUTED });
  ctx.y -= 16;
  if (blocks.length === 0) {
    label(page, ctx.regular, "Belum ada data pada periode ini.", { x: M, y: ctx.y, size: 9, color: SLATE });
    ctx.y -= 18;
    return;
  }
  const gap = 8;
  const cardW = (CW - gap * (blocks.length - 1)) / blocks.length;
  const h = 62;
  blocks.forEach((b, i) => {
    const x = M + i * (cardW + gap);
    roundedRect(page, { x, y: ctx.y - h, w: cardW, h, r: 10, fill: "#ffffff", border: LINE });
    label(page, ctx.bold, `${b.label}`, { x: x + 10, y: ctx.y - 16, size: 9.5, color: INK });
    label(page, ctx.bold, nfmt(b.total), { x: x + 10, y: ctx.y - 36, size: 18, color: BLUE });
    labelRight(page, ctx.bold, `${b.rate.toFixed(1)}%`, { right: x + cardW - 10, y: ctx.y - 36, size: 9, color: EMERALD });
    label(page, ctx.regular, `${nfmt(b.closing)} closing`, { x: x + 10, y: ctx.y - 48, size: 8, color: SLATE });
    if (b.partial) labelRight(page, ctx.regular, `${b.days} hari`, { right: x + cardW - 10, y: ctx.y - 16, size: 8, color: MUTED });
  });
  ctx.y -= h + 10;
}

/* ────────────────────────────── halaman 1 ────────────────────────────── */

function drawHeaderBand(ctx: Ctx, summary: LeadsSummary, generatedAt: string) {
  const page = ctx.page;
  const bandH = 122;
  hGradient(page, { x: 0, y: PAGE_H - bandH, w: PAGE_W, h: bandH, from: BLUE, to: INDIGO });

  label(page, ctx.bold, "SAMAQU", { x: M, y: PAGE_H - 44, size: 18, color: "#ffffff" });
  const wm = ctx.bold.widthOfTextAtSize("SAMAQU", 18);
  label(page, ctx.bold, spaced("INTERNAL"), { x: M + wm + 10, y: PAGE_H - 41, size: 8, color: "#c7d7fd" });
  labelRight(page, ctx.regular, `Dibuat ${generatedAt}`, { right: PAGE_W - M, y: PAGE_H - 42, size: 9, color: "#dbe4ff" });

  label(page, ctx.bold, "Laporan Leads dan Closing", { x: M, y: PAGE_H - 76, size: 24, color: "#ffffff" });
  label(page, ctx.regular, summary.periodLabel, { x: M, y: PAGE_H - 99, size: 11, color: "#e3e9ff" });

  const foot = summary.running
    ? `${summary.dayCount} hari berjalan · sumber data: tabel leads dashboard internal`
    : `${summary.dayCount} hari · sumber data: tabel leads dashboard internal`;
  label(page, ctx.regular, foot, { x: M, y: PAGE_H - 115, size: 8, color: "#c7d7fd" });

  ctx.y = PAGE_H - bandH - 20;
}

/* ────────────────────────────── halaman 2: tabel ────────────────────────────── */

const COL_TANGGAL = 112;
const COL_SOURCE = 54;
const COL_TOTAL = 66;
const COL_CLOSING = 66;
const ROW_H = 28; // ≈ 9,9 mm

function tableColumns() {
  const x0 = M;
  const sources = REPORT_SOURCES.map((_, i) => x0 + COL_TANGGAL + i * COL_SOURCE);
  const total = x0 + COL_TANGGAL + REPORT_SOURCES.length * COL_SOURCE;
  const closing = total + COL_TOTAL;
  return { tanggal: x0, sources, total, closing, right: M + CW };
}

function drawTableHeader(ctx: Ctx) {
  const page = ctx.page;
  const cols = tableColumns();
  const h = 30;
  const y = ctx.y - h;
  // SATU latar untuk semua kolom (dulu separuh kanan beda warna = terlihat glitch)
  page.drawRectangle({ x: M, y, width: CW, height: h, color: hex("#1e3a8a") });
  page.drawRectangle({ x: M, y: y + h - 3, width: CW, height: 3, color: hex(INDIGO) });

  const size = 8;
  const center = y + h / 2;
  label(page, ctx.bold, spaced("TANGGAL"), { x: cols.tanggal + 10, y: center - 3, size, color: "#ffffff" });
  REPORT_SOURCES.forEach((s, i) => {
    labelRight(page, ctx.bold, spaced(s.toUpperCase()), { right: cols.sources[i] + COL_SOURCE - 8, y: center - 3, size, color: "#dbe4ff" });
  });
  const twoLine = (lines: string[], right: number, color = "#dbe4ff") => {
    labelRight(page, ctx.bold, lines[0], { right, y: center + 1, size, color });
    labelRight(page, ctx.bold, lines[1], { right, y: center - 9, size, color });
  };
  twoLine(["TOTAL", "LEADS"], cols.total + COL_TOTAL - 8, "#ffffff");
  twoLine(["TOTAL", "CLOSING"], cols.closing + COL_CLOSING - 8, "#ffffff");
  twoLine(["CLOSING", "META ADS"], cols.right - 10);
  ctx.y = y;
}

function drawTableRow(ctx: Ctx, row: DailyLeadRow, o: { zebra: boolean; heat: number; maxLeads: number; total?: boolean }) {
  const page = ctx.page;
  const cols = tableColumns();
  const y = ctx.y - ROW_H;
  const dow = new Date(`${row.tanggal}T00:00:00Z`).getUTCDay();
  const weekend = dow === 0 || dow === 6;

  if (o.total) {
    page.drawRectangle({ x: M, y, width: CW, height: ROW_H, color: hex(TOTAL_BG) });
  } else if (weekend) {
    page.drawRectangle({ x: M, y, width: CW, height: ROW_H, color: hex("#f6f8fc") });
  } else if (o.zebra) {
    page.drawRectangle({ x: M, y, width: CW, height: ROW_H, color: hex("#fbfcfe") });
  }

  const ty = y + (ROW_H - 10) / 2 + 1;
  const bold = o.total ? ctx.bold : ctx.bold;
  const ink = o.total ? "#ffffff" : INK;
  const plain = o.total ? "#e3e9ff" : SLATE;

  if (o.total) {
    label(page, ctx.bold, spaced("TOTAL"), { x: cols.tanggal + 10, y: ty, size: 10, color: "#ffffff" });
  } else {
    const day = Number(row.tanggal.slice(8, 10));
    label(page, ctx.bold, `${day} ${MONTHS_ID_SHORT[Number(row.tanggal.slice(5, 7)) - 1]} · ${DAY_SHORT[dow]}`, { x: cols.tanggal + 10, y: ty, size: 10, color: INK });
  }

  REPORT_SOURCES.forEach((s, i) => {
    labelRight(page, ctx.regular, nfmt(row.perSumber[s] || 0), { right: cols.sources[i] + COL_SOURCE - 8, y: ty, size: 10, color: plain });
  });

  // Total Leads: tebal + shading biru sesuai nilai (heatmap halus)
  const heat = o.total ? 1 : o.maxLeads > 0 ? row.total / o.maxLeads : 0;
  if (!o.total) {
    roundedRect(page, {
      x: cols.total + 4,
      y: y + 5,
      w: COL_TOTAL - 12,
      h: ROW_H - 10,
      r: 6,
      fill: BLUE,
      opacity: 0.06 + heat * 0.16,
    });
  }
  labelRight(page, ctx.bold, nfmt(row.total), { right: cols.total + COL_TOTAL - 8, y: ty, size: 10.5, color: o.total ? "#ffffff" : "#1d4ed8" });

  // Closing: chip hijau lembut kalau > 0
  if (!o.total && row.closing > 0) {
    const chipW = 26;
    const cx = cols.closing + COL_CLOSING - 8 - chipW;
    roundedRect(page, { x: cx, y: y + 5.5, w: chipW, h: ROW_H - 11, r: 7, fill: "#dcfce7" });
    labelCenter(page, ctx.bold, nfmt(row.closing), { center: cx + chipW / 2, y: ty, size: 10, color: "#047857" });
  } else {
    labelRight(page, o.total ? ctx.bold : ctx.regular, nfmt(row.closing), { right: cols.closing + COL_CLOSING - 8, y: ty, size: 10, color: o.total ? "#ffffff" : MUTED });
  }
  labelRight(page, ctx.regular, nfmt(row.closingMetaAds), { right: cols.right - 10, y: ty, size: 10, color: plain });

  if (!o.total) {
    page.drawLine({ start: { x: M, y }, end: { x: M + CW, y }, thickness: 0.5, color: hex("#eef2f7") });
  }
  ctx.y = y;
}

function drawTableNotes(ctx: Ctx) {
  const notes = [
    "Konversi = Total Closing dibagi Total Leads (periode laporan). Closing Meta Ads = leads berstatus closing dengan sumber Meta ads.",
    "Hari tanpa data tetap ditampilkan dengan angka 0. Sumber: tabel leads pada dashboard internal SAMAQU (/ops/leads).",
  ];
  ctx.y -= 12;
  for (const note of notes) {
    label(ctx.page, ctx.regular, note, { x: M, y: ctx.y, size: 8, color: MUTED });
    ctx.y -= 11;
  }
}

/* ────────────────────────────── footer ────────────────────────────── */

function drawFooters(doc: PDFDocument, regular: PDFFont) {
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawLine({ start: { x: M, y: FOOTER_Y + 12 }, end: { x: PAGE_W - M, y: FOOTER_Y + 12 }, thickness: 0.6, color: hex(LINE) });
    page.drawText("SAMAQU Internal, rahasia", { x: M, y: FOOTER_Y, size: 8, font: regular, color: hex(MUTED) });
    const t = `Halaman ${i + 1} dari ${pages.length}`;
    const w = regular.widthOfTextAtSize(t, 8);
    page.drawText(t, { x: PAGE_W - M - w, y: FOOTER_Y, size: 8, font: regular, color: hex(MUTED) });
  });
}

/* ────────────────────────────── perakit laporan ────────────────────────────── */

export function tableRows(summary: LeadsSummary, dailyRows: DailyLeadRow[]): DailyLeadRow[] {
  const byDate = new Map(dailyRows.map((r) => [r.tanggal, r]));
  const out: DailyLeadRow[] = [];
  for (let day = 1; day <= summary.dayCount; day++) {
    const iso = `${summary.month}-${pad(day)}`;
    out.push(byDate.get(iso) || { tanggal: iso, perSumber: {}, perSumberClosing: {}, total: 0, closing: 0, closingMetaAds: 0 });
  }
  return out;
}

export interface BuiltLeadsReport {
  bytes: Uint8Array;
  summary: LeadsSummary & { dailyRowsInPeriod: DailyLeadRow[] };
  rows: DailyLeadRow[];
  pageCount: number;
}

export async function buildLeadsReportPdf(
  input: LeadsReportInput & { fonts?: ReportFonts }
): Promise<BuiltLeadsReport> {
  const now = input.now ?? new Date();
  const summary = summarizeLeadsReport({ month: input.month, leads: input.leads, now });
  const allDaily = buildDailyRows(input.leads || []).filter((r) => r.tanggal >= summary.periodStart && r.tanggal <= summary.periodEnd);
  const full = { ...summary, dailyRowsInPeriod: allDaily };
  const rows = tableRows(summary, allDaily);
  const maxLeads = Math.max(1, allDaily.reduce((m, r) => Math.max(m, r.total), 0));

  const fonts = input.fonts ?? loadReportFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold, { subset: true });

  const ctx: Ctx = { doc, regular, bold, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H };
  const generatedAt = generatedAtID(now);

  /* ── halaman 1 ── */
  drawHeaderBand(ctx, summary, generatedAt);

  const bigGap = 12;
  const bigW = (CW - bigGap * 2) / 3;
  const bigH = 92;
  const rowTop = ctx.y;
  [
    { label: "Total Leads", value: nfmt(summary.totals.total), note: `${summary.dayCount} hari periode`, dot: BLUE },
    { label: "Total Closing", value: nfmt(summary.totals.closing), note: "status closing", dot: EMERALD },
    { label: "Konversi", value: `${summary.conversion.toFixed(1)}%`, note: "closing / leads", dot: INDIGO, progress: summary.conversion },
  ].forEach((c, i) => {
    statCard(ctx, { x: M + i * (bigW + bigGap), y: rowTop - bigH, w: bigW, h: bigH, ...c, big: true });
  });
  ctx.y = rowTop - bigH - 12;

  const smallGap = 12;
  const smallW = (CW - smallGap) / 2;
  const smallH = 66;
  const row2 = ctx.y;
  [
    { label: "Closing Meta Ads", value: nfmt(summary.totals.closingMetaAds), note: "dari total closing", dot: "#8b5cf6" },
    { label: "Rata-rata / Hari", value: summary.averagePerDay.toFixed(1), note: "leads per hari", dot: "#0ea5e9" },
  ].forEach((c, i) => {
    statCard(ctx, { x: M + i * (smallW + smallGap), y: row2 - smallH, w: smallW, h: smallH, ...c });
  });
  ctx.y = row2 - smallH - 20;

  drawChart(ctx, allDaily, maxLeads);

  // dua kolom: sumber (kiri) + sorotan (kanan)
  const colGap = 16;
  const leftW = Math.round(CW * 0.56);
  const rightW = CW - leftW - colGap;
  const colTop = ctx.y;
  const afterSources = drawSources(ctx, summary, M, colTop, leftW);
  const afterHighlights = drawHighlights(ctx, summary, M + leftW + colGap, colTop, rightW);
  ctx.y = Math.min(afterSources, afterHighlights) - 10;

  drawWeekly(ctx, allDaily);

  /* ── halaman 2: tabel ── */
  const tableTop = PAGE_H - M;
  ctx.page = doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = tableTop;
  label(ctx.page, bold, "Data Rekap Harian", { x: M, y: ctx.y, size: 14, color: INK });
  ctx.y -= 14;
  label(ctx.page, regular, `${summary.periodLabel} · ${summary.dayCount} hari`, { x: M, y: ctx.y, size: 9, color: SLATE });
  ctx.y -= 16;

  drawTableHeader(ctx);
  const totals = summary.totals;
  const totalRow: DailyLeadRow = {
    tanggal: summary.periodEnd,
    perSumber: totals.perSumber,
    perSumberClosing: {},
    total: totals.total,
    closing: totals.closing,
    closingMetaAds: totals.closingMetaAds,
  };

  rows.forEach((row, i) => {
    const reserve = i === rows.length - 1 ? ROW_H + 46 : ROW_H;
    if (ctx.y - reserve < M + 16) {
      ctx.page = doc.addPage([PAGE_W, PAGE_H]);
      ctx.y = tableTop;
      label(ctx.page, bold, "Data Rekap Harian (lanjutan)", { x: M, y: ctx.y, size: 12, color: INK });
      ctx.y -= 14;
      drawTableHeader(ctx);
    }
    drawTableRow(ctx, row, { zebra: i % 2 === 1, heat: 0, maxLeads });
  });

  if (ctx.y - ROW_H - 50 < M + 16) {
    ctx.page = doc.addPage([PAGE_W, PAGE_H]);
    ctx.y = tableTop;
    drawTableHeader(ctx);
  }
  drawTableRow(ctx, totalRow, { zebra: false, heat: 1, maxLeads, total: true });
  drawTableNotes(ctx);

  drawFooters(doc, regular);

  const bytes = await doc.save();
  return { bytes, summary: full, rows, pageCount: doc.getPageCount() };
}
