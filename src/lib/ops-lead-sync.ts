import type { SupabaseClient } from "@supabase/supabase-js";
import { isActiveTask, normalizeKontak } from "@/lib/ops-followup";

/**
 * Order baru → **"tandai closing kalau cocok"** (keputusan pemilik).
 *
 * Order TIDAK membuat lead baru — pusat data pelanggan ada di modul Pelanggan
 * (`buildCustomerDirectory`). Kalau nomor order cocok dengan lead yang **masih aktif**,
 * lead itu ditandai Closing/Beli + dicatat aktivitasnya, supaya tidak lagi dikejar sebagai
 * prospek di Follow-up Center. Lead terminal / tak ada yang cocok → tidak diubah.
 *
 * Idempoten: lead yang `note_followup`-nya sudah memuat nomor order ini dilewati.
 */

export interface OrderLeadSyncInput {
  whatsapp?: string | null;
  orderNumber: string;
  total?: number | null;
}

export interface OrderLeadSyncResult {
  matched: boolean;
  updated: boolean;
  leadId?: string;
}

export async function markLeadBoughtForOrder(
  admin: SupabaseClient,
  input: OrderLeadSyncInput
): Promise<OrderLeadSyncResult> {
  const target = normalizeKontak(input.whatsapp);
  if (!target) return { matched: false, updated: false };

  // Cari lead yang kontaknya cocok (normalisasi: 08xx = 628xx = 8xx, @user = user).
  // Tabel `leads` kecil (ratusan baris) → satu query + scan di aplikasi.
  const { data, error } = await admin
    .from("leads")
    .select("id, kontak, outcome, followup_status, do_not_contact, nominal, note_followup")
    .limit(2000);
  if (error) {
    console.error("[ORDER-LEAD] Gagal membaca leads:", error.message);
    return { matched: false, updated: false };
  }

  const lead = (data || []).find((l) => normalizeKontak((l as { kontak?: string }).kontak) === target);
  if (!lead) return { matched: false, updated: false };

  const l = lead as {
    id: string;
    followup_status?: string | null;
    do_not_contact?: boolean | null;
    outcome?: string | null;
    nominal?: number | null;
    note_followup?: string | null;
  };

  // Sudah pernah ditandai untuk order ini → jangan diulang (idempoten).
  if ((l.note_followup || "").includes(input.orderNumber)) return { matched: true, updated: false };

  // Hanya tandai lead yang MASIH AKTIF — lead terminal (selesai/lost/dnd) tidak diubah.
  if (!isActiveTask(l)) return { matched: true, updated: false };

  const nowIso = new Date().toISOString();
  const { error: updateError } = await admin
    .from("leads")
    .update({
      status: "closing",
      outcome: "buy",
      followup_status: "selesai",
      last_contact_at: nowIso,
      note_followup: `Order ${input.orderNumber}`,
      nominal: Number(l.nominal) > 0 ? l.nominal : Number(input.total) || 0,
      updated_at: nowIso,
    })
    .eq("id", l.id);

  if (updateError) {
    console.error("[ORDER-LEAD] Gagal menandai lead closing:", updateError.message);
    return { matched: true, updated: false };
  }

  const { error: actError } = await admin.from("lead_activities").insert({
    lead_id: l.id,
    actor: "system",
    action: "order_created",
    note: `Order ${input.orderNumber}${input.total ? ` · Rp ${Number(input.total).toLocaleString("id-ID")}` : ""}`,
  });
  if (actError) console.error("[ORDER-LEAD] Gagal mencatat aktivitas:", actError.message);

  return { matched: true, updated: true, leadId: l.id };
}
