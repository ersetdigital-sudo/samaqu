/**
 * Laporan Leads & Closing → PDF (A4 portrait, vektor, font ter-embed).
 *
 * Dipakai endpoint `GET /api/ops/leads/report?bulan=YYYY-MM`.
 *
 * Catatan penting soal ANGKA: agregasi di sini (`buildDailyRows` + `buildTotals`) memakai
 * definisi yang sama persis dengan halaman /ops/leads/laporan:
 *   - satu baris per tanggal (hanya tanggal yang ada leads di halaman; di PDF semua tanggal
 *     periode tetap ditampilkan dengan 0 supaya tabelnya utuh),
 *   - `total` = jumlah leads tanggal itu,
 *   - `closing` = leads dengan status "closing",
 *   - `closingMetaAds` = closing dengan sumber "Meta ads",
 *   - `perSumber` dihitung dari kolom `sumber`.
 * Konversi dan rata-rata leads/hari adalah turunan (ditulis definisinya di catatan kaki).
 *
 * Modul ini TIDAK menulis apa pun ke database — hanya membaca data yang sudah diambil route.
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
  /** "2026-10" */
  month: string;
  /** "Oktober 2026" */
  monthLabel: string;
  /** "1 sampai 13 Oktober 2026 (data berjalan)" */
  periodLabel: string;
  /** true kalau bulan berjalan belum lengkap */
  running: boolean;
  /** "2026-10-01" / "2026-10-13" */
  periodStart: string;
  periodEnd: string;
  dayCount: number;
  totals: LeadsTotals;
  /** Persentase dari total (0-100), satu desimal. */
  conversion: number;
  /** Rata-rata leads per hari pada periode laporan. */
  averagePerDay: number;
  /** Sumber terurut dari terbesar. */
  sources: { name: string; count: number; pct: number }[];
  topSource: string;
  /** 3 sorotan faktual. */
  highlights: string[];
  /** Tanggal dengan leads terbanyak (null kalau tidak ada data). */
  peakLeadsDate: string | null;
  peakClosingDate: string | null;
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

