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
 * Sumber: tabel **Status Code** di dokumen resmi "J&T API Platform" (Tracking API).
 *
 * `101` = "Manifes": J&T mencatatnya otomatis begitu resi terbit. Terbukti saat uji produksi
 * (2026-10-13): resi baru dibuat langsung punya satu entri "Manifes" di detik yang sama — jadi
 * kode ini TIDAK boleh mengubah status ke "Dikirim" (kalau tidak, resi terbit = langsung tampak
 * dikirim, persis bug yang diperbaiki).
 *
 * `162` = "Cancelled AWB by Seller" dan `163` = "Cancelled AWB" (dibatalkan J&T): resi mati —
 * jelas bukan "dikirim".
 *
 * `151` = "Pickup Failed": paket tidak pernah diambil J&T, jadi belum "dikirim".
 *
 * `150`/`152` ("Paket disimpan di gudang J&T" / onhold) sengaja TIDAK dikecualikan — paketnya
 * sudah bersama J&T, cuma tertahan, jadi tetap dianggap masuk proses kirim. `401`/`402` (retur)
 * juga tidak: paket memang sudah dikirim, cuma arahnya balik.
 */
export const JNT_NON_SHIPPING_CODES: ReadonlySet<number> = new Set([101, 151, 162, 163]);

/** Kode "Manifes" — resi baru dibuat, bukan pergerakan paket. */
export const JNT_MANIFEST_CODE = 101;

/** Kode "Sedang Tertunda" (paket ditahan/onhold di jaringan J&T). */
export const JNT_PENDING_CODES: ReadonlySet<number> = new Set([150, 152]);

/** Kode retur (paket dikembalikan ke pengirim). */
export const JNT_RETURN_CODES: ReadonlySet<number> = new Set([401, 402]);

/** Entri riwayat yang boleh tampil sebagian (hanya field yang kita pakai). */
export interface TrackScan {
  status?: string | null;
  status_code?: number | null;
  note?: string | null;
  storeName?: string | null;
  nextSiteName?: string | null;
  city_name?: string | null;
  date_time?: string | null;
}

/** Entri "Manifes" (resi baru dibuat). */
export function isManifestScan(item: TrackScan | null | undefined): boolean {
  return Number(item?.status_code) === JNT_MANIFEST_CODE;
}

/**
 * Paket sedang **tertunda** menurut J&T (status VIP "Sedang Tertunda"). Dikenali dari
 * `status_code` 150/152, atau teks statusnya ("Paket disimpan di gudang J&T" dsb).
 */
export function isPendingScan(item: TrackScan | null | undefined): boolean {
  if (!item) return false;
  if (JNT_PENDING_CODES.has(Number(item.status_code))) return true;
  const text = (item.status ?? "").toLowerCase();
  return (
    text.includes("disimpan di gudang") ||
    text.includes("tertunda") ||
    text.includes("on hold") ||
    text.includes("onhold")
  );
}

/** Paket dibatalkan (resi mati). */
export function isCancelledScan(item: TrackScan | null | undefined): boolean {
  const text = (item?.status ?? "").toLowerCase();
  return text.includes("cancelled awb") || text.includes("dibatalkan");
}

/** Paket diretur ke pengirim. */
export function isReturnScan(item: TrackScan | null | undefined): boolean {
  if (item && JNT_RETURN_CODES.has(Number(item.status_code))) return true;
  const text = (item?.status ?? "").toLowerCase();
  return text.includes("diretur") || text.includes("returned to seller");
}

/**
 * Bersihkan catatan internal J&T sebelum ditampilkan ke customer: buang token kode internal
 * (mis. "TLC") supaya customer tidak melihat istilah teknis. Teks asli tetap utuh di sisi admin.
 */
export function customerSafeNote(note: string | null | undefined): string {
  return String(note || "")
    .replace(/\b[A-Z]{2,6}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.–-]+/, "")
    .trim();
}

export type TrackingAudience = "customer" | "admin";

/** Satu baris riwayat siap tampil — dipakai bersama admin & customer (markup-nya beda). */
export interface TrackingRow {
  /** Teks status ASLI dari J&T, apa adanya (tanpa label karangan). */
  raw: string;
  /** Judul yang ditampilkan (teks J&T; khusus customer, status tertunda jadi "Tertunda"). */
  title: string;
  /** Nama gerai/jaringan J&T sebenarnya (`storeName`) — lokasi tidak dihilangkan. */
  location: string;
  /** Alasan/catatan (`note`) — asli untuk admin, sudah disaring untuk customer. */
  note: string | null;
  pending: boolean;
  manifest: boolean;
  cancelled: boolean;
  dateTime: string;
}

export function trackingRow(item: TrackScan | null | undefined, audience: TrackingAudience): TrackingRow {
  const raw = (item?.status ?? "").trim();
  const pending = isPendingScan(item);
  const manifest = isManifestScan(item);
  const cancelled = isCancelledScan(item);
  const location = (item?.storeName || item?.city_name || "").trim();
  const rawNote = String(item?.note ?? "").trim();
  const note = rawNote ? (audience === "admin" ? rawNote : customerSafeNote(rawNote) || null) : null;

  let title = raw || "Update pengiriman";
  if (manifest) title = "Resi dibuat (manifes)";
  else if (pending && audience === "customer") title = "Tertunda";

  return {
    raw,
    title,
    location,
    note,
    pending,
    manifest,
    cancelled,
    dateTime: item?.date_time ?? "",
  };
}

