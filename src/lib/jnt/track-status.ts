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
 * jelas bukan "dikirim". (163 dulu belum dikecualikan, jadi AWB yang dibatalkan J&T sempat bikin
 * pesanan tampak "Dikirim".)
 *
 * `151` = "Pickup Failed": paket tidak pernah diambil J&T, jadi belum "dikirim".
 *
 * `150`/`152` ("Paket disimpan di gudang J&T" / onhold) sengaja TIDAK dikecualikan — paketnya
 * sudah bersama J&T, cuma tertahan, jadi tetap dianggap masuk proses kirim. `401`/`402` (retur)
 * juga tidak: paket memang sudah dikirim, cuma arahnya balik.
 */
export const JNT_NON_SHIPPING_CODES: ReadonlySet<number> = new Set([101, 151, 162, 163]);

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

/**
 * Label tampilan untuk satu entri riwayat J&T — SATU sumber, dipakai bareng admin (drawer
 * pesanan) dan customer (detail pesanan + halaman lacak) supaya kalimatnya konsisten.
 *
 * Track API J&T mengirim teks mentah yang sebagian menyesatkan (mis. "Paket telah diterima oleh
 * <gerai>" = paket dipungut J&T di gerai, BUKAN diterima penerima). Pemetaannya karena itu
 * memakai **teks** resmi dari tabel Status Code dokumen "J&T API Platform", BUKAN `status_code`:
 * satu kode dipakai untuk beberapa status berbeda (kode 100 mencakup "diterima gerai", "dikirim
 * ke gerai", "sampai di gerai", sampai "sedang diantar ke alamat penerima") — memetakan per kode
 * akan salah untuk sebagian entri. Teks yang tak dikenal tampil apa adanya tanpa ditebak.
 */
const TRACK_STATUS_TEXT_LABEL: { prefix: string; label: string }[] = [
  { prefix: "Paket telah diterima oleh", label: "Paket diserahkan ke J&T (drop point)" },
  { prefix: "Paket telah diterima", label: "Paket diterima penerima" },
  { prefix: "Paket akan dikirimkan ke", label: "Dikirim ke gerai berikutnya" },
  { prefix: "Paket telah sampai di", label: "Sampai di gerai transit" },
  { prefix: "Paket akan dikirim ke alamat penerima", label: "Sedang diantar ke alamat penerima" },
  { prefix: "Manifes", label: "Resi dibuat (manifes)" },
  { prefix: "Cancelled AWB by Seller", label: "Resi dibatalkan (oleh penjual)" },
  { prefix: "Cancelled AWB", label: "Resi dibatalkan (oleh J&T)" },
  { prefix: "Paket disimpan di gudang J&T", label: "Ditahan di gudang J&T" },
  { prefix: "Pickup Failed", label: "Gagal pickup" },
  { prefix: "Paket akan diretur", label: "Paket akan diretur ke pengirim" },
  { prefix: "Package returned to seller", label: "Paket dikembalikan ke pengirim" },
];

/** Teks entri riwayat untuk ditampilkan (fallback ke teks J&T mentah, lalu teks umum). */
export function trackingLabel(item: { status?: string | null; status_code?: number | null } | null | undefined): string {
  const text = item?.status?.trim() ?? "";
  // 200 = "Paket telah diterima" (delivered) — dibedakan dari "Paket telah diterima oleh <gerai>"
  // (kode 100) yang berarti paket baru diserahkan ke J&T.
  if (Number(item?.status_code) === 200) return "Paket diterima penerima";
  if (!text) return "Update pengiriman";
  const hit = TRACK_STATUS_TEXT_LABEL.find((e) => text.startsWith(e.prefix));
  return hit ? hit.label : text;
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
