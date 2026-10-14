/**
 * Laporan Leads & Closing → PDF (A4 portrait, vektor, font Inter ter-embed).
 *
 * Dipakai endpoint `GET /api/ops/leads/report?bulan=YYYY-MM`.
 *
 * Gaya: laporan bisnis formal — latar putih, teks charcoal, aksen brand seperlunya.
 * TIDAK ada grafik, progress bar, gradient, atau ornamen dekoratif: semua informasi
 * disampaikan sebagai angka, tabel, dan catatan teks.
 *
 * Pustaka: pdf-lib + @pdf-lib/fontkit (murni JS → aman di Vercel serverless). Font Inter
 * di-embed (subset) dari src/assets/fonts.
 *
 * Angka & definisi: agregasi memakai definisi yang sama persis dengan halaman
 * /ops/leads/laporan (buildDailyRows/buildTotals). Modul ini tidak menulis apa pun.
 */

import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ────────────────────────────── data & agregasi (tidak berubah) ────────────────────────────── */

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

/** Nama tampilan sumber untuk laporan formal. */
const SOURCE_LABEL: Record<string, string> = {
  "Meta ads": "Meta Ads",
  WA: "WhatsApp",
  IG: "Instagram",
  Website: "Website",
};

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_ID_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const pad = (n: number) => String(n).padStart(2, "0");
const nfmt = (n: number) => n.toLocaleString("id-ID");

export function tanggalID(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "-";
  return `${Number(m[3])} ${MONTHS_ID[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

export function todayWib(now: Date = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}`;
}