/** "2026-10-13T08:40:00Z" → "13 Oktober 2026, 15:40 WIB". */
export function generatedAtID(now: Date): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCDate()} ${MONTHS_ID[wib.getUTCMonth()]} ${wib.getUTCFullYear()}, ${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())} WIB`;
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
  /** Waktu pembuatan (default sekarang) — dipakai untuk label "Dibuat …". */
  now?: Date;
}

/**
 * Ringkasan + metrik turunan. `now` menentukan apakah bulan masih berjalan.
 * Periode: bulan lampau = sebulan penuh; bulan berjalan = 1 sampai hari terakhir yang
 * sudah punya data (atau hari ini kalau belum ada data sama sekali).
 */
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
  const topCount = sources[0]?.count || 0;
  highlights.push(
    topCount > 0
      ? `Sumber terbesar: ${topSource} dengan ${nfmt(topCount)} leads (${sources[0].pct.toFixed(1)}% dari total).`
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

/** Nominal untuk kartu ringkasan: "202" / "-". */
const count = (n: number) => nfmt(n || 0);

/* ────────────────────────────── gaya & tata letak ────────────────────────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 40;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 42;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_Y = 26;

const INK = rgb(0.09, 0.11, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const HAIR = rgb(0.9, 0.92, 0.95);
const CARD_BG = rgb(0.973, 0.98, 0.988);
const BLUE = rgb(0.145, 0.388, 0.921); // #2563eb
const INDIGO = rgb(0.31, 0.275, 0.898); // #4f46e5
const EMERALD = rgb(0.063, 0.725, 0.506); // #10b981
const WHITE = rgb(1, 1, 1);
const ZEBRA = rgb(0.976, 0.98, 0.988);

/** Huruf besar berspasi (tanpa akses fitur OpenType, jadi spasi disisipkan manual). */
const spaced = (s: string) => s.split("").join(" ");

export interface ReportFonts {
  regular: Uint8Array | ArrayBuffer;
  bold: Uint8Array | ArrayBuffer;
}

/** Font ikut dibundel di repo (src/assets/fonts) — dibaca dari filesystem. */
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
  pageIndex: number;
}

function newPage(ctx: Omit<Ctx, "page" | "y"> & { pageIndex: number }): Ctx {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  return { ...ctx, page, y: PAGE_H - MARGIN_TOP };
}

function text(ctx: Ctx, value: string, opts: { x: number; y?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> }) {
  const { x, size = 9, font = ctx.regular, color = INK } = opts;
  const y = opts.y ?? ctx.y;
  ctx.page.drawText(value, { x, y, size, font, color });
}

function textRight(ctx: Ctx, value: string, opts: { right: number; y?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> }) {
  const { right, size = 9, font = ctx.regular, color = INK } = opts;
  const y = opts.y ?? ctx.y;
  const w = font.widthOfTextAtSize(value, size);
  ctx.page.drawText(value, { x: right - w, y, size, font, color });
}

function textCenter(ctx: Ctx, value: string, opts: { center: number; y?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> }) {
  const { center, size = 9, font = ctx.regular, color = INK } = opts;
  const y = opts.y ?? ctx.y;
  const w = font.widthOfTextAtSize(value, size);
  ctx.page.drawText(value, { x: center - w / 2, y, size, font, color });
}

/** Bar biru→indigo (dua blok, blok kedua semi transparan = kesan gradasi). */
function accentBar(ctx: Ctx, y: number, height: number) {
  ctx.page.drawRectangle({ x: MARGIN_X, y, width: CONTENT_W, height, color: BLUE });
  ctx.page.drawRectangle({ x: MARGIN_X + CONTENT_W / 2, y, width: CONTENT_W / 2, height, color: INDIGO, opacity: 0.55 });
}

function hairline(ctx: Ctx, y: number, x = MARGIN_X, width = CONTENT_W) {
  ctx.page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.6, color: HAIR });
}

/* ────────────────────────────── halaman 1 ────────────────────────────── */

function drawHeader(ctx: Ctx, summary: LeadsSummary, generatedAt: string) {
  accentBar(ctx, PAGE_H - MARGIN_TOP + 6, 4);
  ctx.y = PAGE_H - MARGIN_TOP - 6;

  text(ctx, "SAMAQU", { x: MARGIN_X, y: ctx.y, size: 15, font: ctx.bold });
  const wmW = ctx.bold.widthOfTextAtSize("SAMAQU", 15);
  text(ctx, spaced("INTERNAL"), { x: MARGIN_X + wmW + 8, y: ctx.y + 1, size: 6.5, font: ctx.bold, color: MUTED });

  textRight(ctx, `Dibuat ${generatedAt}`, { right: PAGE_X_RIGHT, y: ctx.y, size: 8, color: MUTED });

  ctx.y -= 26;
  text(ctx, "Laporan Leads dan Closing", { x: MARGIN_X, y: ctx.y, size: 20, font: ctx.bold });
  ctx.y -= 16;
  text(ctx, summary.periodLabel, { x: MARGIN_X, y: ctx.y, size: 11, font: ctx.bold, color: BLUE });
  ctx.y -= 14;
  const days = summary.running
    ? `${summary.dayCount} hari berjalan · data per ${tanggalID(summary.periodEnd)}`
    : `${summary.dayCount} hari`;
  text(ctx, `${days} · sumber data: tabel leads dashboard internal`, { x: MARGIN_X, y: ctx.y, size: 8, color: MUTED });
  ctx.y -= 14;
  hairline(ctx, ctx.y);
  ctx.y -= 16;
}

const PAGE_X_RIGHT = MARGIN_X + CONTENT_W;

function drawSummaryCards(ctx: Ctx, summary: LeadsSummary) {
  const cards = [
    { label: "Total Leads", value: count(summary.totals.total), note: `${summary.dayCount} hari periode` },
    { label: "Total Closing", value: count(summary.totals.closing), note: "status closing" },
    { label: "Konversi", value: `${summary.conversion.toFixed(1)}%`, note: "closing / leads" },
    { label: "Closing Meta Ads", value: count(summary.totals.closingMetaAds), note: "dari total closing" },
    { label: "Rata-rata / Hari", value: summary.averagePerDay.toFixed(1), note: "leads per hari" },
  ];
  const gap = 8;
  const cardW = (CONTENT_W - gap * (cards.length - 1)) / cards.length;
  const cardH = 54;
  const top = ctx.y;
  cards.forEach((card, i) => {
    const x = MARGIN_X + i * (cardW + gap);
    ctx.page.drawRectangle({ x, y: top - cardH, width: cardW, height: cardH, color: CARD_BG, borderColor: HAIR, borderWidth: 0.8 });
    text(ctx, spaced(card.label.toUpperCase()), { x: x + 8, y: top - 15, size: 5.8, font: ctx.bold, color: MUTED });
    text(ctx, card.value, { x: x + 8, y: top - 36, size: 17, font: ctx.bold });
    text(ctx, card.note, { x: x + 8, y: top - 48, size: 6.5, color: MUTED });
  });
  ctx.y = top - cardH - 20;
}

function drawTrendChart(ctx: Ctx, summary: LeadsSummary & { dailyRowsInPeriod: DailyLeadRow[] }) {
  const rows = summary.dailyRowsInPeriod;
  const blockH = 168;
  const top = ctx.y;

  text(ctx, spaced("LEADS MASUK VS CLOSING PER TANGGAL"), { x: MARGIN_X, y: top, size: 7.5, font: ctx.bold, color: MUTED });

  const plotTop = top - 18;
  const plotBottom = top - blockH + 24;
  const plotLeft = MARGIN_X + 30;
  const plotRight = PAGE_X_RIGHT;
  const plotW = plotRight - plotLeft;
  const plotH = plotTop - plotBottom;

  const maxLeads = rows.reduce((m, r) => Math.max(m, r.total), 0);
  const maxClosing = rows.reduce((m, r) => Math.max(m, r.closing), 0);
  const axisMax = Math.max(4, maxLeads, maxClosing);
  const niceMax = Math.ceil(axisMax / 4) * 4;

  // grid + label sumbu Y
  for (let i = 0; i <= 4; i++) {
    const value = (niceMax / 4) * i;
    const y = plotBottom + (value / niceMax) * plotH;
    ctx.page.drawLine({ start: { x: plotLeft, y }, end: { x: plotRight, y }, thickness: 0.5, color: HAIR });
    textRight(ctx, String(value), { right: plotLeft - 5, y: y - 3, size: 6.5, color: MUTED });
  }

  const n = Math.max(1, rows.length);
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(slot * 0.68, 22));
  const peak = rows.reduce((best, r) => (r.total > best ? r.total : best), 0);
  const labelStep = Math.max(1, Math.ceil(n / 12));

  rows.forEach((row, i) => {
    const cx = plotLeft + slot * i + slot / 2;
    const h = row.total > 0 ? Math.max((row.total / niceMax) * plotH, 1.2) : 0;
    const x = cx - barW / 2;
    const solid = row.total > 0 && row.total === peak;
    if (h > 0) {
      ctx.page.drawRectangle({
        x,
        y: plotBottom,
        width: barW,
        height: h,
        color: BLUE,
        opacity: solid ? 1 : 0.16,
        borderColor: BLUE,
        borderWidth: solid ? 0 : 0.8,
      });
    }
    if (i % labelStep === 0 || i === n - 1) {
      textCenter(ctx, String(Number(row.tanggal.slice(8, 10))), { center: cx, y: plotBottom - 11, size: 6.5, color: MUTED });
    }
  });

  // garis Closing (vektor)
  const points = rows.map((row, i) => ({
    x: plotLeft + slot * i + slot / 2,
    y: plotBottom + (Math.min(row.closing, niceMax) / niceMax) * plotH,
  }));
  for (let i = 1; i < points.length; i++) {
    ctx.page.drawLine({ start: points[i - 1], end: points[i], thickness: 1.4, color: EMERALD });
  }
  for (const p of points) {
    ctx.page.drawCircle({ x: p.x, y: p.y, size: 1.8, color: EMERALD });
  }
  // sumbu dasar
  ctx.page.drawLine({ start: { x: plotLeft, y: plotBottom }, end: { x: plotRight, y: plotBottom }, thickness: 0.8, color: rgb(0.78, 0.8, 0.84) });

  // legenda
  const legendY = plotBottom - 26;
  ctx.page.drawRectangle({ x: plotLeft, y: legendY, width: 8, height: 8, color: BLUE, opacity: 0.16, borderColor: BLUE, borderWidth: 0.8 });
  text(ctx, "Leads Masuk (batang, batang tertinggi solid)", { x: plotLeft + 12, y: legendY + 1, size: 7, color: MUTED });
  const lg2 = plotLeft + 12 + ctx.regular.widthOfTextAtSize("Leads Masuk (batang, batang tertinggi solid)", 7) + 16;
  ctx.page.drawLine({ start: { x: lg2, y: legendY + 4 }, end: { x: lg2 + 12, y: legendY + 4 }, thickness: 1.4, color: EMERALD });
  ctx.page.drawCircle({ x: lg2 + 6, y: legendY + 4, size: 1.6, color: EMERALD });
  text(ctx, "Closing (garis)", { x: lg2 + 16, y: legendY + 1, size: 7, color: MUTED });

  ctx.y = legendY - 18;
}

function drawSourceBreakdown(ctx: Ctx, summary: LeadsSummary) {
  text(ctx, spaced("RINCIAN SUMBER LEADS"), { x: MARGIN_X, y: ctx.y, size: 7.5, font: ctx.bold, color: MUTED });
  ctx.y -= 14;

  const labelW = 76;
  const valueW = 96;
  const barW = CONTENT_W - labelW - valueW;
  const maxCount = summary.sources.reduce((m, s) => Math.max(m, s.count), 0);

  summary.sources.forEach((s) => {
    const y = ctx.y;
    text(ctx, s.name, { x: MARGIN_X, y, size: 8.5, font: ctx.bold });
    const barX = MARGIN_X + labelW;
    ctx.page.drawRectangle({ x: barX, y: y - 1, width: barW, height: 8, color: rgb(0.94, 0.96, 0.98) });
    const fillW = maxCount > 0 ? Math.max((s.count / maxCount) * (barW - 4), s.count > 0 ? 3 : 0) : 0;
    if (fillW > 0) {
      ctx.page.drawRectangle({ x: barX + 2, y, width: fillW, height: 6, color: INDIGO, opacity: 0.85 });
    }
    textRight(ctx, `${nfmt(s.count)} · ${s.pct.toFixed(1)}%`, { right: PAGE_X_RIGHT, y, size: 8, color: MUTED });
    ctx.y -= 15;
  });

  ctx.y -= 4;
}

function drawHighlights(ctx: Ctx, summary: LeadsSummary) {
  text(ctx, spaced("SOROTAN"), { x: MARGIN_X, y: ctx.y, size: 7.5, font: ctx.bold, color: MUTED });
  ctx.y -= 13;
  summary.highlights.forEach((line) => {
    ctx.page.drawCircle({ x: MARGIN_X + 2.5, y: ctx.y + 3, size: 1.6, color: BLUE });
    const lines = wrapText(line, ctx.regular, 8.5, CONTENT_W - 14);
    lines.forEach((l) => {
      text(ctx, l, { x: MARGIN_X + 12, y: ctx.y, size: 8.5 });
      ctx.y -= 12;
    });
  });
  ctx.y -= 6;
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = String(value).split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

/* ────────────────────────────── tabel harian ────────────────────────────── */

const COL_TANGGAL = 118;
const COL_SOURCE = 52;
const COL_TOTAL = 62;
const COL_CLOSING = 62;
const ROW_H = 15.5;

function tableColumns() {
  const x0 = MARGIN_X;
  const tanggal = x0;
  const sources = REPORT_SOURCES.map((_, i) => x0 + COL_TANGGAL + i * COL_SOURCE);
  const total = x0 + COL_TANGGAL + REPORT_SOURCES.length * COL_SOURCE;
  const closing = total + COL_TOTAL;
  const closingMeta = closing + COL_CLOSING;
  return { tanggal, sources, total, closing, closingMeta, right: PAGE_X_RIGHT };
}

function drawTableHeader(ctx: Ctx) {
  const cols = tableColumns();
  const h = 24;
  const y = ctx.y - h;
  ctx.page.drawRectangle({ x: MARGIN_X, y, width: CONTENT_W, height: h, color: BLUE });
  ctx.page.drawRectangle({ x: MARGIN_X + CONTENT_W / 2, y, width: CONTENT_W / 2, height: h, color: INDIGO, opacity: 0.55 });

  const SIZE = 6.2;
  const center = y + h / 2;
  const bright = rgb(0.78, 0.87, 1);

  // Label dipecah maksimal 2 baris supaya TIDAK pernah saling tumpang tindih antar kolom
  // (label berspasi satu baris terbukti terlalu lebar untuk kolom angka).
  const label = (lines: string[], opts: { left?: number; right?: number }, color = WHITE) => {
    const yFor = (i: number) => (lines.length === 1 ? center - 2.2 : i === 0 ? center + 1.6 : center - 6.2);
    lines.forEach((line, i) => {
      if (opts.left !== undefined) {
        text(ctx, line, { x: opts.left, y: yFor(i), size: SIZE, font: ctx.bold, color });
      } else {
        textRight(ctx, line, { right: opts.right!, y: yFor(i), size: SIZE, font: ctx.bold, color });
      }
    });
  };

  label(["TANGGAL"], { left: cols.tanggal + 8 });
  label(["META ADS"], { right: cols.sources[0] + COL_SOURCE - 6 });
  label(["WA"], { right: cols.sources[1] + COL_SOURCE - 6 });
  label(["IG"], { right: cols.sources[2] + COL_SOURCE - 6 });
  label(["WEBSITE"], { right: cols.sources[3] + COL_SOURCE - 6 });
  label(["TOTAL", "LEADS"], { right: cols.total + COL_TOTAL - 6 }, bright);
  label(["TOTAL", "CLOSING"], { right: cols.closing + COL_CLOSING - 6 }, bright);
  label(["CLOSING", "META ADS"], { right: PAGE_X_RIGHT - 8 }, bright);

  ctx.y = y;
}

function drawTableRow(ctx: Ctx, row: DailyLeadRow, opts: { zebra: boolean; total?: boolean }) {
  const cols = tableColumns();
  const y = ctx.y - ROW_H;
  if (opts.total) {
    ctx.page.drawRectangle({ x: MARGIN_X, y, width: CONTENT_W, height: ROW_H, color: rgb(0.93, 0.95, 1) });
    ctx.page.drawLine({ start: { x: MARGIN_X, y: ctx.y }, end: { x: PAGE_X_RIGHT, y: ctx.y }, thickness: 0.8, color: BLUE });
  } else if (opts.zebra) {
    ctx.page.drawRectangle({ x: MARGIN_X, y, width: CONTENT_W, height: ROW_H, color: ZEBRA });
  }
  const ty = y + 5;
  const font = opts.total ? ctx.bold : ctx.regular;
  if (opts.total) {
    text(ctx, spaced("TOTAL"), { x: cols.tanggal + 8, y: ty, size: 7, font: ctx.bold });
  } else {
    const day = Number(row.tanggal.slice(8, 10));
    const dow = DAY_SHORT[new Date(`${row.tanggal}T00:00:00Z`).getUTCDay()];
    text(ctx, `${day} ${MONTHS_ID_SHORT[Number(row.tanggal.slice(5, 7)) - 1]} · ${dow}`, { x: cols.tanggal + 8, y: ty, size: 7.5 });
  }
  REPORT_SOURCES.forEach((s, i) => {
    textRight(ctx, nfmt(row.perSumber[s] || 0), { right: cols.sources[i] + COL_SOURCE - 6, y: ty, size: 7.5, font, color: opts.total ? INK : MUTED });
  });
  textRight(ctx, nfmt(row.total), { right: cols.total + COL_TOTAL - 6, y: ty, size: 7.5, font, color: BLUE });
  textRight(ctx, nfmt(row.closing), { right: cols.closing + COL_CLOSING - 6, y: ty, size: 7.5, font, color: EMERALD });
  textRight(ctx, nfmt(row.closingMetaAds), { right: PAGE_X_RIGHT - 8, y: ty, size: 7.5, font, color: INDIGO });
  ctx.y = y;
  if (!opts.total) {
    ctx.page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_X_RIGHT, y }, thickness: 0.4, color: rgb(0.95, 0.96, 0.975) });
  }
}

function drawTableNotes(ctx: Ctx) {
  const notes = [
    "Konversi = Total Closing dibagi Total Leads (periode laporan). Closing Meta Ads = leads dengan status closing yang sumbernya Meta ads.",
    "Hari tanpa data tetap ditampilkan dengan angka 0. Sumber: tabel leads pada dashboard internal SAMAQU (/ops/leads).",
  ];
  ctx.y -= 10;
  for (const note of notes) {
    wrapText(note, ctx.regular, 7, CONTENT_W).forEach((line) => {
      text(ctx, line, { x: MARGIN_X, y: ctx.y, size: 7, color: MUTED });
      ctx.y -= 9.5;
    });
  }
}

/* ────────────────────────────── footer tiap halaman ────────────────────────────── */

function drawFooters(doc: PDFDocument, regular: PDFFont) {
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawLine({ start: { x: MARGIN_X, y: FOOTER_Y + 12 }, end: { x: PAGE_X_RIGHT, y: FOOTER_Y + 12 }, thickness: 0.6, color: HAIR });
    page.drawText("SAMAQU Internal, rahasia", { x: MARGIN_X, y: FOOTER_Y, size: 7.5, font: regular, color: MUTED });
    const label = `Halaman ${i + 1} dari ${pages.length}`;
    const w = regular.widthOfTextAtSize(label, 7.5);
    page.drawText(label, { x: PAGE_X_RIGHT - w, y: FOOTER_Y, size: 7.5, font: regular, color: MUTED });
  });
}

/* ────────────────────────────── perakit laporan ────────────────────────────── */

/** Rows lengkap untuk tabel: semua tanggal periode, hari tanpa data = 0. */
export function tableRows(summary: LeadsSummary, dailyRows: DailyLeadRow[]): DailyLeadRow[] {
  const byDate = new Map(dailyRows.map((r) => [r.tanggal, r]));
  const out: DailyLeadRow[] = [];
  for (let day = 1; day <= summary.dayCount; day++) {
    const iso = `${summary.month}-${pad(day)}`;
    out.push(
      byDate.get(iso) || { tanggal: iso, perSumber: {}, perSumberClosing: {}, total: 0, closing: 0, closingMetaAds: 0 }
    );
  }
  return out;
}

export interface BuiltLeadsReport {
  bytes: Uint8Array;
  summary: LeadsSummary & { dailyRowsInPeriod: DailyLeadRow[] };
  /** Baris tabel seperti yang benar-benar digambar (termasuk hari 0). */
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

  const fonts = input.fonts ?? loadReportFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold, { subset: true });

  const ctx = newPage({ doc, regular, bold, pageIndex: 0 });
  const generatedAt = generatedAtID(now);

  drawHeader(ctx, summary, generatedAt);
  drawSummaryCards(ctx, summary);
  drawTrendChart(ctx, full);
  drawSourceBreakdown(ctx, summary);
  drawHighlights(ctx, summary);

  // Tabel harian mulai halaman baru; header tabel diulang tiap halaman.
  ctx.page = doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN_TOP;
  text(ctx, "Data Rekap Leads Closing Harian", { x: MARGIN_X, y: ctx.y, size: 12, font: bold });
  ctx.y -= 13;
  text(ctx, `${summary.periodLabel} · ${summary.dayCount} hari`, { x: MARGIN_X, y: ctx.y, size: 8, color: MUTED });
  ctx.y -= 14;

  drawTableHeader(ctx);
  const totals = summary.totals;
  const totalRow: DailyLeadRow = { tanggal: summary.periodEnd, perSumber: totals.perSumber, perSumberClosing: {}, total: totals.total, closing: totals.closing, closingMetaAds: totals.closingMetaAds };

  rows.forEach((row, i) => {
    const needed = ROW_H + (i === rows.length - 1 ? ROW_H + 34 : 0);
    if (ctx.y - needed < MARGIN_BOTTOM) {
      ctx.page = doc.addPage([PAGE_W, PAGE_H]);
      ctx.y = PAGE_H - MARGIN_TOP;
      text(ctx, "Data Rekap Leads Closing Harian (lanjutan)", { x: MARGIN_X, y: ctx.y, size: 10, font: bold });
      ctx.y -= 12;
      drawTableHeader(ctx);
    }
    drawTableRow(ctx, row, { zebra: i % 2 === 1 });
  });

  if (ctx.y - ROW_H - 40 < MARGIN_BOTTOM) {
    ctx.page = doc.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN_TOP;
    drawTableHeader(ctx);
  }
  drawTableRow(ctx, totalRow, { zebra: false, total: true });
  drawTableNotes(ctx);

  drawFooters(doc, regular);

  const bytes = await doc.save();
  return { bytes, summary: full, rows, pageCount: doc.getPageCount() };
}
