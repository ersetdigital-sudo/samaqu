import { NextRequest, NextResponse } from "next/server";
import { trackShipment } from "@/lib/jnt/track";
import { getJntConfig } from "@/lib/jnt/config";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { storeTrackingEvents } from "@/lib/jnt/tracking-sync";
import type { TrackHistoryItem, TrackResponse } from "@/lib/jnt/types";

/**
 * Pelacakan J&T untuk halaman customer.
 *
 * - **Cache pendek (5 menit)** di memori server: halaman yang dibuka berulang tidak membanjiri
 *   API J&T. Tombol "Perbarui" di UI mengirim `?refresh=1` untuk memaksa ambil ulang.
 * - **Cadangan**: hasil yang berhasil diambil disimpan (idempoten) ke `order_tracking_events`.
 *   Kalau J&T gagal dihubungi, riwayat terakhir yang tersimpan dikirim dengan `stale` + `fetchedAt`.
 * - **Privasi**: hanya field yang dipakai UI yang dikirim (tanpa nama/alamat pengirim & penerima,
 *   tanpa data kurir).
 */

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { ts: number; data: PublicTrackPayload }>();

interface PublicTrackPayload {
  awb: string;
  detail: { services_code: string; weight: number | null; receiver: { city: string | null } };
  history: TrackHistoryItem[];
  /** Kapan data ini benar-benar diambil dari J&T (ISO). */
  fetchedAt: string;
  /** true = data lama dari database karena J&T tidak bisa dihubungi. */
  stale?: boolean;
}

/** Ambil hanya field yang dipakai UI (buang PII pengirim/penerima & data kurir). */
function toPublic(data: TrackResponse, fetchedAt: string): PublicTrackPayload {
  return {
    awb: data.awb,
    detail: {
      services_code: data.detail?.services_code ?? "",
      weight: data.detail?.weight ?? null,
      receiver: { city: data.detail?.receiver?.city ?? null },
    },
    history: (data.history ?? []).map((h) => ({
      date_time: h.date_time,
      city_name: h.city_name,
      status: h.status,
      status_code: h.status_code,
      storeName: h.storeName,
      nextSiteName: h.nextSiteName,
      note: h.note,
    })) as TrackHistoryItem[],
    fetchedAt,
  };
}

/** Riwayat terakhir yang tersimpan di `order_tracking_events` (dipakai saat J&T gagal). */
async function storedPayload(awb: string, fetchedAt: string): Promise<PublicTrackPayload | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("order_tracking_events")
      .select("status_code, status_text, city_name, event_time, raw, created_at")
      .eq("awb_no", awb)
      .order("event_time", { ascending: true });
    if (error || !data || data.length === 0) return null;

    const history = data.map((row) => {
      const raw = (row.raw ?? {}) as Partial<TrackHistoryItem>;
      return {
        date_time: raw.date_time ?? (row.event_time ? String(row.event_time).slice(0, 19).replace("T", " ") : ""),
        city_name: raw.city_name ?? row.city_name ?? "",
        status: raw.status ?? row.status_text ?? "",
        status_code: raw.status_code ?? row.status_code ?? 0,
        storeName: raw.storeName ?? "",
        nextSiteName: raw.nextSiteName ?? "",
        note: raw.note ?? "",
      } as TrackHistoryItem;
    });

    return {
      awb,
      detail: { services_code: "", weight: null, receiver: { city: null } },
      history,
      fetchedAt,
      stale: true,
    };
  } catch {
    return null;
  }
}

function json(payload: PublicTrackPayload) {
  return NextResponse.json({ success: true, data: payload }, { headers: { "Cache-Control": "no-store" } });
}

function fail(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const awb = searchParams.get("awb");
  const forceRefresh = searchParams.get("refresh") === "1";
  if (!awb) return fail("Nomor resi wajib diisi");

  if (!forceRefresh) {
    const hit = cache.get(awb);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return json(hit.data);
  }

  const config = await getJntConfig();
  const configured = config.trackUsername && config.trackPassword && config.companyId;

  if (configured) {
    try {
      const result = await trackShipment(awb);
      if (result.success && result.data) {
        const payload = toPublic(result.data, new Date().toISOString());
        cache.set(awb, { ts: Date.now(), data: payload });
        // Cadangan: simpan riwayat mentah (idempoten) supaya bisa dipakai saat J&T gagal.
        void storeTrackingEvents(getSupabaseAdmin(), awb, result.data.history ?? []);
        return json(payload);
      }
      // J&T menjawab 200 dengan { error_id, error_message } untuk resi/kredensial tak dikenal —
      // coba riwayat tersimpan dulu sebelum menyerah.
      const stored = await storedPayload(awb, new Date().toISOString());
      if (stored) return json(stored);
      return fail(result.error?.error_message || "Data pelacakan tidak ditemukan.");
    } catch (err) {
      console.error("[J&T Track] Error:", err);
      const stored = await storedPayload(awb, new Date().toISOString());
      if (stored) return json(stored);
      return fail("Tidak bisa menghubungi layanan J&T. Coba lagi sebentar lagi.");
    }
  }

  // J&T belum dikonfigurasi: tetap tampilkan riwayat tersimpan kalau ada.
  const stored = await storedPayload(awb, new Date().toISOString());
  if (stored) return json(stored);
  return fail("Pelacakan J&T belum dikonfigurasi.");
}
