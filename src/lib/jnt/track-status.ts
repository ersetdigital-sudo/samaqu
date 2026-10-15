import type { TrackHistoryItem } from "./types";

/**
 * Paket dianggap **sudah diterima** bila J&T mengirim `status_code` 200
 * ("Paket telah diterima" / Delivered).
 *
 * Teksnya tidak boleh dipakai sebagai penanda: `status_code` 100 juga berbunyi
 * "Paket telah diterima oleh <gerai>" saat paket baru diserahkan ke J&T di gerai
 * asal — bukan bukti paket sampai ke penerima. Jadi hanya kode 200 yang dihitung.
 */
export function isDelivered(data: { history?: TrackHistoryItem[] | null } | null | undefined): boolean {
  return !!data?.history?.some((h) => h.status_code === 200);
}

/**
 * Kode tracking J&T yang **bukan** bukti paket bergerak — artefak saat resi dibuat, atau kejadian
 * yang justru berarti paket TIDAK diserahkan ke J&T.
 *
 * `101` = "Manifes": J&T mencatatnya otomatis begitu resi terbit, jadi tidak boleh mengubah status
 * ke "Dikirim". `162`/`163` = resi dibatalkan. `151` = "Pickup Failed" (paket tidak pernah diambil).
 *
 * `150`/`152` ("Paket disimpan di gudang J&T" / onhold) sengaja TIDAK dikecualikan — paketnya sudah
 * bersama J&T, cuma tertahan. `401`/`402` (retur) juga tidak.
 */
export const JNT_NON_SHIPPING_CODES: ReadonlySet<number> = new Set([101, 151, 162, 163]);

/** Kode "Manifes" — resi baru dibuat, bukan pergerakan paket. */
export const JNT_MANIFEST_CODE = 101;

/**
 * Paket dianggap **sudah dikirim** (diserahkan ke J&T / dipindai kurir) bila J&T memuat minimal
 * satu entri riwayat yang BUKAN artefak pembuatan resi (lihat `JNT_NON_SHIPPING_CODES`).
 */
