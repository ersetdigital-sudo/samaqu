import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Klien Mayar Headless API v2 (https://docs.mayar.id/api-reference-v2/introduction).
 *
 * - Kredensial dibaca dari tabel `mayar_settings` (service-role only), dengan fallback env
 *   (`MAYAR_API_KEY` / `MAYAR_WEBHOOK_TOKEN` / `MAYAR_ENV`) — pola yang sama dengan Fonnte/J&T.
 * - Environment menentukan base URL: sandbox `api.mayar.io`, produksi `api.mayar.id`.
 * - Semua respons memakai envelope `{ statusCode, messages, data }`; `statusCode` di body
 *   dianggap OTORITATIF (beberapa endpoint menulis HTTP 200 dengan statusCode != 200).
 */

export type MayarEnv = "sandbox" | "production";

const BASE_URLS: Record<MayarEnv, string> = {
  sandbox: "https://api.mayar.io/hl/v2",
  production: "https://api.mayar.id/hl/v2",
};

export interface MayarConfig {
  apiKey: string;
  webhookToken: string;
  env: MayarEnv;
  /** Admin bisa mematikan gateway tanpa menghapus kredensialnya. */
  enabled: boolean;
}

export function normalizeMayarEnv(value: string | null | undefined): MayarEnv {
  return value === "production" ? "production" : "sandbox";
}

export function mayarBaseUrl(env: MayarEnv): string {
  return BASE_URLS[env];
}

function envConfig(): MayarConfig {
  return {
    apiKey: process.env.MAYAR_API_KEY || "",
    webhookToken: process.env.MAYAR_WEBHOOK_TOKEN || "",
    env: normalizeMayarEnv(process.env.MAYAR_ENV),
    enabled: process.env.MAYAR_ENABLED === "1",
  };
}

async function dbConfig(): Promise<Partial<MayarConfig> | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("mayar_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
      apiKey: typeof row.api_key === "string" ? row.api_key : "",
      webhookToken: typeof row.webhook_token === "string" ? row.webhook_token : "",
      env: row.env ? normalizeMayarEnv(String(row.env)) : undefined,
      enabled: row.enabled === true,
    };
  } catch (e) {
    console.error("[MAYAR] Gagal membaca mayar_settings, pakai env:", e);
    return null;
  }
}

let cached: { config: MayarConfig; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Dipanggil setelah admin menyimpan kredensial supaya nilai baru langsung dipakai. */
export function clearMayarConfigCache() {
  cached = null;
}

export async function getMayarConfig(): Promise<MayarConfig> {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.config;

  const fromEnv = envConfig();
  const fromDb = await dbConfig();
  const config: MayarConfig = fromDb
    ? {
        apiKey: fromDb.apiKey || fromEnv.apiKey,
        webhookToken: fromDb.webhookToken || fromEnv.webhookToken,
        env: fromDb.env || fromEnv.env,
        enabled: fromDb.enabled ?? fromEnv.enabled,
      }
    : fromEnv;

  cached = { config, ts: Date.now() };
  return config;
}

/** Siap dipakai kalau diaktifkan admin DAN ada API key. */
export function mayarReady(config: MayarConfig): boolean {
  return config.enabled && !!config.apiKey;
}

interface MayarEnvelope<T> {
  statusCode?: number;
  messages?: string;
  message?: string;
  data?: T;
}

interface MayarResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function mayarFetch<T>(
  path: string,
  init?: { method?: string; body?: string }
): Promise<MayarResult<T>> {
  const config = await getMayarConfig();
  if (!config.apiKey) return { ok: false, error: "API key Mayar belum diisi." };

  try {
    const res = await fetch(`${mayarBaseUrl(config.env)}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      ...(init?.body ? { body: init.body } : {}),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as MayarEnvelope<T> | null;
    const message = body?.messages ?? body?.message ?? "";
    const code = Number(body?.statusCode ?? res.status);
    if (!res.ok || (Number.isFinite(code) && code >= 400)) {
      console.error("[MAYAR] Request gagal:", path, res.status, code, message);
      return { ok: false, error: message || `Mayar menolak permintaan (${code}).` };
    }
    return { ok: true, data: body?.data as T };
  } catch (e) {
    console.error("[MAYAR] Error:", path, e);
    return { ok: false, error: "Tidak bisa menghubungi Mayar." };
  }
}

export interface MayarInvoiceData {
  id: string;
  transactionId?: string;
  /** Halaman bayar Mayar yang dibuka customer. */
  link: string;
  /** Epoch millis. */
  expiredAt?: number;
}

/** Buat invoice (link pembayaran hosted). `extraData.orderNumber` dikembalikan Mayar untuk jejak. */
export async function createMayarInvoice(input: {
  name: string;
  email: string;
  mobile: string;
  amount: number;
  description: string;
  orderNumber: string;
  expiresAt?: string;
}): Promise<MayarResult<MayarInvoiceData>> {
  const amount = Math.round(Number(input.amount) || 0);
  if (amount <= 0) return { ok: false, error: "Nominal invoice harus lebih dari 0." };

  const payload = {
    name: input.name,
    email: input.email,
    mobile: input.mobile,
    description: input.description,
    ...(input.expiresAt ? { expiredAt: input.expiresAt } : {}),
    items: [{ quantity: 1, rate: amount, description: input.description }],
    extraData: { orderNumber: input.orderNumber, source: "samaqu" },
  };

  return mayarFetch<MayarInvoiceData>("/invoices/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Detail invoice — dipakai untuk MEMVERIFIKASI status sebelum menandai pesanan lunas. */
export async function getMayarInvoice(id: string): Promise<MayarResult<{ id: string; status?: string; amount?: number }>> {
  return mayarFetch<{ id: string; status?: string; amount?: number }>(`/invoices/${encodeURIComponent(id)}`);
}

/** Detail transaksi — jalur verifikasi cadangan kalau webhook hanya membawa transactionId. */
export async function getMayarTransaction(
  id: string
): Promise<MayarResult<{ id: string; status?: string; amount?: number; extraData?: { orderNumber?: string } | null }>> {
  return mayarFetch<{ id: string; status?: string; amount?: number; extraData?: { orderNumber?: string } | null }>(
    `/transactions/${encodeURIComponent(id)}`
  );
}

/**
 * Email pengganti untuk customer yang tidak punya email (mis. guest di Open Order). Mayar
 * mewajibkan `email`, dan format ini tetap valid serta bisa dilacak ke nomor pesanannya.
 */
export function mayarPlaceholderEmail(orderNumber: string): string {
  return `order+${String(orderNumber).toLowerCase().replace(/[^a-z0-9-]/g, "")}@samaqu.id`;
}
