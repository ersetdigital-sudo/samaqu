import { getSupabaseAdmin } from "../supabase-admin";
import type { JntConfig } from "./types";

type JntEnv = "testing" | "production";

const BASE_URLS = {
  testing: {
    order: "https://demo-ecommerce.inuat-jntexpress.id/jts-idn-ecommerce-api/api/order/create",
    cancel: "https://demo-ecommerce.inuat-jntexpress.id/jts-idn-ecommerce-api/api/order/cancel",
    tariff: "https://demo-general.inuat-jntexpress.id/jandt_track/inquiry.action",
    track: "https://demo-general.inuat-jntexpress.id/jandt_track/track/trackAction!tracking.action",
  },
  production: {
    order: "https://ecommerce.jntexpress.id/jts-idn-ecommerce-api/api/order/create",
    cancel: "https://api.jet.co.id/jts-idn-ecommerce-api/api/order/cancel",
    tariff: "https://partner-track.jet.co.id/jandt_track/inquiry.action",
    track: "https://secure-jk.jet.co.id/jandt-order-web/track/trackAction!tracking.action",
  },
} as const;

export function normalizeJntEnv(value: string | null | undefined): JntEnv {
  return value === "production" ? "production" : "testing";
}

function envConfig(): JntConfig {
  return {
    env: normalizeJntEnv(process.env.JNT_ENV),
    orderUsername: process.env.JNT_ORDER_USERNAME || "",
    orderApiKey: process.env.JNT_ORDER_API_KEY || "",
    orderKey: process.env.JNT_ORDER_KEY || "",
    tariffKey: process.env.JNT_TARIFF_KEY || "",
    tariffCusName: process.env.JNT_TARIFF_CUS_NAME || "",
    trackUsername: process.env.JNT_TRACK_USERNAME || "",
    trackPassword: process.env.JNT_TRACK_PASSWORD || "",
    companyId: process.env.JNT_COMPANY_ID || "",
  };
}

/**
 * Kredensial dari tabel `jnt_settings` (diisi admin lewat Pengaturan → Kredensial J&T Express).
 * Tabelnya sengaja tanpa policy RLS, jadi hanya service role yang bisa membacanya.
 * Mengembalikan null kalau tabelnya belum dibuat (jalankan supabase/jnt-settings.sql).
 */
async function dbConfig(): Promise<Partial<JntConfig> | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("jnt_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as Record<string, string | null>;
    return {
      env: row.env ? normalizeJntEnv(row.env) : undefined,
      orderUsername: row.order_username || "",
      orderApiKey: row.order_api_key || "",
      orderKey: row.order_key || "",
      tariffKey: row.tariff_key || "",
      tariffCusName: row.tariff_cus_name || "",
      trackUsername: row.track_username || "",
      trackPassword: row.track_password || "",
      companyId: row.company_id || "",
    };
  } catch (e) {
    console.error("[JNT-CONFIG] Gagal membaca jnt_settings, pakai environment variable:", e);
    return null;
  }
}

let cached: { config: JntConfig; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Dipanggil setelah admin menyimpan kredensial supaya nilai baru langsung dipakai. */
export function clearJntConfigCache() {
  cached = null;
}

/**
 * Kredensial aktif: nilai yang diisi admin di dashboard menang, field yang masih kosong
 * jatuh ke environment variable (JNT_ORDER_USERNAME, JNT_TARIFF_KEY, dst).
 */
export async function getJntConfig(): Promise<JntConfig> {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.config;

  const fromEnv = envConfig();
  const fromDb = await dbConfig();
  const config: JntConfig = fromDb
    ? {
        env: fromDb.env || fromEnv.env,
        orderUsername: fromDb.orderUsername || fromEnv.orderUsername,
        orderApiKey: fromDb.orderApiKey || fromEnv.orderApiKey,
        orderKey: fromDb.orderKey || fromEnv.orderKey,
        tariffKey: fromDb.tariffKey || fromEnv.tariffKey,
        tariffCusName: fromDb.tariffCusName || fromEnv.tariffCusName,
        trackUsername: fromDb.trackUsername || fromEnv.trackUsername,
        trackPassword: fromDb.trackPassword || fromEnv.trackPassword,
        companyId: fromDb.companyId || fromEnv.companyId,
      }
    : fromEnv;

  cached = { config, ts: Date.now() };
  return config;
}

export function getJntBaseUrl(
  endpoint: "order" | "cancel" | "tariff" | "track",
  env: JntEnv = normalizeJntEnv(process.env.JNT_ENV)
): string {
  return BASE_URLS[env][endpoint];
}
