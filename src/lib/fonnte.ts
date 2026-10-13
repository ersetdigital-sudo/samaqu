/**
 * Notifikasi pesanan ke admin lewat WhatsApp via Fonnte (https://fonnte.com).
 *
 * Fonnte menerima POST ke /send dengan header `Authorization` berisi token mentah
 * (tanpa "Bearer") dan body form-urlencoded. Modul ini server-only karena memakai
 * token rahasia, jadi jangan diimpor dari komponen client.
 *
 * Konfigurasi diambil dari tabel `fonnte_settings` (diatur admin lewat Pengaturan),
 * lalu jatuh ke environment variable kalau kolomnya masih kosong. Tabel itu sengaja
 * terpisah dari `store_settings` karena `store_settings` bisa dibaca publik.
 *
 * Prinsip penting: notifikasi adalah efek samping. Kegagalan mengirim pesan tidak
 * boleh menggagalkan checkout, jadi semua fungsi di sini menelan error-nya sendiri.
 */

import { getSupabaseAdmin } from "./supabase-admin";
import { SITE_URL } from "./site-config";

const FONNTE_ENDPOINT = "https://api.fonnte.com/send";
const REQUEST_TIMEOUT_MS = 8000;

export interface FonnteConfig {
  enabled: boolean;
  token: string;
  adminNumber: string;
}

/** "0812…", "+62 812…", "812…" → "62812…" (format nomor yang diterima Fonnte). */
export function normalizeWhatsappTarget(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function envConfig(): FonnteConfig {
  return {
    enabled: true,
    token: process.env.FONNTE_TOKEN || "",
    adminNumber: process.env.ADMIN_WHATSAPP_NUMBER || "",
  };
}

/**
 * Nilai dari tabel `fonnte_settings` (diisi admin). Tabel ini tanpa policy RLS, jadi
 * hanya service role yang bisa membacanya. Mengembalikan null kalau tabelnya belum
 * dibuat (jalankan supabase/fonnte-settings.sql).
 */
async function dbConfig(): Promise<FonnteConfig | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("fonnte_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;
    return {
      enabled: row.enabled !== false,
      token: (row.token as string) || "",
      adminNumber: (row.admin_number as string) || "",
    };
  } catch (e) {
    console.error("[FONNTE] Gagal membaca fonnte_settings, pakai environment variable:", e);
    return null;
  }
}

let cached: { config: FonnteConfig; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Dipanggil setelah admin menyimpan pengaturan supaya nilai baru langsung dipakai. */
export function clearFonnteConfigCache() {
  cached = null;
}

/**
 * Konfigurasi aktif: nilai yang diisi admin menang, field yang masih kosong jatuh ke
 * environment variable (FONNTE_TOKEN, ADMIN_WHATSAPP_NUMBER).
 */
export async function getFonnteConfig(): Promise<FonnteConfig> {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.config;

  const fromEnv = envConfig();
  const fromDb = await dbConfig();
  const config: FonnteConfig = fromDb
    ? {
        enabled: fromDb.enabled,
        token: fromDb.token || fromEnv.token,
        adminNumber: fromDb.adminNumber || fromEnv.adminNumber,
      }
    : fromEnv;

  cached = { config, ts: Date.now() };
  return config;
}

/**
 * Nomor admin penerima notifikasi: nomor dari pengaturan admin (boleh beberapa, dipisah
 * koma) → kalau kosong, jatuh ke nomor toko di `store_settings.whatsapp`.
 */
export async function resolveAdminTargets(configuredNumber?: string): Promise<string> {
  const fromConfig = (configuredNumber || "")
    .split(",")
    .map(normalizeWhatsappTarget)
    .filter(Boolean);
  if (fromConfig.length) return fromConfig.join(",");

  try {
    const { data } = await getSupabaseAdmin()
      .from("store_settings")
      .select("whatsapp")
      .eq("id", 1)
      .maybeSingle();
    return normalizeWhatsappTarget((data?.whatsapp as string) || "");
  } catch {
    return "";
  }
}

/**
 * Kirim satu pesan via Fonnte. `countryCode` "62" membuat Fonnte ikut menormalkan nomor
 * lokal Indonesia. Mengembalikan false kalau token/target kosong atau Fonnte menolak.
 */
export async function sendFonnteMessage(
  token: string,
  target: string,
  message: string
): Promise<boolean> {
  if (!token || !target) return false;

  try {
    const response = await fetch(FONNTE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ target, message, countryCode: "62" }).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const result = (await response.json().catch(() => null)) as
      | { status?: boolean; reason?: string }
      | null;

    if (!response.ok || result?.status === false) {
      console.error("[FONNTE] Gagal mengirim pesan:", result?.reason || response.status);
      return false;
    }

    console.log("[FONNTE] Notifikasi terkirim ke", target);
    return true;
  } catch (error) {
    console.error("[FONNTE] Error saat mengirim pesan:", error);
    return false;
  }
}

