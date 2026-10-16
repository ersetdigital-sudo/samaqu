/**
 * Aturan bisnis Follow-up Center (dipakai bersama oleh server & UI).
 *
 * Zona waktu bisnis: WIB (UTC+7). Perhitungan "hari ini" selalu dilakukan di server
 * supaya tidak bergantung zona waktu browser.
 */

export const BIZ_TIMEZONE = "Asia/Jakarta";
export const BIZ_OFFSET_MS = 7 * 60 * 60 * 1000;

export type FollowupStatus = "baru" | "dijadwalkan" | "selesai" | "lost" | "dnd";
export type TaskState = "terlambat" | "hari_ini" | "mendatang" | "nonaktif";

export const OUTCOMES = [
  { code: "no_reply", label: "Belum ada balasan", tone: "warning" },
  { code: "replied", label: "Pelanggan membalas", tone: "info" },
  { code: "interested", label: "Masih tertarik, perlu follow-up", tone: "info" },
  { code: "buy", label: "Ingin membeli", tone: "success" },
  { code: "not_interested", label: "Tidak berminat", tone: "danger" },
  { code: "stop", label: "Meminta tidak dihubungi lagi", tone: "muted" },
] as const;

export const LOST_REASONS = [
  "Harga tidak sesuai",
  "Tidak membutuhkan produk",
  "Memilih produk lain",
  "Waktu pembelian belum tepat",
  "Alasan lainnya",
] as const;

export const STATUS_LABEL: Record<FollowupStatus, string> = {
  baru: "Baru",
  dijadwalkan: "Dijadwalkan",
  selesai: "Selesai",
  lost: "Closed / Lost",
  dnd: "Jangan dihubungi",
};

/**
 * Normalisasi nomor WhatsApp ke format internasional (Indonesia).
 * Mengembalikan digits (mis. 6281234567890) atau null kalau bukan nomor valid.
 * Username IG / kontak non-nomor akan ditolak supaya tombol WA tidak membuka link salah.
 */
