/**
 * Rentang periode untuk portal Affiliate (client-side).
 * Mengikuti gaya mockup: 7 hari, 30 hari, bulan ini, bulan lalu, rentang khusus.
 */

export type PeriodKey = "7" | "30" | "90" | "tm" | "lm";

export interface DateRange {
  from: Date;
  to: Date;
}

export const PERIOD_OPTIONS: [string, string][] = [
  ["7", "7 Hari Terakhir"],
  ["30", "30 Hari Terakhir"],
  ["tm", "Bulan Ini"],
  ["lm", "Bulan Lalu"],
  ["90", "90 Hari Terakhir"],
];

export function rangeFor(key: string, now = new Date()): DateRange {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  if (key === "tm") {
    from.setDate(1);
  } else if (key === "lm") {
    from.setDate(1);
    from.setMonth(from.getMonth() - 1);
    to.setDate(0);
    to.setHours(23, 59, 59, 999);
  } else {
    const days = Number(key) || 30;
    from.setDate(from.getDate() - (days - 1));
  }

  return { from, to };
}

export function prevRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - span);
  return { from, to };
}

export function inRange(value: string | Date, range: DateRange): boolean {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d >= range.from && d <= range.to;
}

export function dayKey(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function periodLabel(key: string, range: DateRange): string {
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const fmt = (d: Date) => `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  if (key === "tm") return "Bulan Ini";
  if (key === "lm") return "Bulan Lalu";
  if (key === "7") return "7 Hari Terakhir";
  if (key === "90") return "90 Hari Terakhir";
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}