export interface NewOrderNotificationItem {
  name: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
  price: number;
}

export interface NewOrderNotification {
  orderNumber: string;
  customerName: string;
  customerWhatsapp: string;
  total: number;
  paymentType: string;
  items: NewOrderNotificationItem[];
  shippingCity?: string | null;
  notes?: string | null;
  /** Asal pesanan (mis. "Open Order (Create Your Price)") — hanya ditampilkan kalau diisi. */
  source?: string | null;
}

function rupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/** Ringkasan pesanan untuk admin — nomor pesanan, pemesan, item, dan tautan kelola. */
export function buildNewOrderMessage(order: NewOrderNotification): string {
  const itemLines = order.items
    .map((item) => {
      const variant = [item.color, item.size].filter(Boolean).join(" / ");
      const suffix = variant ? ` (${variant})` : "";
      return `- ${item.quantity}x ${item.name}${suffix} — ${rupiah(item.price * item.quantity)}`;
    })
    .join("\n");

  const lines = [
    "\u{1F514} *PESANAN BARU \u2014 SAMAQU*",
    "",
    `No. Pesanan: ${order.orderNumber}`,
    `Nama: ${order.customerName}`,
    `WhatsApp: ${order.customerWhatsapp}`,
    `Pembayaran: ${order.paymentType}`,
    `Total: ${rupiah(order.total)}`,
    "",
    "Item:",
    itemLines,
  ];

  if (order.shippingCity) lines.push("", `Tujuan: ${order.shippingCity}`);
  if (order.source) lines.push(`Sumber: ${order.source}`);
  if (order.notes) lines.push(`Catatan: ${order.notes}`);

  lines.push("", `Kelola pesanan: ${SITE_URL}/admin?panel=orders`);
  return lines.join("\n");
}

/**
 * Kirim notifikasi pesanan baru ke admin. Dilewati diam-diam kalau token belum ada atau
 * notifikasi dimatikan. Semua error ditelan di sini supaya alur checkout tetap aman.
 */
export async function notifyAdminNewOrder(order: NewOrderNotification): Promise<void> {
  const config = await getFonnteConfig();
  if (!config.enabled || !config.token) return;

  const target = await resolveAdminTargets(config.adminNumber);
  if (!target) {
    console.warn(
      "[FONNTE] Tidak ada nomor admin. Isi lewat Pengaturan admin atau environment variable."
    );
    return;
  }

  await sendFonnteMessage(config.token, target, buildNewOrderMessage(order));
}

/* ══════════════════════════════════════════
   Notifikasi ke CUSTOMER
   Supaya admin tidak perlu membalas satu-satu: instruksi pembayaran, langkah berikutnya, dan
   pengingat batas waktu ikut terkirim otomatis begitu pesanan dibuat (dan saat dibayar).
══════════════════════════════════════════ */

/**
 * Ringkasan metode pembayaran untuk pesan customer — bentuk struktural dari baris
 * `payment_methods` (dikelola dari dashboard admin), sengaja tidak mengimpor tipe client-nya.
 */
export interface PaymentInstruction {
  label: string;
  /** `bank` | `qris` | `ewallet` | `cod` | `other` */
  type: string;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  accountInfo?: string | null;
  instructions?: string | null;
}

export interface CustomerOrderNotification {
  orderNumber: string;
  customerName: string;
  customerWhatsapp: string;
  items: NewOrderNotificationItem[];
  total: number;
  paymentMethod?: PaymentInstruction | null;
  isOpenOrder?: boolean;
  /** Tautan halaman pesanan milik customer di /akun/pesanan. */
  orderUrl?: string;
}

/** Satu baris item untuk pesan customer: "- 1x Thobe Navy — Jiharkah (Uk. M) — Rp 329.000". */
function customerItemLine(item: NewOrderNotificationItem): string {
  const color = item.color && item.color !== "default" && item.color !== "-" ? item.color : null;
  const variant = [color, item.size ? `Uk. ${item.size}` : null].filter(Boolean).join(" · ");
  return `- ${item.quantity}x ${item.name}${variant ? ` (${variant})` : ""} — ${rupiah(item.price * item.quantity)}`;
}

