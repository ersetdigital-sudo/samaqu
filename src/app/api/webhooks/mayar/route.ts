import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getMayarConfig, getMayarInvoice, getMayarTransaction } from "@/lib/mayar";
import { notifyCustomerOrderPaid } from "@/lib/fonnte";
import { SITE_URL } from "@/lib/site-config";

/**
 * POST /api/webhooks/mayar — notifikasi pembayaran dari Mayar.
 *
 * Keamanan DUA LAPIS:
 * 1. **Token** — Mayar mengirim "Webhook Token" (dashboard → Integration → Webhook) di header
 *    `x-callback-token` (atau sebagai query `?token=`). Dibandingkan timing-safe.
 * 2. **Verifikasi ulang ke API Mayar** — isi body webhook TIDAK dipercaya. Setelah token cocok,
 *    status pembayaran diambil ulang dari `GET /invoices/{id}` (atau `/transactions/{id}`), dan
 *    hanya kalau statusnya benar-benar `paid` pesanan ditandai lunas. Ini penting karena Mayar
 *    tidak menandatangani body-nya.
 *
 * Idempoten: pesanan yang sudah `paid_at` dilewati (webhook bisa dikirim berulang).
 */

/** Status Mayar yang berarti uang sudah masuk. */
const PAID_STATUSES = new Set(["paid", "settlement", "success"]);

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

interface MayarWebhookBody {
  event?: string;
  data?: Record<string, unknown> | null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    let body: MayarWebhookBody = {};
    try {
      body = JSON.parse(raw) as MayarWebhookBody;
    } catch {
      return NextResponse.json({ error: "Body bukan JSON" }, { status: 400 });
    }

    const data = (body.data ?? {}) as Record<string, unknown>;
    const config = await getMayarConfig();

    // ── Lapis 1: token webhook ──
    if (config.webhookToken) {
      const headerToken =
        request.headers.get("x-callback-token") ||
        request.headers.get("x-mayar-token") ||
        request.headers.get("x-webhook-token") ||
        "";
      const queryToken = new URL(request.url).searchParams.get("token") ?? "";
      const provided = headerToken || queryToken;
      if (!provided || !safeEqual(provided, config.webhookToken)) {
        console.warn("[MAYAR] Webhook ditolak: token tidak cocok.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.warn("[MAYAR] Webhook Token belum diisi — verifikasi hanya lewat API Mayar.");
    }

    const event = asString(body.event);
    const invoiceId = asString(data.paymentLinkId) || asString(data.id);
    const transactionId = asString(data.transactionId) || asString(data.paymentLinkTransactionId);
    const extraOrder = asString((data.extraData as Record<string, unknown> | undefined)?.orderNumber);

    const supabaseAdmin = getSupabaseAdmin();

    // Cocokkan ke pesanan kita: utamakan nomor pesanan dari extraData, lalu id invoice/transaksi.
    let order: { id: string; order_number: string; status: string; customer_name: string | null; customer_whatsapp: string | null; payment_ref: string | null; paid_at: string | null } | null = null;

    if (extraOrder) {
      const { data: byNumber } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, status, customer_name, customer_whatsapp, payment_ref, paid_at")
        .eq("order_number", extraOrder)
        .maybeSingle();
      order = byNumber ?? null;
    }
    if (!order) {
      const ids = [invoiceId, transactionId].filter(Boolean);
      if (ids.length === 0) {
        console.warn("[MAYAR] Webhook tanpa id yang bisa dicocokkan:", event);
        return NextResponse.json({ ignored: true });
      }
      const { data: rows } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, status, customer_name, customer_whatsapp, payment_ref, paid_at")
        .in("payment_ref", ids)
        .limit(1);
      order = rows?.[0] ?? null;
    }

    if (!order) {
      console.warn("[MAYAR] Webhook tidak cocok dengan pesanan mana pun:", event, invoiceId, transactionId);
      return NextResponse.json({ ignored: true });
    }
    if (order.paid_at) {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    // ── Lapis 2: verifikasi ulang ke API Mayar (body tidak dipercaya) ──
    let verifiedPaid = false;
    const refId = order.payment_ref || invoiceId;
    if (refId) {
      const inv = await getMayarInvoice(refId);
      const status = asString(inv.data?.status).toLowerCase();
      if (inv.ok && PAID_STATUSES.has(status)) verifiedPaid = true;
      else if (!inv.ok && transactionId) {
        const tx = await getMayarTransaction(transactionId);
        if (tx.ok && PAID_STATUSES.has(asString(tx.data?.status).toLowerCase())) verifiedPaid = true;
      }
    }

    if (!verifiedPaid) {
      console.warn("[MAYAR] Webhook diabaikan: status Mayar belum 'paid'.", order.order_number, event);
      return NextResponse.json({ ignored: true });
    }

    // ── Tandai lunas + naikkan status (maju-saja: hanya dari `pending`) ──
    const paidAt = new Date().toISOString();
    const patch: Record<string, unknown> = { payment_status: "paid", paid_at: paidAt };
    if (order.status === "pending") patch.status = "diproses";
    const { error: updateError } = await supabaseAdmin.from("orders").update(patch).eq("id", order.id);
    if (updateError) {
      console.error("[MAYAR] Gagal menandai pesanan lunas:", order.order_number, updateError);
      return NextResponse.json({ error: "Gagal menyimpan status pembayaran" }, { status: 500 });
    }

    console.log("[MAYAR] Pembayaran diterima:", order.order_number, refId);

    // Kabari customer (best effort — gagal kirim tidak menggagalkan webhook).
    if (order.customer_whatsapp) {
      try {
        await notifyCustomerOrderPaid({
          orderNumber: order.order_number,
          customerName: order.customer_name || "",
          customerWhatsapp: order.customer_whatsapp,
          orderUrl: `${SITE_URL}/akun/pesanan/${order.order_number}`,
        });
      } catch (e) {
        console.error("[MAYAR] Gagal kirim notifikasi WA:", e);
      }
    }

    return NextResponse.json({ success: true, orderNumber: order.order_number });
  } catch (e) {
    console.error("[MAYAR] Webhook error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
