import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { buildLeadsReportPdf, reportFileName, loadReportFonts, type LeadRow } from "@/lib/leads-report-pdf";

/**
 * GET /api/ops/leads/report?bulan=YYYY-MM
 *
 * Membuat PDF "Laporan Leads dan Closing" untuk satu bulan. Hanya membaca data
 * (tidak menulis apa pun ke database) dan dijaga autentikasi ops seperti route /api/ops/*
 * lainnya, serta tidak boleh di-cache publik.
 *
 * Angka diambil lewat query yang sama dengan halaman Laporan Leads (tabel `leads`,
 * filter `tanggal`, urut `tanggal` + `jam`, paging per 1000) supaya totalnya identik.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;

function shiftMonth(value: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value || "");
  const now = new Date();
  const y = m ? Number(m[1]) : now.getFullYear();
  const mi = m ? Number(m[2]) - 1 : now.getMonth();
  const d = new Date(Date.UTC(y, mi + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const sp = new URL(req.url).searchParams;
  const raw = sp.get("bulan") || "";
  const bulan = /^\d{4}-\d{2}$/.test(raw) ? raw : shiftMonth("", 0);

  const [y, mm] = bulan.split("-").map(Number);
  const start = `${bulan}-01`;
  const lastDay = new Date(Date.UTC(y, mm, 0)).getUTCDate();
  const end = `${bulan}-${String(lastDay).padStart(2, "0")}`;

  try {
    const admin = getSupabaseAdmin();
    const rows: LeadRow[] = [];
    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const { data, error } = await admin
        .from("leads")
        .select("tanggal, sumber, status, nominal")
        .gte("tanggal", start)
        .lte("tanggal", end)
        .order("tanggal", { ascending: true })
        .order("jam", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const batch = (data as LeadRow[]) || [];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }

    let fonts;
    try {
      fonts = loadReportFonts();
    } catch (fontErr) {
      console.error("[OPS] Font laporan tidak terbaca:", fontErr);
      fonts = undefined;
    }

    const report = await buildLeadsReportPdf({ month: bulan, leads: rows, fonts });

    return new NextResponse(Buffer.from(report.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportFileName(report.summary)}"`,
        "Cache-Control": "no-store, private, max-age=0",
        "X-Report-Pages": String(report.pageCount),
      },
    });
  } catch (err: any) {
    console.error("[OPS] Gagal membuat laporan leads:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal membuat laporan PDF" },
      { status: 500, headers: { "Cache-Control": "no-store, private, max-age=0" } }
    );
  }
}