/** "YYYY-MM-DD HH:mm:ss" (waktu J&T, WIB) → Date. Tak terbaca → null. */
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

/** Durasi perjalanan seperti VIP J&T, mis. "0 hari 10,9 jam". */
export function formatTrackingDuration(ms: number): string {
  const totalHours = ms / 3_600_000;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours - days * 24;
  const h = hours.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  return `${days} hari ${h} jam`;
}

/** Riwayat terbaru di atas — diurut dari `date_time` asli J&T (bukan urutan array). */
export function sortHistoryDesc(history: TrackHistoryItem[] | null | undefined): TrackHistoryItem[] {
  return [...(history ?? [])].sort((a, b) => {
    const ta = parseJntTime(a?.date_time)?.getTime() ?? 0;
    const tb = parseJntTime(b?.date_time)?.getTime() ?? 0;
    return tb - ta;
  });
}

export type TrackingSummaryKey = "created" | "in_transit" | "pending" | "delivered" | "returned" | "cancelled";

export interface TrackingSummary {
  key: TrackingSummaryKey;
  label: string;
  /** Waktu pemindaian terbaru (asli J&T). */
  updatedAt: string | null;
  /** Total waktu perjalanan (pemindaian nyata pertama → terbaru); null kalau belum cukup data. */
  elapsedMs: number | null;
  elapsedLabel: string | null;
}

const SUMMARY_LABEL: Record<TrackingSummaryKey, string> = {
  created: "Menunggu Pickup",
  in_transit: "Dalam Pengiriman",
  pending: "Tertunda",
  delivered: "Terkirim",
  returned: "Dikembalikan ke Pengirim",
  cancelled: "Dibatalkan",
};

/** Warna penanda ringkasan status — dipakai chip di UI customer maupun admin. Tertunda = kuning. */
export const TRACK_SUMMARY_TONE: Record<TrackingSummaryKey, { bg: string; color: string; border: string }> = {
  created: { bg: "#fff7ed", color: "#c2410c", border: "#ffedd5" },
  in_transit: { bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe" },
  pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  delivered: { bg: "#ecfdf5", color: "#047857", border: "#d1fae5" },
  returned: { bg: "#f5f3ff", color: "#6d28d9", border: "#ede9fe" },
  cancelled: { bg: "#f4f4f5", color: "#52525b", border: "#e4e4e7" },
};

/**
 * Ringkasan status terkini dari riwayat J&T (dipakai blok ringkasan di atas timeline).
 * Kategori mengikuti pengelompokan VIP J&T: Menunggu Pickup → Dalam Pengiriman → (Tertunda) → Terkirim.
 */
export function trackingSummary(history: TrackHistoryItem[] | null | undefined): TrackingSummary | null {
  const all = [...(history ?? [])].filter(Boolean);
  if (all.length === 0) return null;

  const ordered = sortHistoryDesc(all);
  const latest = ordered[0];
  // Entri nyata = bukan artefak "Manifes" (dipakai untuk kategori & total waktu, sama seperti VIP J&T).
  const real = ordered.filter((h) => !isManifestScan(h));

  let key: TrackingSummaryKey;
  if (real.length === 0) key = "created";
  else {
    const newest = real[0];
    if (isDelivered({ history: [newest] })) key = "delivered";
    else if (isCancelledScan(newest)) key = "cancelled";
    else if (isReturnScan(newest)) key = "returned";
    else if (isPendingScan(newest)) key = "pending";
    else key = "in_transit";
  }

  let elapsedMs: number | null = null;
  if (real.length >= 2) {
    const newest = parseJntTime(real[0]?.date_time)?.getTime();
    const oldest = parseJntTime(real[real.length - 1]?.date_time)?.getTime();
    if (typeof newest === "number" && typeof oldest === "number" && newest > oldest) {
      elapsedMs = newest - oldest;
    }
  }

  return {
    key,
    label: SUMMARY_LABEL[key],
    updatedAt: latest?.date_time ?? null,
    elapsedMs,
    elapsedLabel: elapsedMs != null ? formatTrackingDuration(elapsedMs) : null,
  };
}

/**
 * Paket dianggap **sudah dikirim** (diserahkan ke J&T / dipindai kurir) bila J&T memuat minimal
 * satu entri riwayat yang BUKAN artefak pembuatan resi (lihat `JNT_NON_SHIPPING_CODES`).
 *
 * Kita tidak menafsirkan arti kode yang tak dikenal — cukup tahu J&T sudah memindai paket
 * setelah manifest. Kalau riwayat kosong atau cuma berisi manifest, status tetap "Menunggu Pickup".
 */
export function isShipped(data: { history?: TrackHistoryItem[] | null } | null | undefined): boolean {
  return !!data?.history?.some((h) => {
    if (!h) return false;
    if (typeof h.status_code === "number" && JNT_NON_SHIPPING_CODES.has(h.status_code)) return false;
    return h.status_code != null || !!h.status || !!h.date_time;
  });
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
