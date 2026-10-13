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
 * Kode tracking J&T yang **bukan** bukti paket bergerak — artefak saat resi dibuat.
 *
 * `101` = "Manifes": J&T mencatatnya otomatis begitu resi terbit. Terbukti saat uji produksi
 * (2026-10-13): resi baru dibuat langsung punya satu entri "Manifes" di detik yang sama —
 * jadi kode ini TIDAK boleh mengubah status ke "Dikirim" (kalau tidak, resi terbit = langsung
 * tampak dikirim, persis bug yang diperbaiki).
 *
 * `162` = "Cancelled AWB by Seller": muncul setelah resi di-void — jelas bukan "dikirim".
 *
 * Tambahkan kode lain di sini kalau nanti terbukti juga artefak (bukan pemindaian nyata).
 */
export const JNT_NON_SHIPPING_CODES: ReadonlySet<number> = new Set([101, 162]);

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
