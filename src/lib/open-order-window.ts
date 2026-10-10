/**
 * Jendela Open Order: tanggal mulai + tanggal tutup dan daftar series yang dibuka.
 *
 * Semuanya diatur dari menu admin "Open Order" dan disimpan di `store_settings`:
 * `open_order_start_date` + `open_order_end_date` (DATE) dan `open_order_series` (JSONB array).
 *
 * Tanggal dibandingkan sebagai teks "YYYY-MM-DD" (tanggal lokal), bukan objek Date, supaya
 * tidak bergeser gara-gara zona waktu. Dipakai halaman admin *dan* halaman publik /open-order,
 * jadi aturan buka/tutupnya cuma ada di satu tempat ini.
 */

export type OpenOrderState = "open" | "before" | "closed";

/** Subset `store_settings` yang mengatur jendela Open Order. */
export interface OpenOrderWindow {
  open_order_start_date?: string | null;
  open_order_end_date?: string | null;
  /** Toggle lama — dipakai sebagai fallback selama tanggalnya belum diisi. */
  open_order_active?: boolean | null;
  open_order_series?: unknown;
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Tanggal hari ini (lokal) sebagai "YYYY-MM-DD" — format yang sama dengan kolom DATE. */
export function todayIso(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "2026-08-08" → "8 Agustus 2026". Kosong/ngawur → "". */
export function formatDateLabel(iso?: string | null): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? "").trim());
  if (!match) return "";
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return "";
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/**
 * Teks periode untuk halaman /open-order, mis. "8 Agustus 2026 – 15 Agustus 2026".
 * Kalau tanggalnya belum diisi → `fallback` (nilai lama `OPEN_ORDER_PERIOD`).
 */
export function formatOpenOrderPeriod(window: OpenOrderWindow, fallback: string): string {
  const start = formatDateLabel(window.open_order_start_date);
  const end = formatDateLabel(window.open_order_end_date);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Mulai ${start}`;
  if (end) return `Sampai ${end}`;
  return fallback;
}

/**
 * Status Open Order dari tanggalnya:
 * - `before` — hari ini masih sebelum tanggal mulai,
 * - `open`   — hari ini di dalam rentang (atau rentangnya belum diatur sama sekali),
 * - `closed` — hari ini sudah lewat tanggal tutup.
 */
export function resolveOpenOrderState(window: OpenOrderWindow, today = todayIso()): OpenOrderState {
  const start = (window.open_order_start_date ?? "").trim();
  const end = (window.open_order_end_date ?? "").trim();
  if (start && today < start) return "before";
  if (end && today > end) return "closed";
  if (start || end) return "open";
  // Tanggalnya belum diatur → ikut toggle lama supaya perilaku sebelumnya tetap jalan.
  return window.open_order_active === false ? "closed" : "open";
}

/**
 * Daftar series yang dibuka dari kolom `open_order_series`. Kolomnya JSONB (array), tapi
 * nilai string JSON juga diterima supaya aman kalau diisi manual. Array kosong = semua series.
 */
export function openOrderSeriesList(value: unknown): string[] {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
}
