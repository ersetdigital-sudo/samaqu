/**
 * Alert ke admin kalau live chat banyak gagal.
 *
 * Dipanggil setiap kali sebuah balasan gagal. Kalau jumlah error dalam 1 jam terakhir
 * menembus ambang, admin dikabari lewat WhatsApp (Fonnte). Diberi throttle 1 jam supaya
 * tidak spam. Tidak butuh cron/scheduler.
 *
 * Modul server-only.
 */

import { getSupabaseAdmin } from "./supabase-admin";
import { getFonnteConfig, resolveAdminTargets, sendFonnteMessage } from "./fonnte";

const WINDOW_MS = 60 * 60 * 1000; // hitung error dalam 1 jam terakhir
const THROTTLE_MS = 60 * 60 * 1000; // maksimal 1 alert per jam

export const ERROR_ALERT_THRESHOLD = 5;

export async function maybeAlertErrorSpike(
  threshold: number = ERROR_ALERT_THRESHOLD,
  sample?: string | null
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    const { count } = await admin
      .from("chat_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .not("error", "is", null);

    if ((count ?? 0) < threshold) return;

    // Throttle: jangan kirim alert lagi kalau baru saja dikirim.
    const { data: cs } = await admin
      .from("chat_settings")
      .select("last_error_alert_at")
      .eq("id", 1)
      .maybeSingle();
    const last = cs?.last_error_alert_at ? new Date(cs.last_error_alert_at as string).getTime() : 0;
    if (Date.now() - last < THROTTLE_MS) return;

    const config = await getFonnteConfig();
    if (!config.enabled || !config.token) return;
    const target = await resolveAdminTargets(config.adminNumber);
    if (!target) return;

    const message = [
      "\u26A0\uFE0F *PERINGATAN \u2014 Banyak error di Live Chat SAMAQU*",
      "",
      `${count} percakapan gagal dalam 1 jam terakhir (ambang ${threshold}).`,
      sample ? `Contoh error: ${String(sample).slice(0, 200)}` : "",
      "",
      "Cek panel admin \u2192 Live Chat \u2192 filter \"Hanya yang gagal\". Kemungkinan penyedia AI sedang bermasalah atau kuota habis.",
    ]
      .filter(Boolean)
      .join("\n");

    const ok = await sendFonnteMessage(config.token, target, message);
    if (ok) {
      await admin.from("chat_settings").update({ last_error_alert_at: new Date().toISOString() }).eq("id", 1);
    }
  } catch (e) {
    console.error("[CHAT-ALERT] gagal memeriksa/mengirim alert:", e);
  }
}
