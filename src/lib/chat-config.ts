/**
 * Konfigurasi live chat AI (Xiaomi MiMo, endpoint OpenAI-compatible).
 *
 * Nilai diambil dari tabel `chat_settings` (diatur admin lewat Pengaturan), lalu jatuh ke
 * environment variable kalau kolomnya masih kosong. Tabel itu sengaja terpisah dari
 * `store_settings` karena `store_settings` bisa dibaca publik — API key tidak boleh bocor.
 *
 * Modul ini server-only.
 */

import { getSupabaseAdmin } from "./supabase-admin";

export const DEFAULT_CHAT_BASE_URL = "https://api.mimo.mi.com/v1";
export const DEFAULT_CHAT_MODEL = "mimo-v2-flash";

export interface ChatConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  greeting: string;
  extraInstructions: string;
}

function envConfig(): ChatConfig {
  return {
    enabled: true,
    apiKey: process.env.MIMO_API_KEY || "",
    baseUrl: process.env.MIMO_BASE_URL || DEFAULT_CHAT_BASE_URL,
    model: process.env.MIMO_MODEL || DEFAULT_CHAT_MODEL,
    greeting: "",
    extraInstructions: "",
  };
}

/** Nilai dari tabel `chat_settings` (diisi admin). Null kalau tabelnya belum dibuat. */
async function dbConfig(): Promise<Partial<ChatConfig> | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("chat_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;
    return {
      enabled: row.enabled === true,
      apiKey: (row.api_key as string) || "",
      baseUrl: (row.base_url as string) || "",
      model: (row.model as string) || "",
      greeting: (row.greeting as string) || "",
      extraInstructions: (row.extra_instructions as string) || "",
    };
  } catch (e) {
    console.error("[CHAT] Gagal membaca chat_settings, pakai environment variable:", e);
    return null;
  }
}

let cached: { config: ChatConfig; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Dipanggil setelah admin menyimpan pengaturan supaya nilai baru langsung dipakai. */
export function clearChatConfigCache() {
  cached = null;
}

/**
 * Konfigurasi aktif. `enabled` hanya true kalau admin menyalakannya (baris DB ada);
 * tanpa baris DB, chat dianggap aktif hanya kalau ada API key dari environment.
 */
export async function getChatConfig(): Promise<ChatConfig> {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.config;

  const fromEnv = envConfig();
  const fromDb = await dbConfig();

  const config: ChatConfig = fromDb
    ? {
        enabled: fromDb.enabled ?? false,
        apiKey: fromDb.apiKey || fromEnv.apiKey,
        baseUrl: fromDb.baseUrl || fromEnv.baseUrl,
        model: fromDb.model || fromEnv.model,
        greeting: fromDb.greeting || fromEnv.greeting,
        extraInstructions: fromDb.extraInstructions || fromEnv.extraInstructions,
      }
    : { ...fromEnv, enabled: !!fromEnv.apiKey };

  cached = { config, ts: Date.now() };
  return config;
}

/** Siap dipakai customer: diaktifkan admin DAN ada API key. */
export function isChatReady(config: ChatConfig): boolean {
  return config.enabled && !!config.apiKey;
}