/** Baris instruksi pembayaran sesuai metode yang dipilih (bank/QRIS/e-wallet/COD). */
function paymentInstructionLines(payment?: PaymentInstruction | null): string[] {
  const type = payment?.type || "bank";

  if (type === "cod") {
    return [
      "Kamu memilih *Bayar di Tempat (COD)*, jadi belum perlu transfer ya — admin akan konfirmasi dulu lewat chat ini sebelum pesanan dikirim.",
    ];
  }

  const lines: string[] = [];
  if (type === "qris") lines.push("Silakan scan QRIS pembayaran (admin kirim QR-nya di chat ini):");
  else if (type === "ewallet") lines.push(`Silakan kirim ke${payment?.label ? ` *${payment.label}*` : ""}:`);
  else lines.push("Silakan transfer ke rekening berikut:");

  if (payment?.bankName) lines.push(`🏦 ${payment.bankName}`);
  if (payment?.accountNumber) lines.push(`No. Rekening: *${payment.accountNumber}*`);
  if (payment?.accountName) lines.push(`a.n. ${payment.accountName}`);
  if (payment?.accountInfo) lines.push(payment.accountInfo);
  if (payment?.instructions) lines.push(payment.instructions);
  return lines;
}

/** Pesan "pesanan kamu sudah kami terima" + cara bayar + langkah berikutnya. */
export function buildCustomerOrderMessage(order: CustomerOrderNotification): string {
  const firstName = (order.customerName || "").trim().split(/\s+/)[0] || "Kak";
  const type = order.paymentMethod?.type || "bank";
  const isCod = type === "cod";

  const lines: string[] = [
    `Halo ${firstName} 👋`,
    `Pesanan${order.isOpenOrder ? " Open Order" : ""} kamu sudah kami terima.`,
    "",
    `No. Pesanan: *${order.orderNumber}*`,
    ...order.items.map(customerItemLine),
    `Total: *${rupiah(order.total)}*`,
    "",
    ...paymentInstructionLines(order.paymentMethod),
    "",
  ];

  if (isCod) {
    lines.push(
      "Setelah dikonfirmasi admin:",
      "1. Pesanan disiapkan & diserahkan ke J&T",
      "2. Nomor resi dikirim ke chat ini"
    );
  } else {
    lines.push(
      "Setelah transfer, balas chat ini dengan *bukti transfer* ya — supaya admin bisa langsung verifikasi.",
      "Pesanan otomatis dibatalkan kalau belum ada pembayaran dalam *24 jam*.",
      "",
      "Setelah pembayaran diverifikasi:",
      "1. Pesanan disiapkan & diserahkan ke J&T",
      "2. Nomor resi dikirim ke chat ini"
    );
  }
  if (order.orderUrl) lines.push(`3. Status pesanan bisa kamu pantau kapan saja: ${order.orderUrl}`);

  lines.push("", "Ada yang mau ditanyakan? Balas chat ini aja 🙏", "— SAMAQU");
  return lines.join("\n");
}

/**
 * Kirim pesan "pesanan diterima" ke WhatsApp customer. Dilewati diam-diam kalau token belum
 * ada, notifikasi dimatikan, atau nomor customer kosong — supaya alur pesanan tetap aman.
 */
export async function notifyCustomerOrderCreated(order: CustomerOrderNotification): Promise<void> {
  const config = await getFonnteConfig();
  if (!config.enabled || !config.token) return;

  const target = normalizeWhatsappTarget(order.customerWhatsapp);
  if (!target) return;

  await sendFonnteMessage(config.token, target, buildCustomerOrderMessage(order));
}

export interface OrderPaidNotification {
  orderNumber: string;
  customerName: string;
  customerWhatsapp: string;
  orderUrl?: string;
}

/** Pesan "pembayaran diterima, pesanan diproses" (dikirim saat admin ubah status ke Diproses). */
export function buildOrderPaidMessage(order: OrderPaidNotification): string {
  const firstName = (order.customerName || "").trim().split(/\s+/)[0] || "Kak";
  const lines = [
    `Halo ${firstName}, pembayaran pesanan *${order.orderNumber}* sudah kami terima ✅`,
    "",
    "Pesanan sedang disiapkan. Nomor resi J&T kami kirim ke chat ini begitu paket diserahkan ke kurir.",
  ];
  if (order.orderUrl) lines.push("", `Pantau status pesananmu: ${order.orderUrl}`);
  lines.push("", "Terima kasih ya 🙏", "— SAMAQU");
  return lines.join("\n");
}

export async function notifyCustomerOrderPaid(order: OrderPaidNotification): Promise<void> {
  const config = await getFonnteConfig();
  if (!config.enabled || !config.token) return;

  const target = normalizeWhatsappTarget(order.customerWhatsapp);
  if (!target) return;

  await sendFonnteMessage(config.token, target, buildOrderPaidMessage(order));
}
