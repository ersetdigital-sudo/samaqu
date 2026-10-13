import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { jakartaDayBounds, BIZ_OFFSET_MS } from "@/lib/ops-followup";

/**
 * Dashboard ops — ringkasan lintas modul dalam satu request.
 * Semua angka dihitung dari database (tidak ada angka statis) dan memakai batas hari/bulan WIB.
 *
 * Ringkasan penjualan bisa difilter per bulan lewat query `?month=YYYY-MM`
 * (default: bulan WIB sekarang) supaya pemilih bulan di UI tahu posisinya.
 */

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/**
 * Batas awal/akhir bulan (WIB) untuk parameter `YYYY-MM`.
 * Parameter tidak valid → diabaikan dan dipakai bulan WIB sekarang.
 */
function jakartaMonthBounds(monthParam?: string | null) {
  const wib = new Date(Date.now() + BIZ_OFFSET_MS);
  let year = wib.getUTCFullYear();
  let monthIdx = wib.getUTCMonth(); // 0-11

  const m = /^(\d{4})-(\d{2})$/.exec((monthParam || "").trim());
  if (m) {
    const y = Number(m[1]);
    const mi = Number(m[2]) - 1;
    if (Number.isFinite(y) && y >= 2000 && y <= 2100 && mi >= 0 && mi <= 11) {
      year = y;
      monthIdx = mi;
    }
  }

  const startMs = Date.UTC(year, monthIdx, 1) - BIZ_OFFSET_MS;
  const endMs = Date.UTC(year, monthIdx + 1, 1) - BIZ_OFFSET_MS;
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const value = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;

  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    label: `${BULAN[monthIdx]} ${year}`,
    value,
    daysInMonth,
  };
}

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const admin = getSupabaseAdmin();
  const { startIso, endIso } = jakartaDayBounds();
  const month = jakartaMonthBounds(new URL(req.url).searchParams.get("month"));

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
  // Order valid = status bukan "dibatalkan" (selesai/diproses/pending ikut dihitung).
  const valid = orders.filter((o) => String(o.status || "") !== "dibatalkan");
  const omset = valid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const transaksi = valid.length;
  const rataRata = transaksi > 0 ? Math.round(omset / transaksi) : 0;

  /* ── Baris order_items bulan terpilih (dipakai topProducts + HPP) ── */
  // `select("*")` dipakai supaya aman kalau skema order_items berbeda antar
  // environment (mis. ada/tidak ada kolom `quantity`/`qty`/`total`/`hpp`).
  let items: any[] = [];
  const validIds = valid.map((o) => o.id);
  if (validIds.length > 0) {
    const { data } = await admin.from("order_items").select("*").in("order_id", validIds);
    items = (data || []) as any[];
  }

  // ── Sumber HPP ──
  // Skema order_items tidak punya kolom `hpp`. Kalau runtime menyediakannya
  // (per baris) nilainya dipakai; kalau kosong, jatuh ke `products.hpp` — kolom
  // HPP per produk yang juga dipakai halaman Master Produk (`/api/ops/product-variants`
  // & `/api/ops/transactions`). Kalau keduanya kosong → HPP = 0 (apa adanya,
  // tidak dikarang).
  const productIds = Array.from(new Set(items.map((it) => it.product_id).filter(Boolean))) as string[];
  const hppByProduct = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: prods } = await admin.from("products").select("id, hpp").in("id", productIds);
    for (const p of (prods || []) as any[]) hppByProduct.set(String(p.id), Number(p.hpp) || 0);
  }

  let hpp = 0;
  const agg = new Map<string, { name: string; qty: number; total: number }>();
  for (const it of items) {
    const qty = Number(it.quantity ?? it.qty) || 0;
    const price = Number(it.price) || 0;
    const lineTotal = Number(it.total) || qty * price;

    const perLineHpp = Number(it.hpp);
    const unitHpp = Number.isFinite(perLineHpp) && perLineHpp > 0 ? perLineHpp : hppByProduct.get(String(it.product_id)) || 0;
    hpp += unitHpp * qty;

    const key = it.product_name || "(tanpa nama)";
    const cur = agg.get(key) || { name: key, qty: 0, total: 0 };
    cur.qty += qty;
    cur.total += lineTotal;
    agg.set(key, cur);
  }

  const topProducts = Array.from(agg.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // BIAYA operasional & packing: belum ada modul Pengeluaran → 0.
  // (Menunggu modul Pengeluaran supaya netProfit tidak dikarang.)
  const biaya = 0;

  const netProfit = omset - hpp - biaya;
  const margin = omset > 0 ? Math.round((netProfit / omset) * 100) : 0;

  /* ── Tren penjualan harian (semua hari dalam bulan terpilih) ── */
  const dailyMap = new Map<string, number>();
  for (const o of valid) {
    const created = new Date(o.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const wibDay = new Date(created.getTime() + BIZ_OFFSET_MS).toISOString().slice(0, 10);
    dailyMap.set(wibDay, (dailyMap.get(wibDay) || 0) + (Number(o.total) || 0));
  }
  const trend: { tanggal: string; hari: string; omset: number }[] = [];
  for (let d = 1; d <= month.daysInMonth; d++) {
    const tanggal = `${month.value}-${String(d).padStart(2, "0")}`;
    trend.push({ tanggal, hari: String(d), omset: dailyMap.get(tanggal) || 0 });
  }

  /* ── Stok ── */
  const vrows = (variants.data || []) as any[];
  const sumStock = (s: any) =>
    s && typeof s === "object" ? Object.values(s).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0;
  const totalUnit = vrows.reduce((s, v) => s + sumStock(v.stock), 0);
  const varianHabis = vrows.filter((v) => sumStock(v.stock) === 0).length;
  const varianMenipis = vrows.filter((v) => { const n = sumStock(v.stock); return n > 0 && n <= 5; }).length;

  // Tugas follow-up hari ini (untuk daftar cepat) — berbasis "hari ini" WIB, bukan bulan terpilih.
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
    bulanLabel: month.label,
    bulanValue: month.value,
    ringkasan: {
      omset,
      hpp,
      biaya,
      netProfit,
      margin,
      transaksi,
      rataRata,
    },
    trend,
    leads: {
      total: leadTotal,
      baruHariIni: leadBaruHariIni,
      belumMembalas: leadBelumMembalas,
      perluDijadwalkan: leadUnscheduled,
      followupHariIni: leadToday,
      terlambat: leadOverdue,
      closingBulanIni: leadClosingBulan,
    },
    stok: { totalUnit, varianHabis, varianMenipis, totalVarian: vrows.length },
    topProducts,
    aktivitas: activity.data || [],
    todayTasks: todayTasks || [],
  });
}
