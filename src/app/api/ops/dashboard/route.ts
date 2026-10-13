import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { jakartaDayBounds } from "@/lib/ops-followup";

/**
 * Dashboard ops — ringkasan lintas modul dalam satu request.
 * Semua angka dihitung dari database (tidak ada angka statis) dan memakai batas hari/bulan WIB.
 */

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function jakartaMonthBounds() {
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  const y = wib.getUTCFullYear();
  const m = wib.getUTCMonth();
  return {
    startIso: new Date(Date.UTC(y, m, 1) - 7 * 3600 * 1000).toISOString(),
    endIso: new Date(Date.UTC(y, m + 1, 1) - 7 * 3600 * 1000).toISOString(),
    label: `${BULAN[m]} ${y}`,
  };
}

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const admin = getSupabaseAdmin();
  const { startIso, endIso } = jakartaDayBounds();
  const month = jakartaMonthBounds();

  const activeLead = "followup_status.eq.baru,followup_status.eq.dijadwalkan,followup_status.eq.dnd";
  const countOf = async (build: (q: any) => any) => {
    const { count } = await build(admin.from("leads").select("id", { count: "exact", head: true }));
    return count || 0;
  };

  const [
    leadTotal,
    leadBaruHariIni,
    leadBelumMembalas,
    leadUnscheduled,
    leadToday,
    leadOverdue,
    leadClosingBulan,
    ordersMonth,
    variants,
    activity,
  ] = await Promise.all([
    countOf((q) => q),
    countOf((q) => q.gte("created_at", startIso)),
    countOf((q) => q.is("do_not_contact", false).or("outcome.is.null,outcome.eq.no_reply")),
    countOf((q) => q.is("do_not_contact", false).is("next_followup_at", null).or(activeLead)),
    countOf((q) => q.is("do_not_contact", false).gte("next_followup_at", startIso).lt("next_followup_at", endIso).or(activeLead)),
    countOf((q) => q.is("do_not_contact", false).not("next_followup_at", "is", null).lt("next_followup_at", startIso).or(activeLead)),
    countOf((q) => q.eq("outcome", "bought").gte("last_contact_at", month.startIso).lt("last_contact_at", month.endIso)),
    admin.from("orders").select("id, total, status, created_at").gte("created_at", month.startIso).lt("created_at", month.endIso),
    admin.from("product_variants").select("stock"),
    admin.from("lead_activities").select("id, lead_id, action, note, created_at, actor").order("created_at", { ascending: false }).limit(6),
  ]);

  const orders = (ordersMonth.data || []) as any[];
  const valid = orders.filter((o) => String(o.status || "") !== "dibatalkan");
  const omsetBulan = valid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const hariIni = valid.filter((o) => o.created_at >= startIso && o.created_at < endIso);
  const omsetHariIni = hariIni.reduce((s, o) => s + (Number(o.total) || 0), 0);

  // Produk terlaris bulan ini (dari order yang tidak dibatalkan)
  let topProducts: { name: string; qty: number; total: number }[] = [];
  const validIds = valid.map((o) => o.id);
  if (validIds.length > 0) {
    const { data: items } = await admin
      .from("order_items")
      .select("product_name, qty, total, order_id")
      .in("order_id", validIds);
    const agg = new Map<string, { name: string; qty: number; total: number }>();
    for (const it of (items || []) as any[]) {
      const key = it.product_name || "(tanpa nama)";
      const cur = agg.get(key) || { name: key, qty: 0, total: 0 };
      cur.qty += Number(it.qty) || 0;
      cur.total += Number(it.total) || 0;
      agg.set(key, cur);
    }
    topProducts = Array.from(agg.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }

  const vrows = (variants.data || []) as any[];
  const sumStock = (s: any) =>
    s && typeof s === "object" ? Object.values(s).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0;
  const totalUnit = vrows.reduce((s, v) => s + sumStock(v.stock), 0);
  const varianHabis = vrows.filter((v) => sumStock(v.stock) === 0).length;
  const varianMenipis = vrows.filter((v) => { const n = sumStock(v.stock); return n > 0 && n <= 5; }).length;

  // Tugas follow-up hari ini (untuk daftar cepat)
  const { data: todayTasks } = await admin
    .from("leads")
    .select("id, kontak, produk, pic, sumber, next_followup_at, outcome")
    .is("do_not_contact", false)
    .gte("next_followup_at", startIso)
    .lt("next_followup_at", endIso)
    .or(activeLead)
    .order("next_followup_at", { ascending: true })
    .limit(6);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    hariIni: { startIso, endIso },
    bulan: month.label,
    leads: {
      total: leadTotal,
      baruHariIni: leadBaruHariIni,
      belumMembalas: leadBelumMembalas,
      perluDijadwalkan: leadUnscheduled,
      followupHariIni: leadToday,
      terlambat: leadOverdue,
      closingBulanIni: leadClosingBulan,
    },
    penjualan: {
      omsetHariIni,
      orderHariIni: hariIni.length,
      omsetBulanIni: omsetBulan,
      orderBulanIni: valid.length,
      orderBatal: orders.length - valid.length,
      aov: valid.length > 0 ? Math.round(omsetBulan / valid.length) : 0,
    },
    stok: { totalUnit, varianHabis, varianMenipis, totalVarian: vrows.length },
    topProducts,
    aktivitas: activity.data || [],
    todayTasks: todayTasks || [],
  });
}
