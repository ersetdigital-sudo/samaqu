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
 * Paket dianggap **sudah dikirim** (sudah diserahkan ke J&T / mengalami pemindaian pertama)
 * bila J&T sudah memuat minimal satu entri riwayat.
 *
 * Kita TIDAK menafsirkan arti kode yang tak dikenal — cukup tahu J&T sudah memindai paket
 * (lihat catatan di `isDelivered` soal kode 100). Selama riwayat masih kosong, status tetap
 * "Menunggu Pickup"; respons tanpa kode/isi hanya disimpan mentah untuk pemeriksaan.
 */
export function isShipped(data: { history?: TrackHistoryItem[] | null } | null | undefined): boolean {
  return !!data?.history?.some((h) => h && (h.status_code != null || !!h.status || !!h.date_time));
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
