/**
 * Rate limiting sederhana (in-memory, sliding window) untuk asisten AI admin.
 *
 * Kenapa in-memory: asisten admin dipakai beberapa orang saja dan tujuannya meredam
 * pemakaian berlebihan/ketidaksengajaan (bukan proteksi anti-DDoS). Kalau nanti di-deploy
 * multi-instance, ganti penyimpanannya (tabel `ai_usage` atau Redis) — API fungsinya tetap.
 *
 * Catatan: limiter ini SENGAJA tidak dipasang di `/api/chat` (customer) supaya perilaku
 * live chat publik tidak berubah pada tahap ini.
 *
 * Server-only.
 */

interface Bucket {
  /** Timestamp (ms) setiap permintaan yang masih di dalam jendela. */
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** Bersihkan bucket kosong supaya peta tidak tumbuh tanpa batas. */
function sweep(now: number, windowMs: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (!bucket.hits.length) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Sisa kuota setelah permintaan ini. */
  remaining: number;
  /** Detik sampai kuota tersedia lagi (0 kalau masih boleh). */
  retryAfterSec: number;
}

/**
 * Hitung permintaan `key` dalam `windowMs` terakhir.
 * `limit` = jumlah maksimum permintaan per jendela.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key) || { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterSec };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.max(0, limit - bucket.hits.length), retryAfterSec: 0 };
}

/** Buang semua catatan (dipakai pengujian). */
export function resetRateLimits() {
  buckets.clear();
}