export function normalizeWaNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase().replace(/^[=@"'\s]+|[@"'\s]+$/g, "");
  if (!s) return null;
  if (/[a-z]/.test(s)) return null;
  let d = s.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "62" + d.replace(/^0+/, "");
  else if (d.startsWith("8")) d = "62" + d;
  else if (!d.startsWith("62")) return null; // bukan format Indonesia — jangan asal tebak
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

export function waLink(raw?: string | null): string | null {
  const n = normalizeWaNumber(raw);
  return n ? `https://wa.me/${n}` : null;
}

/**
 * Normalisasi kontak lead untuk deteksi duplikat (dipakai server & UI Paste Import).
 * HP → digit tanpa awalan 0/62 (08xx = 628xx = 8xx), username → lowercase tanpa @.
 */
export function normalizeKontak(raw?: string | null): string {
  const s = String(raw || "").trim().toLowerCase().replace(/^[=@"'\s]+|[@"'\s]+$/g, "");
  if (!s) return "";
  if (/[a-z]/.test(s.replace(/^@/, ""))) return s.replace(/^@+/, "");
  const digits = s.replace(/\D/g, "");
  const n = digits.replace(/^0+/, "");
  if (n.startsWith("62") && n[2] === "8") return n.slice(2);
  return n || digits;
}

/** Batas hari bisnis (WIB) dalam ISO UTC. */
export function jakartaDayBounds(now: Date = new Date()): { startIso: string; endIso: string } {
  const wib = new Date(now.getTime() + BIZ_OFFSET_MS);
  const startUtc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - BIZ_OFFSET_MS;
  return { startIso: new Date(startUtc).toISOString(), endIso: new Date(startUtc + 86400000).toISOString() };
}

/**
 * Jadwal follow-up pertama untuk lead baru.
 * SOP Samaqu: besok 10.00 WIB supaya setiap lead yang baru masuk langsung
 * punya jadwal sendiri (tidak menggantung di antrean).
 */
export function defaultFirstFollowup(now: Date = new Date(), daysAhead = 1, hourWib = 10): string {
  const wib = new Date(now.getTime() + BIZ_OFFSET_MS);
  const utc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + daysAhead, hourWib - 7, 0, 0);
  return new Date(utc).toISOString();
}

/** Nilai untuk <input type="datetime-local"> (waktu WIB) dari ISO UTC. */
export function isoToWibInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const wib = new Date(d.getTime() + BIZ_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}T${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}`;
}

/** Ubah nilai <input type="datetime-local"> (dianggap WIB) jadi ISO UTC. */
export function wibInputToIso(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Hasil yang menutup follow-up: lead seperti ini tidak boleh jadi tugas aktif lagi. */
export const TERMINAL_OUTCOMES = ["buy", "not_interested", "stop"] as const;

export function hasTerminalOutcome(lead: { outcome?: string | null }): boolean {
  return (TERMINAL_OUTCOMES as readonly string[]).includes((lead.outcome || "").trim());
}

/** State tugas dari jadwal + status lead. */
export function taskState(
  lead: { next_followup_at?: string | null; followup_status?: string | null; do_not_contact?: boolean | null; outcome?: string | null },
  now: Date = new Date(),
): TaskState {
  if (lead.do_not_contact) return "nonaktif";
  const status = (lead.followup_status || "baru") as FollowupStatus;
  if (status === "lost" || status === "dnd" || status === "selesai") return "nonaktif";
  if (hasTerminalOutcome(lead)) return "nonaktif";
  if (!lead.next_followup_at) return "nonaktif";
  const { startIso } = jakartaDayBounds(now);
  const start = new Date(startIso).getTime();
  const t = new Date(lead.next_followup_at).getTime();
  if (t < start) return "terlambat";
  if (t < start + 86400000) return "hari_ini";
  return "mendatang";
}

export function isActiveTask(lead: {
  followup_status?: string | null;
  do_not_contact?: boolean | null;
  outcome?: string | null;
}) {
  return (
    !lead.do_not_contact &&
    (lead.followup_status === "baru" || lead.followup_status === "dijadwalkan") &&
    !hasTerminalOutcome(lead)
  );
}

/** Aktif tapi belum punya jadwal → masuk antrean "Perlu Dijadwalkan". */
export function isUnscheduled(lead: {
  followup_status?: string | null;
  do_not_contact?: boolean | null;
  outcome?: string | null;
  next_followup_at?: string | null;
}) {
  return isActiveTask(lead) && !lead.next_followup_at;
}

const WIB_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: BIZ_TIMEZONE,
  day: "numeric",
  month: "short",
});
const WIB_TIME_FMT = new Intl.DateTimeFormat("id-ID", {
  timeZone: BIZ_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function fmtWibDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return WIB_FMT.format(d);
}

export function fmtWibDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${WIB_FMT.format(d)}, ${WIB_TIME_FMT.format(d).replace(":", ".")}`;
}

export const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Batas awal/akhir bulan (WIB) untuk parameter `YYYY-MM`.
 * Parameter tidak valid → diabaikan dan dipakai bulan WIB sekarang.
 *
 * SATU implementasi, dipakai bersama oleh `/api/ops/dashboard` dan tool asisten AI admin —
 * jangan disalin ulang supaya definisi "bulan ini" tidak pernah berbeda antar layar.
 */
export function jakartaMonthBounds(monthParam?: string | null, now: Date = new Date()) {
  const wib = new Date(now.getTime() + BIZ_OFFSET_MS);
  let year = wib.getUTCFullYear();
  let monthIdx = wib.getUTCMonth(); // 0-11

  const m = /^(\d{4})-(\d{2})$/.exec(String(monthParam || "").trim());
  if (m) {
    const y = Number(m[1]);
    const mi = Number(m[2]) - 1;
    if (Number.isFinite(y) && y >= 2000 && y <= 2100 && mi >= 0 && mi <= 11) {
      year = y;
      monthIdx = mi;
    }
  }

  const startMs = Date.UTC(year, monthIdx, 1) - BIZ_OFFSET_MS;
  const endMs = Date.UTC(year, monthIdx + 1, 1) - BIZ_OFFSET_MS;
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const value = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;

  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    label: `${BULAN_ID[monthIdx]} ${year}`,
    value,
    daysInMonth,
  };
}

/** "2026-10-01" → "Kamis, 1 Oktober 2026" (format Hari, Tanggal Bulan Tahun). */
export function formatTanggalId(value?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!m) return String(value || "-");
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hari = HARI_ID[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${hari}, ${day} ${BULAN_ID[month - 1] || m[2]} ${year}`;
}