/** "14 Oktober 2026, 16.04 WIB" */
export function generatedAtID(now: Date): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCDate()} ${MONTHS_ID[wib.getUTCMonth()]} ${wib.getUTCFullYear()}, ${pad(wib.getUTCHours())}.${pad(wib.getUTCMinutes())} WIB`;
}

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
      ? `Sumber terbesar: ${SOURCE_LABEL[topSource] || topSource} dengan ${nfmt(sources[0].count)} leads (${sources[0].pct.toFixed(1)}%).`
      : "Sumber leads belum ada datanya pada periode ini."
  );

  const periodLabel = running
    ? `${Number(first.slice(8, 10))} sampai ${Number(periodEnd.slice(8, 10))} ${MONTHS_ID[monthIdx]} ${year}`
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

export function summaryText(summary: LeadsSummary): string {
  return [
    `Laporan Leads SAMAQU — ${summary.monthLabel}`,
    `Total leads: ${nfmt(summary.totals.total)}`,
    `Total closing: ${nfmt(summary.totals.closing)}`,
    `Konversi: ${summary.conversion.toFixed(1)}%`,
    `Sumber terbesar: ${SOURCE_LABEL[summary.topSource] || summary.topSource} (${nfmt(summary.sources[0]?.count || 0)})`,
  ].join("\n");
}

export function reportFileName(summary: LeadsSummary): string {
  const [y, mm] = summary.month.split("-");
  return `Laporan-Leads-SAMAQU-${MONTHS_ID[Number(mm) - 1]}-${y}.pdf`;
}

/* ────────────────────────────── tipografi & palet ────────────────────────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48; // ≈ 17 mm
const CW = PAGE_W - MARGIN * 2; // 499.28
const FOOTER_Y = 32;

const INK = "#1f2937"; // charcoal
const SUB = "#6b7280";
const FAINT = "#9ca3af";
const RULE = "#e5e7eb";
const ZEBRA = "#f7f8fa";
const HEAD_BG = "#eef1f5";
const BRAND = "#2563eb"; // aksen brand, dipakai hemat

const S = {
  title: 24,
  section: 13,
  body: 10.5,
  table: 10,
  small: 8.5,
  kpi: 24,
};

const hex = (h: string) => {
  const s = h.replace("#", "");
  return rgb(parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255);
};

export interface ReportFonts {
  regular: Uint8Array | ArrayBuffer;
  bold: Uint8Array | ArrayBuffer;
}

/** Font Inter di-embed dari repo (bukan font bawaan PDF viewer). */
export function loadReportFonts(): ReportFonts {
  const dir = path.join(process.cwd(), "src", "assets", "fonts");
  return {
    regular: fs.readFileSync(path.join(dir, "Inter-Regular.ttf")),
    bold: fs.readFileSync(path.join(dir, "Inter-SemiBold.ttf")),
  };
}

interface Ctx {
  doc: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
}

function rect(page: PDFPage, o: { x: number; y: number; w: number; h: number; fill?: string; border?: string; borderWidth?: number }) {
  page.drawRectangle({
    x: o.x,
    y: o.y,
    width: o.w,
    height: o.h,
    color: o.fill ? hex(o.fill) : undefined,
    borderColor: o.border ? hex(o.border) : undefined,
    borderWidth: o.border ? o.borderWidth ?? 0.7 : 0,
  });
}

function rule(page: PDFPage, y: number, x1 = MARGIN, x2 = MARGIN + CW, color = RULE, thickness = 0.7) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color: hex(color) });
}

function text(page: PDFPage, font: PDFFont, value: string, o: { x: number; y: number; size?: number; color?: string }) {
  page.drawText(value, { x: o.x, y: o.y, size: o.size ?? S.body, font, color: hex(o.color ?? INK) });
}

function textRight(page: PDFPage, font: PDFFont, value: string, o: { right: number; y: number; size?: number; color?: string }) {
  const size = o.size ?? S.body;
  page.drawText(value, { x: o.right - font.widthOfTextAtSize(value, size), y: o.y, size, font, color: hex(o.color ?? INK) });
}

function textCenter(page: PDFPage, font: PDFFont, value: string, o: { center: number; y: number; size?: number; color?: string }) {
  const size = o.size ?? S.body;
  page.drawText(value, { x: o.center - font.widthOfTextAtSize(value, size) / 2, y: o.y, size, font, color: hex(o.color ?? INK) });
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  // Normalisasi spasi tak biasa (NBSP / narrow no-break space dari toLocaleString).
  const clean = String(value).replace(/[\u00a0\u202f\u2009\u2007\u2060]/g, " ").replace(/\s+/g, " ").trim();
  // Batas aman 6%: sebagian glyph (tanda hubung panjang / tanda kurung) diukur lebih kecil
  // oleh fontkit daripada lebar gambar sebenarnya, jadi jangan pas-pasan.
  const limit = maxWidth * 0.94;
  const words = clean.split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= limit) {
      line = candidate;
      continue;
    }
    if (line) out.push(line);
    if (font.widthOfTextAtSize(w, size) > limit) {
      let chunk = "";
      for (const ch of w) {
        if (font.widthOfTextAtSize(chunk + ch, size) <= limit) chunk += ch;
        else {
          out.push(chunk);
          chunk = ch;
        }
      }
      line = chunk;
    } else {
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

/** Judul bagian: teks charcoal + garis tipis di bawahnya (pemisah, bukan dekorasi). */
function sectionTitle(ctx: Ctx, title: string) {
  text(ctx.page, ctx.bold, title, { x: MARGIN, y: ctx.y, size: S.section, color: INK });
  ctx.y -= 8;
  rule(ctx.page, ctx.y);
  ctx.y -= 16;
}

/* ────────────────────────────── blok halaman 1 ────────────────────────────── */

function drawMasthead(ctx: Ctx, summary: LeadsSummary, generatedAt: string) {
  const page = ctx.page;
  text(page, ctx.bold, "SAMAQU", { x: MARGIN, y: ctx.y, size: 15, color: INK });
  const wm = ctx.bold.widthOfTextAtSize("SAMAQU", 15);
  text(page, ctx.regular, "Laporan internal", { x: MARGIN + wm + 10, y: ctx.y + 1, size: S.small, color: FAINT });
  textRight(page, ctx.regular, `Dibuat ${generatedAt}`, { right: MARGIN + CW, y: ctx.y + 1, size: S.small, color: FAINT });

  // aksen brand tunggal (tipis & pendek)
  ctx.y -= 14;
  page.drawRectangle({ x: MARGIN, y: ctx.y, width: 40, height: 2.5, color: hex(BRAND) });

  ctx.y -= 30;
  text(page, ctx.bold, "Laporan Leads dan Closing", { x: MARGIN, y: ctx.y, size: S.title, color: INK });
  ctx.y -= 20;
  const period = `Periode ${summary.periodLabel}${summary.running ? " · data berjalan" : ""}`;
  text(page, ctx.regular, period, { x: MARGIN, y: ctx.y, size: S.body, color: SUB });
  ctx.y -= 16;
  text(page, ctx.regular, `${summary.dayCount} hari · sumber data: tabel leads dashboard internal SAMAQU`, {
    x: MARGIN,
    y: ctx.y,
    size: S.small,
    color: FAINT,
  });
  ctx.y -= 14;
  rule(page, ctx.y, MARGIN, MARGIN + CW, RULE);
}

function drawKpi(ctx: Ctx, summary: LeadsSummary) {
  const cards = [
    { label: "Total leads", value: nfmt(summary.totals.total), note: `${summary.dayCount} hari periode` },
    { label: "Total closing", value: nfmt(summary.totals.closing), note: "status closing" },
    { label: "Tingkat konversi", value: `${summary.conversion.toFixed(1)}%`, note: "closing ÷ leads" },
    { label: "Closing Meta Ads", value: nfmt(summary.totals.closingMetaAds), note: "dari total closing" },
    { label: "Rata-rata per hari", value: summary.averagePerDay.toFixed(1), note: "leads per hari" },
  ];
  const h = 76;
  rect(ctx.page, { x: MARGIN, y: ctx.y - h, w: CW, h, border: RULE });
  const colW = CW / cards.length;
  cards.forEach((c, i) => {
    const x = MARGIN + i * colW;
    if (i > 0) ctx.page.drawLine({ start: { x, y: ctx.y - h + 12 }, end: { x, y: ctx.y - 12 }, thickness: 0.6, color: hex(RULE) });
    text(ctx.page, ctx.regular, c.label, { x: x + 14, y: ctx.y - 22, size: S.small, color: SUB });
    text(ctx.page, ctx.bold, c.value, { x: x + 14, y: ctx.y - 48, size: S.kpi, color: INK });
    text(ctx.page, ctx.regular, c.note, { x: x + 14, y: ctx.y - 64, size: 8, color: FAINT });
  });
  ctx.y -= h;
}

function drawSourceTable(ctx: Ctx, summary: LeadsSummary) {
  const page = ctx.page;
  const cols = { sumber: MARGIN, leads: MARGIN + 300, pct: MARGIN + CW };
  const headH = 22;
  rect(page, { x: MARGIN, y: ctx.y - headH, w: CW, h: headH, fill: HEAD_BG });
  text(page, ctx.bold, "Sumber", { x: cols.sumber + 12, y: ctx.y - 15, size: S.table, color: INK });
  textRight(page, ctx.bold, "Total leads", { right: cols.leads, y: ctx.y - 15, size: S.table, color: INK });
  textRight(page, ctx.bold, "Persentase", { right: cols.pct - 12, y: ctx.y - 15, size: S.table, color: INK });
  ctx.y -= headH;

  const rowH = 21;
  summary.sources.forEach((s, i) => {
    if (i % 2 === 1) rect(page, { x: MARGIN, y: ctx.y - rowH, w: CW, h: rowH, fill: ZEBRA });
    text(page, ctx.regular, SOURCE_LABEL[s.name] || s.name, { x: cols.sumber + 12, y: ctx.y - 14, size: S.table, color: INK });
    textRight(page, ctx.regular, nfmt(s.count), { right: cols.leads, y: ctx.y - 14, size: S.table, color: INK });
    textRight(page, ctx.regular, `${s.pct.toFixed(1)}%`, { right: cols.pct - 12, y: ctx.y - 14, size: S.table, color: SUB });
    ctx.y -= rowH;
    rule(page, ctx.y, MARGIN, MARGIN + CW, "#f1f3f6", 0.6);
  });

  const sum = summary.sources.reduce((t, s) => t + s.count, 0);
  rule(page, ctx.y, MARGIN, MARGIN + CW, RULE, 1);
  const totalH = 24;
  text(page, ctx.bold, "Total sumber", { x: cols.sumber + 12, y: ctx.y - 15, size: S.table, color: INK });
  textRight(page, ctx.bold, nfmt(sum), { right: cols.leads, y: ctx.y - 15, size: S.table, color: INK });
  textRight(page, ctx.regular, "100,0%", { right: cols.pct - 12, y: ctx.y - 15, size: S.table, color: SUB });
  ctx.y -= totalH;
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
      label: a === b ? `${a} ${month}` : `${a}-${b} ${month}`,
      days: chunk.length,
      total,
      closing,
      rate: total > 0 ? (closing / total) * 100 : 0,
      partial: chunk.length < 7,
    });
  }
  return out;
}

function drawWeeklyTable(ctx: Ctx, rows: DailyLeadRow[]) {
  const page = ctx.page;
  const blocks = weeklyBlocks(rows);
  const cols = { periode: MARGIN, hari: MARGIN + 190, leads: MARGIN + 290, closing: MARGIN + 380, rate: MARGIN + CW };
  const headH = 20;
  rect(page, { x: MARGIN, y: ctx.y - headH, w: CW, h: headH, fill: HEAD_BG });
  text(page, ctx.bold, "Periode", { x: cols.periode + 12, y: ctx.y - 14, size: S.table, color: INK });
  text(page, ctx.bold, "Hari", { x: cols.hari, y: ctx.y - 14, size: S.table, color: INK });
  textRight(page, ctx.bold, "Leads", { right: cols.leads, y: ctx.y - 14, size: S.table, color: INK });
  textRight(page, ctx.bold, "Closing", { right: cols.closing, y: ctx.y - 14, size: S.table, color: INK });
  textRight(page, ctx.bold, "Konversi", { right: cols.rate - 12, y: ctx.y - 14, size: S.table, color: INK });
  ctx.y -= headH;

  if (blocks.length === 0) {
    text(page, ctx.regular, "Belum ada data pada periode ini.", { x: cols.periode + 12, y: ctx.y - 14, size: S.table, color: SUB });
    ctx.y -= 22;
    return;
  }

  const rowH = 20;
  blocks.forEach((b, i) => {
    if (i % 2 === 1) rect(page, { x: MARGIN, y: ctx.y - rowH, w: CW, h: rowH, fill: ZEBRA });
    text(page, ctx.regular, b.label, { x: cols.periode + 12, y: ctx.y - 14, size: S.table, color: INK });
    text(page, ctx.regular, b.partial ? `${b.days} (sebagian)` : String(b.days), { x: cols.hari, y: ctx.y - 14, size: S.table, color: SUB });
    textRight(page, ctx.regular, nfmt(b.total), { right: cols.leads, y: ctx.y - 14, size: S.table, color: INK });
    textRight(page, ctx.regular, nfmt(b.closing), { right: cols.closing, y: ctx.y - 14, size: S.table, color: INK });
    textRight(page, ctx.regular, `${b.rate.toFixed(1)}%`, { right: cols.rate - 12, y: ctx.y - 14, size: S.table, color: SUB });
    ctx.y -= rowH;
    rule(page, ctx.y, MARGIN, MARGIN + CW, "#f1f3f6", 0.6);
  });
}

function highlightLines(summary: LeadsSummary, rows: DailyLeadRow[]): string[] {
  const blocks = weeklyBlocks(rows);
  const lines = [...summary.highlights];
  if (blocks.length >= 2) {
    const a = blocks[blocks.length - 2];
    const b = blocks[blocks.length - 1];
    const diff = b.total - a.total;
    const pct = a.total > 0 ? (diff / a.total) * 100 : 0;
    lines.push(
      `Perbandingan dua blok terakhir: ${a.label} ${nfmt(a.total)} leads (konversi ${a.rate.toFixed(1)}%) dan ${b.label} ${nfmt(b.total)} leads (konversi ${b.rate.toFixed(1)}%). Selisih ${diff >= 0 ? "+" : "-"}${nfmt(Math.abs(diff))} leads (${pct >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(1)}%).`
    );
  } else if (blocks.length === 1) {
    lines.push(`Periode ini hanya mencakup satu blok mingguan (${blocks[0].label}) sehingga belum ada pembanding.`);
  }
  return lines;
}

function analysisNote(summary: LeadsSummary, rows: DailyLeadRow[]): string[] {
  const blocks = weeklyBlocks(rows);
  const out: string[] = [];
  if (summary.totals.total === 0) {
    out.push("Tidak ada leads tercatat pada periode ini, sehingga belum ada angka yang bisa dianalisis.");
    return out;
  }
  out.push(
    `Fakta: ${nfmt(summary.totals.total)} leads masuk dengan ${nfmt(summary.totals.closing)} closing (konversi ${summary.conversion.toFixed(1)}%), rata-rata ${summary.averagePerDay.toFixed(1)} leads per hari.`
  );
  if (blocks.length >= 2) {
    const a = blocks[blocks.length - 2];
    const b = blocks[blocks.length - 1];
    const dLeads = b.total - a.total;
    const dClose = b.closing - a.closing;
    out.push(
      `${b.label} dibanding ${a.label}: leads ${dLeads >= 0 ? "naik" : "turun"} ${nfmt(Math.abs(dLeads))}, closing ${dClose >= 0 ? "naik" : "turun"} ${nfmt(Math.abs(dClose))}.`
    );
  }
  out.push(
    "Catatan: bagian ini hanya memuat perbandingan angka dari data yang sama. Belum ada analisis penyebab karena tidak ada data pendukung lain di laporan ini."
  );
  return out;
}

/* ────────────────────────────── halaman 2: tabel harian ────────────────────────────── */

const COL_TANGGAL = 92;
const COL_SOURCE = 52;
const COL_TOTAL = 64;
const COL_CLOSING = 64;

function tableColumns() {
  const tanggal = MARGIN;
  const sources = REPORT_SOURCES.map((_, i) => tanggal + COL_TANGGAL + i * COL_SOURCE);
  const total = tanggal + COL_TANGGAL + REPORT_SOURCES.length * COL_SOURCE;
  const closing = total + COL_TOTAL;
  const closingMeta = closing + COL_CLOSING;
  return { tanggal, sources, total, closing, closingMeta, right: closingMeta + (MARGIN + CW - closingMeta) };
}

function drawTableHeader(ctx: Ctx, h: number) {
  const page = ctx.page;
  const cols = tableColumns();
  rect(page, { x: MARGIN, y: ctx.y - h, w: CW, h, fill: HEAD_BG });
  const right = MARGIN + CW;
  text(page, ctx.bold, "Tanggal", { x: cols.tanggal + 10, y: ctx.y - h + 9, size: S.table, color: INK });
  REPORT_SOURCES.forEach((s, i) => {
    textRight(page, ctx.bold, SOURCE_LABEL[s], { right: cols.sources[i] + COL_SOURCE - 8, y: ctx.y - h + 9, size: S.table, color: INK });
  });
  const two = (l1: string, l2: string, r: number) => {
    textRight(page, ctx.bold, l1, { right: r, y: ctx.y - h + 13, size: S.table, color: INK });
    textRight(page, ctx.bold, l2, { right: r, y: ctx.y - h + 4.5, size: S.table, color: INK });
  };
  two("Total", "leads", cols.total + COL_TOTAL - 8);
  two("Total", "closing", cols.closing + COL_CLOSING - 8);
  two("Closing", "Meta Ads", right - 10);
  ctx.y -= h;
}

function drawTableRow(ctx: Ctx, row: DailyLeadRow, o: { zebra: boolean; rowH: number; total?: boolean }) {
  const page = ctx.page;
  const cols = tableColumns();
  const right = MARGIN + CW;
  const y = ctx.y - o.rowH;
  const baseline = y + (o.rowH - S.table) / 2 + 1;
  const dow = new Date(`${row.tanggal}T00:00:00Z`).getUTCDay();

  if (o.total) {
    rect(page, { x: MARGIN, y, w: CW, h: o.rowH, fill: ZEBRA });
    rule(page, ctx.y, MARGIN, MARGIN + CW, INK, 1);
  } else if (o.zebra) {
    rect(page, { x: MARGIN, y, w: CW, h: o.rowH, fill: ZEBRA });
  }

  const font = o.total ? ctx.bold : ctx.regular;
  const color = o.total ? INK : INK;
  const sourceColor = o.total ? INK : INK;

  if (o.total) {
    text(page, ctx.bold, "Total", { x: cols.tanggal + 10, y: baseline, size: S.table, color: INK });
  } else {
    const day = Number(row.tanggal.slice(8, 10));
    text(page, ctx.regular, `${day} ${MONTHS_ID_SHORT[Number(row.tanggal.slice(5, 7)) - 1]} · ${DAY_SHORT[dow]}`, {
      x: cols.tanggal + 10,
      y: baseline,
      size: S.table,
      color: INK,
    });
  }
  REPORT_SOURCES.forEach((s, i) => {
    textRight(page, font, nfmt(row.perSumber[s] || 0), { right: cols.sources[i] + COL_SOURCE - 8, y: baseline, size: S.table, color: sourceColor });
  });
  textRight(page, font, nfmt(row.total), { right: cols.total + COL_TOTAL - 8, y: baseline, size: S.table, color });
  textRight(page, font, nfmt(row.closing), { right: cols.closing + COL_CLOSING - 8, y: baseline, size: S.table, color });
  textRight(page, font, nfmt(row.closingMetaAds), { right: right - 10, y: baseline, size: S.table, color });

  ctx.y = y;
  if (!o.total) rule(page, ctx.y, MARGIN, MARGIN + CW, "#f1f3f6", 0.5);
}

/* ────────────────────────────── footer ────────────────────────────── */

function drawFooters(doc: PDFDocument, regular: PDFFont) {
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    rule(page, FOOTER_Y + 14, MARGIN, MARGIN + CW, RULE, 0.6);
    page.drawText("SAMAQU Internal · rahasia", { x: MARGIN, y: FOOTER_Y, size: S.small, font: regular, color: hex(FAINT) });
    const t = `Halaman ${i + 1} dari ${pages.length}`;
    page.drawText(t, { x: MARGIN + CW - regular.widthOfTextAtSize(t, S.small), y: FOOTER_Y, size: S.small, font: regular, color: hex(FAINT) });
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
  const blocks = weeklyBlocks(allDaily);

  const fonts = input.fonts ?? loadReportFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // PENTING: subset TIDAK dipakai. Subsetting pdf-lib memutus sebagian glyph Inter
  // (huruf/angka hilang di hasil render), jadi font di-embed utuh — ukuran PDF tetap
  // di bawah 1 MB dan teksnya benar.
  const regular = await doc.embedFont(fonts.regular, { subset: false });
  const bold = await doc.embedFont(fonts.bold, { subset: false });

  /* ═══ Halaman 1 — ringkasan eksekutif ═══ */
  const ctx: Ctx = { doc, regular, bold, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };
  drawMasthead(ctx, summary, generatedAtID(now));

  // Jarak antar bagian dibagi rata supaya halaman tetap seimbang untuk dataset apa pun
  const highlights = highlightLines(summary, allDaily);
  const notes = analysisNote(summary, allDaily);
  const baselineGap = 26;
  const fixedHeight = 20 + S.section + 8 + 76; // KPI
  const sourcesHeight = (summary.sources.length + 2) * 21 + 22;
  const weeklyHeight = (blocks.length + 1) * 20 + 22;
  const highlightsHeight = highlights.length * 15;
  const notesHeight = notes.reduce((t, n) => t + wrap(n, regular, S.body, CW).length * 14, 0);
  const contentHeight =
    S.section + 8 + fixedHeight +
    S.section + 8 + sourcesHeight +
    S.section + 8 + highlightsHeight +
    S.section + 8 + weeklyHeight +
    S.section + 8 + notesHeight;
  const available = ctx.y - (FOOTER_Y + 34);
  const gap = Math.max(18, Math.min(34, (available - contentHeight) / 5));

  ctx.y -= 22;
  sectionTitle(ctx, "Ringkasan KPI");
  drawKpi(ctx, summary);

  ctx.y -= gap;
  sectionTitle(ctx, "Ringkasan sumber leads");
  drawSourceTable(ctx, summary);

  ctx.y -= gap;
  sectionTitle(ctx, "Sorotan periode");
  highlights.forEach((line) => {
    ctx.page.drawCircle({ x: MARGIN + 3, y: ctx.y + 3.5, size: 1.4, color: hex(FAINT) });
    wrap(line, regular, S.body, CW - 16).forEach((l) => {
      text(ctx.page, regular, l, { x: MARGIN + 14, y: ctx.y, size: S.body, color: INK });
      ctx.y -= 15;
    });
  });

  ctx.y -= gap;
  sectionTitle(ctx, "Perbandingan mingguan");
  drawWeeklyTable(ctx, allDaily);

  ctx.y -= gap;
  sectionTitle(ctx, "Catatan analisis");
  notes.forEach((note) => {
    wrap(note, regular, S.body, CW).forEach((l) => {
      text(ctx.page, regular, l, { x: MARGIN, y: ctx.y, size: S.body, color: SUB });
      ctx.y -= 14;
    });
    ctx.y -= 4;
  });

  /* ═══ Halaman 2 — rekap data harian ═══ */
  ctx.page = doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;

  text(ctx.page, bold, "Rekap Data Harian", { x: MARGIN, y: ctx.y, size: 15, color: INK });
  ctx.y -= 16;
  text(ctx.page, regular, `${summary.periodLabel}${summary.running ? " · data berjalan" : ""} · ${summary.dayCount} hari`, {
    x: MARGIN,
    y: ctx.y,
    size: S.small,
    color: SUB,
  });
  ctx.y -= 14;
  rule(ctx.page, ctx.y);
  ctx.y -= 18;

  const headH = 26;
  const footerTop = FOOTER_Y + 34;
  const notesBlock = 46;
  const availRows = ctx.y - headH - footerTop - notesBlock - 30; // 30 = baris total
  const rowH = Math.max(26, Math.min(36, Math.floor(availRows / Math.max(1, rows.length))));

  drawTableHeader(ctx, headH);
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
    const last = i === rows.length - 1;
    const needed = rowH + (last ? rowH + 20 : 0);
    if (ctx.y - needed < footerTop) {
      ctx.page = doc.addPage([PAGE_W, PAGE_H]);
      ctx.y = PAGE_H - MARGIN;
      text(ctx.page, bold, "Rekap Data Harian (lanjutan)", { x: MARGIN, y: ctx.y, size: 12, color: INK });
      ctx.y -= 14;
      drawTableHeader(ctx, headH);
    }
    drawTableRow(ctx, row, { zebra: i % 2 === 1, rowH });
  });

  if (ctx.y - rowH - 20 < footerTop) {
    ctx.page = doc.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
    drawTableHeader(ctx, headH);
  }
  drawTableRow(ctx, totalRow, { zebra: false, rowH, total: true });

  // Catatan definisi & sumber data
  ctx.y -= 16;
  const notesText = [
    "Konversi = Total closing ÷ Total leads pada periode laporan. Closing Meta Ads = leads berstatus closing dengan sumber Meta Ads.",
    "Hari tanpa data tetap ditampilkan dengan angka 0. Sumber data: tabel leads pada dashboard internal SAMAQU (/ops/leads).",
  ];
  notesText.forEach((n) => {
    wrap(n, regular, S.small, CW).forEach((l) => {
      text(ctx.page, regular, l, { x: MARGIN, y: ctx.y, size: S.small, color: FAINT });
      ctx.y -= 11;
    });
  });

  drawFooters(doc, regular);

  const bytes = await doc.save();
  return { bytes, summary: full, rows, pageCount: doc.getPageCount() };
}
