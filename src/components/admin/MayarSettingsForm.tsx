"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/AdminToast";
import { SettingsCard, Field } from "@/components/admin/SettingsCard";

/**
 * Kartu pengaturan pembayaran Mayar (panel Pengaturan admin).
 *
 * API key & webhook token disimpan di tabel `mayar_settings` yang TANPA policy RLS, jadi semua
 * lewat `/api/admin/mayar-settings` (hanya admin). Kredensial tidak pernah dikirim balik ke
 * browser — hanya status terisi + sebagian disamarkan.
 */
export default function MayarSettingsForm() {
  const toast = useToast();

  const [enabled, setEnabled] = useState(false);
  const [env, setEnv] = useState<"sandbox" | "production">("sandbox");
  const [apiKey, setApiKey] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [apiKeyPreview, setApiKeyPreview] = useState("");
  const [webhookTokenPreview, setWebhookTokenPreview] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [tableReady, setTableReady] = useState(true);
  const [original, setOriginal] = useState({ enabled: false, env: "sandbox" as "sandbox" | "production" });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` };
  }

  async function load() {
    const res = await fetch("/api/admin/mayar-settings", { headers: await authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Gagal memuat pengaturan Mayar");
    setTableReady(json.tableReady !== false);
    setEnabled(json.enabled === true);
    setEnv(json.env === "production" ? "production" : "sandbox");
    setApiKeyPreview(json.apiKeyPreview || "");
    setWebhookTokenPreview(json.webhookTokenPreview || "");
    setWebhookUrl(json.webhookUrl || "");
    setOriginal({ enabled: json.enabled === true, env: json.env === "production" ? "production" : "sandbox" });
  }

  useEffect(() => {
    load()
      .catch((e) => console.error("[ADMIN] Gagal memuat pengaturan Mayar:", e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = enabled !== original.enabled || env !== original.env || !!apiKey.trim() || !!webhookToken.trim();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/mayar-settings", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ enabled, env, apiKey, webhookToken }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.showToast("error", json.error || "Gagal menyimpan pengaturan Mayar");
        return;
      }
      toast.showToast("success", "Pengaturan pembayaran Mayar disimpan");
      setApiKey("");
      setWebhookToken("");
      setEditing(false);
      await load();
    } catch (e) {
      console.error("[ADMIN] Gagal menyimpan pengaturan Mayar:", e);
      toast.showToast("error", "Gagal menyimpan pengaturan Mayar");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEnabled(original.enabled);
    setEnv(original.env);
    setApiKey("");
    setWebhookToken("");
    setEditing(false);
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/mayar-settings", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ action: "test" }),
      });
      const json = await res.json();
      if (json.ok) toast.showToast("success", `API key Mayar valid (${json.env}).`);
      else toast.showToast("error", json.error || "API key Mayar tidak valid.");
    } catch {
      toast.showToast("error", "Gagal menghubungi Mayar.");
    } finally {
      setTesting(false);
    }
  }

  async function copyWebhookUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.showToast("success", "URL webhook disalin");
    } catch {
      toast.showToast("error", "Clipboard diblokir browser");
    }
  }

  return (
    <SettingsCard
      title="Pembayaran Online (Mayar)"
      description="Aktifkan pembayaran otomatis lewat Mayar (QRIS, VA, e-wallet). Ada 2 environment: sandbox untuk uji coba, production untuk pembayaran asli."
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
      canSave={dirty}
    >
      {!tableReady && (
        <p className="text-xs" style={{ color: "#b45309" }}>
          Tabel <code>mayar_settings</code> belum ada. Jalankan <code>supabase/mayar.sql</code> di SQL Editor
          Supabase, lalu muat ulang halaman ini.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--gold)" }} />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-semibold" style={{ color: "var(--espresso)" }}>Status</label>
            {editing ? (
              <label className="inline-flex items-center gap-2 mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Aktifkan pembayaran online
              </label>
            ) : (
              <p className="mt-1 text-sm font-medium" style={{ color: enabled ? "#047857" : "var(--text-muted)" }}>
                {enabled ? "Aktif" : "Nonaktif"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold" style={{ color: "var(--espresso)" }}>Environment</label>
            {editing ? (
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value === "production" ? "production" : "sandbox")}
                className="mt-1.5 w-full rounded-xl px-4 py-2.5 bg-white text-sm outline-none"
                style={{ border: "1px solid #e4e4e7" }}
              >
                <option value="sandbox">Sandbox (api.mayar.io — uji coba)</option>
                <option value="production">Production (api.mayar.id — uang asli)</option>
              </select>
            ) : (
              <p className="mt-1 text-sm font-medium" style={{ color: "var(--fg)" }}>
                {env === "production" ? "Production (uang asli)" : "Sandbox (uji coba)"}
              </p>
            )}
            {editing && (
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                API key sandbox hanya jalan di api.mayar.io, key production hanya di api.mayar.id.
              </p>
            )}
          </div>

          <Field
            label="API Key Mayar"
            value={editing ? apiKey : apiKeyPreview}
            editing={editing}
            onChange={setApiKey}
            placeholder="Tempel API key (Read & Write)"
            hint={editing ? "Biarkan kosong kalau tidak ingin mengganti key yang tersimpan." : undefined}
            mono
          />

          <Field
            label="Webhook Token"
            value={editing ? webhookToken : webhookTokenPreview}
            editing={editing}
            onChange={setWebhookToken}
            placeholder="Webhook Token dari dashboard Mayar"
            hint={editing ? "Biarkan kosong kalau tidak ingin menggantinya." : undefined}
            mono
          />

          <div>
            <label className="block text-sm font-semibold" style={{ color: "var(--espresso)" }}>URL Webhook</label>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="flex-1 text-xs font-mono break-all" style={{ color: "var(--fg)" }}>{webhookUrl || "—"}</p>
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
                style={{ border: "1px solid #d4d4d8", color: "var(--espresso)" }}
              >
                <Copy size={13} /> Salin
              </button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              Daftarkan URL ini di dashboard Mayar → Integration → Webhook (token ikut di URL supaya
              verifikasi tetap jalan).
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50"
              style={{ border: "1px solid #d4d4d8", color: "var(--espresso)" }}
            >
              {testing ? <Loader2 size={13} className="animate-spin" /> : null}
              Tes koneksi Mayar
            </button>
          </div>
        </>
      )}
    </SettingsCard>
  );
}
