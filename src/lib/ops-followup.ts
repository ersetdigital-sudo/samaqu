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

/** Batas hari bisnis (WIB) dalam ISO UTC. */
export function jakartaDayBounds(now: Date = new Date()): { startIso: string; endIso: string } {
  const wib = new Date(now.getTime() + BIZ_OFFSET_MS);
  const startUtc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - BIZ_OFFSET_MS;
  return { startIso: new Date(startUtc).toISOString(), endIso: new Date(startUtc + 86400000).toISOString() };
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
