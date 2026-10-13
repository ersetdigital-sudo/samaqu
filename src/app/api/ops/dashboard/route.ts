import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { jakartaDayBounds, BIZ_OFFSET_MS } from "@/lib/ops-followup";
import { resolveStock } from "@/lib/ops-stock";

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
  // Awal jendela "7 hari terakhir" (WIB): hari ini + 6 hari ke belakang.
  const trendStartIso = new Date(new Date(startIso).getTime() - 6 * 86400000).toISOString();

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
    ordersTrend,
  ] = await Promise.all([
    countOf((q) => q),
    countOf((q) => q.gte("created_at", startIso)),
    countOf((q) => q.is("do_not_contact", false).or("outcome.is.null,outcome.eq.no_reply")),
    countOf((q) => q.is("do_not_contact", false).is("next_followup_at", null).or(activeLead)),
    countOf((q) => q.is("do_not_contact", false).gte("next_followup_at", startIso).lt("next_followup_at", endIso).or(activeLead)),
    countOf((q) => q.is("do_not_contact", false).not("next_followup_at", "is", null).lt("next_followup_at", startIso).or(activeLead)),
    countOf((q) => q.eq("outcome", "bought").gte("last_contact_at", month.startIso).lt("last_contact_at", month.endIso)),
    admin.from("orders").select("id, total, status, created_at").gte("created_at", month.startIso).lt("created_at", month.endIso),
    admin.from("product_variants").select("product_id, stock, base_product_id"),
    admin.from("lead_activities").select("id, lead_id, action, note, created_at, actor").order("created_at", { ascending: false }).limit(6),
    // Order 7 hari terakhir (WIB) — sumber grafik `trendHarian` (batas bulan ≠ jendela 7 hari).
    admin.from("orders").select("id, total, status, created_at").gte("created_at", trendStartIso).lt("created_at", endIso),
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
  const skuByProduct = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: prods } = await admin.from("products").select("id, hpp, sku").in("id", productIds);
    for (const p of (prods || []) as any[]) {
      hppByProduct.set(String(p.id), Number(p.hpp) || 0);
      const sku = String(p.sku ?? "").trim();
      if (sku) skuByProduct.set(String(p.id), sku);
    }
  }

  let hpp = 0;
  const agg = new Map<string, { name: string; qty: number; total: number; productId: string }>();
  for (const it of items) {
    const qty = Number(it.quantity ?? it.qty) || 0;
    const price = Number(it.price) || 0;
    const lineTotal = Number(it.total) || qty * price;

    const perLineHpp = Number(it.hpp);
    const unitHpp = Number.isFinite(perLineHpp) && perLineHpp > 0 ? perLineHpp : hppByProduct.get(String(it.product_id)) || 0;
    hpp += unitHpp * qty;

    const key = it.product_name || "(tanpa nama)";
    const cur = agg.get(key) || { name: key, qty: 0, total: 0, productId: "" };
    cur.qty += qty;
    cur.total += lineTotal;
    if (!cur.productId && it.product_id) cur.productId = String(it.product_id);
    agg.set(key, cur);
  }

  // SKU di-join dari `products.sku` lewat product_id (kosong → "-").
  const topProducts = Array.from(agg.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map((p) => ({ name: p.name, qty: p.qty, total: p.total, sku: skuByProduct.get(p.productId) || "-" }));

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

  /* ── Tren 7 hari terakhir (WIB, termasuk hari ini) — dipakai grafik dashboard ──
     Jendela 7 hari tidak selalu berada di dalam bulan terpilih (mis. awal bulan),
     jadi dihitung dari query `ordersTrend` sendiri. Urut paling lama → hari ini. */
  const trendValid = ((ordersTrend.data || []) as any[]).filter((o) => String(o.status || "") !== "dibatalkan");
  const trendDailyMap = new Map<string, number>();
  for (const o of trendValid) {
    const created = new Date(o.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const wibDay = new Date(created.getTime() + BIZ_OFFSET_MS).toISOString().slice(0, 10);
    trendDailyMap.set(wibDay, (trendDailyMap.get(wibDay) || 0) + (Number(o.total) || 0));
  }

  const trendHarian: { tanggal: string; label: string; omset: number }[] = [];
  for (let back = 6; back >= 0; back--) {
    const wib = new Date(new Date(startIso).getTime() - back * 86400000 + BIZ_OFFSET_MS);
    const tanggal = wib.toISOString().slice(0, 10);
    const label = `${String(wib.getUTCDate()).padStart(2, "0")}/${String(wib.getUTCMonth() + 1).padStart(2, "0")}`;
    trendHarian.push({ tanggal, label, omset: trendDailyMap.get(tanggal) || 0 });
  }

  /* ── Stok ──
     Memakai resolver yang sama dengan /api/ops/products & /api/ops/product-variants:
     produk series yang menumpang stok produk basisnya tidak lagi dihitung "habis". */
  const { effectiveTotal } = resolveStock((variants.data || []) as any);
  const totalPerProduk = Object.values(effectiveTotal);
  const totalUnit = totalPerProduk.reduce((a, b) => a + b, 0);
  const varianHabis = totalPerProduk.filter((n) => n === 0).length;
  const varianMenipis = totalPerProduk.filter((n) => n > 0 && n <= 5).length;

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
    trendHarian,
    leads: {
      total: leadTotal,
      baruHariIni: leadBaruHariIni,
      belumMembalas: leadBelumMembalas,
      perluDijadwalkan: leadUnscheduled,
      followupHariIni: leadToday,
      terlambat: leadOverdue,
      closingBulanIni: leadClosingBulan,
    },
    stok: { totalUnit, varianHabis, varianMenipis, totalVarian: totalPerProduk.length },
    topProducts,
    aktivitas: activity.data || [],
    todayTasks: todayTasks || [],
  });
}
