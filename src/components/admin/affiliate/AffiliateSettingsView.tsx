"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/components/AdminToast";
import { SettingsCard } from "@/components/admin/SettingsCard";
import { AdminPageHeader, ErrorBlock, LoadingBlock, adminFetch, money } from "./affiliate-admin-ui";

/**
 * Admin → Affiliate → Pengaturan Komisi.
 *
 * Pola kartu admin yang sudah dipakai di menu Pengaturan: default read-only
 * (nilai tampil sebagai teks) → klik **Edit** → isi form → **Simpan / Batal**.
 *
 * Semua nilai di sini dipakai BENAR-BENAR oleh mesin komisi di server.
 */

interface Settings {
  enabled: boolean;
  commission_mode: "percent" | "fixed";
  commission_percent: number;
  fixed_commission: number | null;
  product_commission: Record<string, number>;
  attribution_model: "first_click" | "last_click";
  referral_validity_days: number;
  require_paid: boolean;
  require_completed: boolean;
  validation_days: number;
  min_withdrawal: number;
  withdrawal_fee_bank: number;
  withdrawal_fee_ewallet: number;
  reversal_on_cancel: boolean;
  reversal_on_return: boolean;
}

type FormState = Omit<Settings, "product_commission"> & { product_commission: string };

function toForm(s: Settings): FormState {
  return {
    ...s,
    product_commission: Object.entries(s.product_commission || {})
      .map(([id, percent]) => `${id}: ${percent}`)
      .join("\n"),
  };
}

function parseProductRules(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [rawId, rawPercent] = trimmed.split(":");
    const id = (rawId || "").trim();
    const percent = Number((rawPercent || "").trim());
    if (!id || !Number.isFinite(percent) || percent < 0 || percent > 100) continue;
    out[id] = percent;
  }
  return out;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold" style={{ color: "var(--espresso)" }}>{label}</label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="mt-1.5 w-11 h-6 rounded-full relative transition-colors"
      style={{ background: value ? "#18181b" : "#d4d4d8" }}
      aria-pressed={value}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: value ? "22px" : "2px" }}
      />
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none"
      style={{ border: "1px solid #e4e4e7" }}
    />
  );
}

