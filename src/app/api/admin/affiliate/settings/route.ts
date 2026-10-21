import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { getAffiliateSettings } from "@/lib/affiliate/settings";

/**
 * Admin → Affiliate → Pengaturan Komisi.
 *
 * Semua nilai di sini dipakai BENAR-BENAR oleh mesin komisi di server
 * (`src/lib/affiliate/commission.ts` + `settings.ts`) — bukan sekadar tampilan.
 */

export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const supabase = getSupabaseAdmin();
  const settings = await getAffiliateSettings(supabase);
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

  if (body.commission_mode !== undefined) {
    patch.commission_mode = body.commission_mode === "fixed" ? "fixed" : "percent";
  }

  if (body.commission_percent !== undefined) {
    const percent = Number(body.commission_percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return NextResponse.json({ error: "Persentase komisi harus antara 0 dan 100." }, { status: 400 });
    }
    patch.commission_percent = percent;
  }

  if (body.fixed_commission !== undefined) {
    if (body.fixed_commission === null || body.fixed_commission === "") {
      patch.fixed_commission = null;
    } else {
      const fixed = Number(body.fixed_commission);
      if (!Number.isFinite(fixed) || fixed < 0) {
        return NextResponse.json({ error: "Komisi nominal tetap tidak boleh negatif." }, { status: 400 });
      }
      patch.fixed_commission = Math.round(fixed);
    }
  }

  if (body.product_commission !== undefined) {
    const source = (body.product_commission || {}) as Record<string, unknown>;
    const cleaned: Record<string, number> = {};
    for (const [key, value] of Object.entries(source)) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) continue;
      cleaned[String(key).trim()] = n;
    }
    patch.product_commission = cleaned;
  }

  if (body.attribution_model !== undefined) {
    patch.attribution_model = body.attribution_model === "first_click" ? "first_click" : "last_click";
  }

  const intFields: [string, string, number][] = [
    ["referral_validity_days", "Masa berlaku referral", 0],
    ["validation_days", "Masa validasi komisi", 0],
    ["min_withdrawal", "Minimum pencairan", 0],
    ["withdrawal_fee_bank", "Biaya admin transfer bank", 0],
    ["withdrawal_fee_ewallet", "Biaya admin e-wallet", 0],
  ];
  for (const [key, label, min] of intFields) {
    if (body[key] === undefined) continue;
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < min) {
      return NextResponse.json({ error: `${label} tidak valid.` }, { status: 400 });
    }
    patch[key] = Math.round(value);
  }

  const boolFields = [
    "require_paid",
    "require_completed",
    "reversal_on_cancel",
    "reversal_on_return",
  ];
  for (const key of boolFields) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "boolean") {
      return NextResponse.json({ error: `Nilai ${key} tidak valid.` }, { status: 400 });
    }
    patch[key] = body[key];
  }

  const { data, error } = await supabase
    .from("affiliate_settings")
    .update(patch)
    .eq("id", 1)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[affiliate-admin] Gagal menyimpan pengaturan:", error.message);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan." }, { status: 500 });
  }

  await supabase.from("affiliate_activity_log").insert({
    affiliate_id: null,
    actor_type: "admin",
    action: "update_settings",
    note: "Pengaturan komisi affiliate diperbarui.",
  });

  const settings = await getAffiliateSettings(supabase);
  return NextResponse.json({ settings: data ?? settings });
}
