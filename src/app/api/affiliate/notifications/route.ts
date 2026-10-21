import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { affiliateSession, affiliateUnauthorized } from "@/lib/affiliate/auth";
import { syncCommissionsForAffiliate } from "@/lib/affiliate/commission";
import { getAffiliateSettings } from "@/lib/affiliate/settings";
import { loadAffiliateOrders } from "@/lib/affiliate/queries";

/**
 * Pusat notifikasi portal affiliate.
 *
 * Notifikasi DIBANGUN dari data nyata (pesanan, perubahan komisi, pengajuan
 * pencairan) — bukan daftar statis. Status "sudah dibaca" disimpan di browser
 * (localStorage), jadi tidak perlu tabel tambahan.
 */
export async function GET(req: NextRequest) {
  const session = await affiliateSession(req);
  if (!session) return affiliateUnauthorized();

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);
  await syncCommissionsForAffiliate(supabase, session.affiliate.id, { settings });

  const orders = await loadAffiliateOrders(supabase, session.affiliate.id, 60);

  const notifications: {
    id: string;
    cat: string;
    title: string;
    body: string;
    to: string;
    date: string;
  }[] = [];

  for (const order of orders) {
    const ref = order.order_number;
    if (order.status === "selesai") {
      notifications.push({
        id: `order-selesai-${order.id}`,
        cat: "Pesanan",
        title: "Pesanan selesai",
        body: `Pesanan ${ref} telah selesai dan memasuki masa validasi komisi.`,
        to: "/affiliate/pesanan",
        date: order.created_at,
      });
    } else if (order.status === "dibatalkan") {
      notifications.push({
        id: `order-batal-${order.id}`,
        cat: "Pesanan",
        title: "Pesanan dibatalkan",
        body: `Pesanan ${ref} dibatalkan, komisi tidak diteruskan.`,
        to: "/affiliate/pesanan",
        date: order.created_at,
      });
    } else {
      notifications.push({
        id: `order-baru-${order.id}`,
        cat: "Pesanan",
        title: "Pesanan baru teratribusi",
        body: `Pesanan ${ref} masuk melalui tautan referral kamu.`,
        to: "/affiliate/pesanan",
        date: order.created_at,
      });
    }

    const commission = order.commission;
    if (commission?.status === "ditolak" && commission.reason) {
      notifications.push({
        id: `komisi-tolak-${commission.id}`,
        cat: "Komisi",
        title: "Komisi tidak disetujui",
        body: commission.reason,
        to: "/affiliate/komisi",
        date: commission.updated_at || order.created_at,
      });
    } else if (commission?.status === "disetujui") {
      notifications.push({
        id: `komisi-setuju-${commission.id}`,
        cat: "Komisi",
        title: "Komisi disetujui",
        body: `Komisi untuk pesanan ${ref} masuk ke saldo tersedia.`,
        to: "/affiliate/komisi",
        date: commission.updated_at || order.created_at,
      });
    }
  }

  const { data: withdrawalRows } = await supabase
    .from("affiliate_withdrawals")
    .select("id, ref, status, reason, created_at, updated_at, net_amount")
    .eq("affiliate_id", session.affiliate.id)
    .order("created_at", { ascending: false })
    .limit(30);

  for (const w of (withdrawalRows || []) as {
    id: string;
    ref: string;
    status: string;
    reason: string | null;
    created_at: string;
    updated_at: string;
    net_amount: number;
  }[]) {
    if (w.status === "ditolak") {
      notifications.push({
        id: `penarikan-tolak-${w.id}`,
        cat: "Penarikan",
        title: "Penarikan ditolak",
        body: w.reason || `Penarikan ${w.ref} ditolak oleh admin.`,
        to: "/affiliate/penarikan",
        date: w.updated_at || w.created_at,
      });
    } else if (w.status === "berhasil") {
      notifications.push({
        id: `penarikan-sukses-${w.id}`,
        cat: "Penarikan",
        title: "Penarikan berhasil",
        body: `Dana penarikan ${w.ref} telah diproses ke rekening tujuan.`,
        to: "/affiliate/penarikan",
        date: w.updated_at || w.created_at,
      });
    } else {
      notifications.push({
        id: `penarikan-${w.id}`,
        cat: "Penarikan",
        title: w.status === "diproses" ? "Penarikan sedang diproses" : "Penarikan menunggu",
        body: `Pengajuan ${w.ref} berstatus ${w.status}.`,
        to: "/affiliate/penarikan",
        date: w.created_at,
      });
    }
  }

  notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ notifications: notifications.slice(0, 60) });
}