export default function AffiliateSettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [original, setOriginal] = useState<FormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const load = async () => {
    try {
      const json = await adminFetch<{ settings: Settings }>("/api/admin/affiliate/settings");
      setSettings(json.settings);
      const f = toForm(json.settings);
      setForm(f);
      setOriginal(f);
      setError("");
    } catch (e) {
      console.error("[ADMIN-AFFILIATE] Gagal memuat pengaturan:", e);
      setError(e instanceof Error ? e.message : "Gagal memuat pengaturan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const dirty = form && original ? JSON.stringify(form) !== JSON.stringify(original) : false;

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        fixed_commission: form.fixed_commission === null ? null : Number(form.fixed_commission),
        product_commission: parseProductRules(form.product_commission),
        commission_percent: Number(form.commission_percent),
        referral_validity_days: Number(form.referral_validity_days),
        validation_days: Number(form.validation_days),
        min_withdrawal: Number(form.min_withdrawal),
        withdrawal_fee_bank: Number(form.withdrawal_fee_bank),
        withdrawal_fee_ewallet: Number(form.withdrawal_fee_ewallet),
      };
      const json = await adminFetch<{ settings: Settings }>("/api/admin/affiliate/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const f = toForm(json.settings);
      setSettings(json.settings);
      setForm(f);
      setOriginal(f);
      setEditing(false);
      showToast("success", "Pengaturan komisi disimpan.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Pengaturan Komisi"
        sub="Aturan perhitungan komisi, atribusi referral, syarat pesanan, dan pencairan. Nilai di sini dipakai langsung oleh mesin komisi di server."
      />

      {error && <ErrorBlock message={error} />}

      {settings && !settings.enabled && (
        <div
          className="card p-4 flex items-start gap-2 text-sm"
          style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Program affiliate sedang dinonaktifkan. Pendaftaran baru & pengambilan tautan referral ditolak.</span>
        </div>
      )}

      {form && (
        <>
          <SettingsCard
            title="Status Program"
            description="Nyalakan atau matikan program affiliate."
            editing={editing}
            onEdit={() => setEditing(true)}
            onCancel={() => { setForm(original); setEditing(false); }}
            onSave={save}
            saving={saving}
            canSave={dirty}
          >
            <Row label="Program affiliate aktif" hint="Ketika nonaktif, pendaftaran baru dan pembuatan tautan referral ditolak.">
              {editing ? (
                <Toggle value={form.enabled} onChange={(v) => set("enabled", v)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>
                  {form.enabled ? "Aktif" : "Nonaktif"}
                </p>
              )}
            </Row>
          </SettingsCard>

          <SettingsCard
            title="Perhitungan Komisi"
            description="Persentase global, nominal tetap, dan aturan khusus per produk."
            editing={editing}
            onEdit={() => setEditing(true)}
            onCancel={() => { setForm(original); setEditing(false); }}
            onSave={save}
            saving={saving}
            canSave={dirty}
          >
            <Row label="Mode perhitungan">
              {editing ? (
                <select
                  value={form.commission_mode}
                  onChange={(e) => set("commission_mode", e.target.value as FormState["commission_mode"])}
                  className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none"
                  style={{ border: "1px solid #e4e4e7" }}
                >
                  <option value="percent">Persentase dari nilai produk</option>
                  <option value="fixed">Nominal tetap per pesanan</option>
                </select>
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>
                  {form.commission_mode === "percent" ? "Persentase dari nilai produk" : "Nominal tetap per pesanan"}
                </p>
              )}
            </Row>

            {form.commission_mode === "percent" ? (
              <Row label="Persentase komisi global (%)" hint="Nilai 0 = komisi belum ditetapkan. Berlaku untuk semua produk tanpa aturan khusus.">
                {editing ? (
                  <TextInput value={String(form.commission_percent)} onChange={(v) => set("commission_percent", Number(v.replace(/\D/g, "")) || 0)} placeholder="0" />
                ) : (
                  <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{form.commission_percent}%</p>
                )}
              </Row>
            ) : (
              <Row label="Komisi nominal tetap per pesanan (Rp)" hint="Nominal ini dibayar sekali per pesanan, bukan per item.">
                {editing ? (
                  <TextInput
                    value={String(form.fixed_commission ?? "")}
                    onChange={(v) => set("fixed_commission", v === "" ? null : Number(v.replace(/\D/g, "")) || 0)}
                    placeholder="0"
                  />
                ) : (
                  <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>
                    {form.fixed_commission ? money(form.fixed_commission) : "Belum diisi"}
                  </p>
                )}
              </Row>
            )}

            <Row label="Aturan komisi per produk" hint="Satu baris per produk: <id produk> : persen. Baris ini MENANG atas aturan global.">
              {editing ? (
                <textarea
                  value={form.product_commission}
                  onChange={(e) => set("product_commission", e.target.value)}
                  rows={4}
                  placeholder={"thobe-navy-bayati: 13\nkoko-sido: 10"}
                  className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none resize-none font-mono"
                  style={{ border: "1px solid #e4e4e7" }}
                />
              ) : (
                <p className="mt-1 text-sm font-medium whitespace-pre-wrap font-mono" style={{ color: "var(--fg)" }}>
                  {form.product_commission.trim() || "Belum ada aturan khusus per produk"}
                </p>
              )}
            </Row>
          </SettingsCard>

          <SettingsCard
            title="Atribusi Referral"
            description="Bagaimana kunjungan referral dikaitkan ke pesanan."
            editing={editing}
            onEdit={() => setEditing(true)}
            onCancel={() => { setForm(original); setEditing(false); }}
            onSave={save}
            saving={saving}
            canSave={dirty}
          >
            <Row label="Model atribusi" hint="Last click: klik terakhir yang menang. First click: klik pertama yang masih berlaku.">
              {editing ? (
                <select
                  value={form.attribution_model}
                  onChange={(e) => set("attribution_model", e.target.value as FormState["attribution_model"])}
                  className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none"
                  style={{ border: "1px solid #e4e4e7" }}
                >
                  <option value="last_click">Last click</option>
                  <option value="first_click">First click</option>
                </select>
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>
                  {form.attribution_model === "last_click" ? "Last click" : "First click"}
                </p>
              )}
            </Row>

            <Row label="Masa berlaku referral (hari)" hint="Klik yang lebih lama dari ini tidak lagi diatribusikan ke pesanan.">
              {editing ? (
                <TextInput value={String(form.referral_validity_days)} onChange={(v) => set("referral_validity_days", Number(v.replace(/\D/g, "")) || 0)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{form.referral_validity_days} hari</p>
              )}
            </Row>

            <Row label="Pesanan harus lunas" hint="Kalau aktif, komisi hanya dihitung setelah pembayaran terverifikasi.">
              {editing ? (
                <Toggle value={form.require_paid} onChange={(v) => set("require_paid", v)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{form.require_paid ? "Ya" : "Tidak"}</p>
              )}
            </Row>

            <Row label="Pesanan harus selesai" hint="Kalau aktif, komisi baru disetujui setelah pesanan berstatus selesai.">
              {editing ? (
                <Toggle value={form.require_completed} onChange={(v) => set("require_completed", v)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{form.require_completed ? "Ya" : "Tidak"}</p>
              )}
            </Row>

            <Row label="Masa validasi komisi (hari)" hint="Komisi menunggu selama masa ini sebelum masuk saldo tersedia.">
              {editing ? (
                <TextInput value={String(form.validation_days)} onChange={(v) => set("validation_days", Number(v.replace(/\D/g, "")) || 0)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{form.validation_days} hari</p>
              )}
            </Row>
          </SettingsCard>

          <SettingsCard
            title="Pencairan"
            description="Minimum pencairan, biaya admin, dan aturan pembatalan/retur."
            editing={editing}
            onEdit={() => setEditing(true)}
            onCancel={() => { setForm(original); setEditing(false); }}
            onSave={save}
            saving={saving}
            canSave={dirty}
          >
            <Row label="Minimum pencairan (Rp)" hint="Nilai 0 = belum ditetapkan, pencairan nominal berapa pun diproses.">
              {editing ? (
                <TextInput value={String(form.min_withdrawal)} onChange={(v) => set("min_withdrawal", Number(v.replace(/\D/g, "")) || 0)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>
                  {form.min_withdrawal ? money(form.min_withdrawal) : "Belum ditetapkan"}
                </p>
              )}
            </Row>

            <Row label="Biaya admin transfer bank (Rp)">
              {editing ? (
                <TextInput value={String(form.withdrawal_fee_bank)} onChange={(v) => set("withdrawal_fee_bank", Number(v.replace(/\D/g, "")) || 0)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{money(form.withdrawal_fee_bank)}</p>
              )}
            </Row>

            <Row label="Biaya admin e-wallet (Rp)">
              {editing ? (
                <TextInput value={String(form.withdrawal_fee_ewallet)} onChange={(v) => set("withdrawal_fee_ewallet", Number(v.replace(/\D/g, "")) || 0)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{money(form.withdrawal_fee_ewallet)}</p>
              )}
            </Row>

            <Row label="Pembatalan pesanan membatalkan komisi" hint="Kalau aktif, pesanan yang dibatalkan menyebabkan komisi ditolak (riwayat tetap tersimpan).">
              {editing ? (
                <Toggle value={form.reversal_on_cancel} onChange={(v) => set("reversal_on_cancel", v)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{form.reversal_on_cancel ? "Ya" : "Tidak"}</p>
              )}
            </Row>

            <Row label="Retur produk membatalkan komisi">
              {editing ? (
                <Toggle value={form.reversal_on_return} onChange={(v) => set("reversal_on_return", v)} />
              ) : (
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>{form.reversal_on_return ? "Ya" : "Tidak"}</p>
              )}
            </Row>
          </SettingsCard>
        </>
      )}
    </div>
  );
}