export function isShipped(data: { history?: TrackHistoryItem[] | null } | null | undefined): boolean {
  return !!data?.history?.some((h) => {
    if (!h) return false;
    if (typeof h.status_code === "number" && JNT_NON_SHIPPING_CODES.has(h.status_code)) return false;
    return h.status_code != null || !!h.status || !!h.date_time;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tampilan riwayat — ATURAN: yang berasal dari J&T ditampilkan APA ADANYA.
// Tidak ada parafrase, terjemahan, label pengganti, atau kesimpulan buatan kita.
// ─────────────────────────────────────────────────────────────────────────────

/** Entri riwayat yang boleh tampil sebagian (hanya field yang kita pakai). */
export interface TrackScan {
  status?: string | null;
  status_code?: number | null;
  note?: string | null;
  storeName?: string | null;
  nextSiteName?: string | null;
  city_name?: string | null;
  date_time?: string | null;
  driverName?: string | null;
}

/** Satu baris riwayat siap tampil. Semua teks berasal langsung dari respons J&T. */
export interface TrackingRow {
  /** Teks `status` J&T, persis (mis. "Paket telah sampai di DPK_GATEWAY", "Manifes"). */
  status: string;
  /** `storeName` J&T apa adanya — hanya diisi bila teks status belum memuatnya. */
  location: string;
  /** `note` J&T apa adanya; null bila kosong. */
  note: string | null;
  /** Aksen peringatan (kuning) untuk `status_code` 150. Tanpa teks tambahan. */
  warning: boolean;
  /** `driverName` J&T — hanya dipakai tampilan admin, tidak pernah ke customer. */
  driver: string | null;
  /** `date_time` J&T apa adanya. */
  dateTime: string;
}

export function trackingRow(item: TrackScan | null | undefined): TrackingRow {
  const status = String(item?.status ?? "").trim();
  const rawNote = String(item?.note ?? "").trim();
  // `storeName` ditampilkan apa adanya, dan disembunyikan kalau teks status sudah memuatnya
  // (mis. "Paket telah sampai di DPK_GATEWAY" + storeName "DPK_GATEWAY" → cukup sekali).
  const site = String(item?.storeName ?? "").trim();
  const location = site && !status.toLowerCase().includes(site.toLowerCase()) ? site : "";

  return {
    status,
    location,
    note: rawNote || null,
    warning: Number(item?.status_code) === 150,
    driver: String(item?.driverName ?? "").trim() || null,
    dateTime: item?.date_time ?? "",
  };
}

/** "YYYY-MM-DD HH:mm:ss" (waktu J&T) → Date. Tak terbaca → null. */
export function parseJntTime(value?: string | null): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const withTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}+07:00`;
  const d = new Date(withTz);
  return Number.isNaN(d.getTime()) ? null : d;
}

const WIB_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Waktu pemindaian dalam WIB, mis. "15 Okt 2026, 07:05". */
export function formatTrackingTime(value?: string | null): string {
  const d = parseJntTime(value);
  if (!d) return value ? String(value) : "";
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDate();
  const month = WIB_MONTHS[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mm = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

/**
 * Ringkasan status pengiriman untuk ditampilkan di atas riwayat — tiga nilai saja, semuanya
 * diambil dari event J&T TERBARU (bukan teks buatan kita).
 */
export interface TrackingSummary {
  /** Teks `status` event terbaru, persis dari J&T. */
  status: string;
  /** `note` event terbaru (persis), null bila kosong. */
  note: string | null;
  /** `date_time` event terbaru — mengikuti timestamp dari sumber API. */
  updatedAt: string | null;
}

export function trackingSummary(history: TrackHistoryItem[] | null | undefined): TrackingSummary | null {
  const desc = sortHistoryDesc(history);
  if (desc.length === 0) return null;

  const latest = desc[0];
  return {
    status: String(latest?.status ?? "").trim(),
    note: String(latest?.note ?? "").trim() || null,
    updatedAt: latest?.date_time ?? null,
  };
}

/** Riwayat terbaru di atas — diurut dari `date_time` asli J&T. */
export function sortHistoryDesc(history: TrackHistoryItem[] | null | undefined): TrackHistoryItem[] {
  return [...(history ?? [])].filter(Boolean).sort((a, b) => {
    const ta = parseJntTime(a?.date_time)?.getTime() ?? 0;
    const tb = parseJntTime(b?.date_time)?.getTime() ?? 0;
    return tb - ta;
  });
}

/**
 * Salinan payload tracking dengan data pribadi PENERIMA disembunyikan — dipakai tombol
 * "Lihat data mentah" di admin supaya JSON J&T bisa diperiksa tanpa membocorkan alamat/nama penerima.
 */
export function censorReceiverPII<T>(payload: T): T {
  try {
    const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
    const detail = clone?.detail as Record<string, unknown> | undefined;
    const receiver = detail?.receiver as Record<string, unknown> | undefined;
    if (receiver) {
      if ("name" in receiver) receiver.name = "[DISENSOR]";
      if ("addr" in receiver) receiver.addr = "[DISENSOR]";
      if ("zipcode" in receiver) receiver.zipcode = "[DISENSOR]";
    }
    return clone as T;
  } catch {
    return payload;
  }
}

/** Urutan tahap pengiriman (maju-saja). `null` = belum diatur. */
export const SHIPPING_STATUS_RANK: Record<string, number> = {
  menunggu_pickup: 1,
  dikirim: 2,
  selesai: 3,
};

export function shippingRank(status?: string | null): number {
  return status ? SHIPPING_STATUS_RANK[status] ?? 0 : 0;
}

/** Urutan status pesanan (maju-saja). `dibatalkan` sengaja di luar urutan (terminal). */
export const ORDER_STATUS_RANK: Record<string, number> = {
  pending: 0,
  diproses: 1,
  dikirim: 2,
  selesai: 3,
};

export function orderRank(status?: string | null): number {
  return status ? ORDER_STATUS_RANK[status] ?? 0 : 0;
}
