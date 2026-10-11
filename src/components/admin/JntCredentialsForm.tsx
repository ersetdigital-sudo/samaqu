"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/AdminToast";

interface FieldSpec {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

// Urut mengikuti kebutuhan integrasi: order (buat AWB), tariff (ongkir), track (cek resi).
const FIELDS: FieldSpec[] = [
  { key: "order_username", label: "Order Username", placeholder: "mis. WITHSAMAQU-DPK01C" },
  { key: "order_api_key", label: "Order API Key", placeholder: "API key dari J&T", secret: true },
  { key: "order_key", label: "Order Signature Key", placeholder: "Key tanda tangan create order", secret: true },
  { key: "tariff_key", label: "Tariff Signature Key", placeholder: "Key tanda tangan cek ongkir", secret: true },
  { key: "tariff_cus_name", label: "Tariff Customer Name", placeholder: "mis. WITHSAMAQU-DPK01C" },
  { key: "track_username", label: "Tracking Username", placeholder: "Username cek resi" },
  { key: "track_password", label: "Tracking Password", placeholder: "Password cek resi", secret: true },
  { key: "company_id", label: "Company ID", placeholder: "eccompanyid untuk cek resi" },
];

export default function JntCredentialsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [env, setEnv] = useState<"testing" | "production">("testing");
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [tableReady, setTableReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` };
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/jnt-settings", { headers: await authHeaders() });
        const data = await res.json();
        if (data.tableReady === false) setTableReady(false);
        if (data.env === "testing" || data.env === "production") setEnv(data.env);
        setConfigured(data.configured || {});
      } catch (e) {
        console.error("[ADMIN] Gagal memuat kredensial J&T:", e);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/jnt-settings", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ ...values, env }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kredensial J&T");

      const saved = Object.entries(values)
        .filter(([, value]) => value.trim())
        .map(([key]) => [key, true] as const);
      setConfigured((prev) => ({ ...prev, ...Object.fromEntries(saved) }));
      setValues({});
      setShowKey({});
      toast.showToast("success", "Kredensial J&T disimpan");
    } catch (e) {
      console.error("[ADMIN] Gagal menyimpan kredensial J&T:", e);
      toast.showToast("error", e instanceof Error ? e.message : "Gagal menyimpan kredensial J&T");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="card p-6 max-w-2xl">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} />
      </div>
    );
  }

  const hasInput = Object.values(values).some((value) => value.trim());

  return (
    <div className="card p-6 max-w-2xl space-y-4">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--espresso)" }}>Kredensial J&T Express</h3>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Dipakai untuk hitung ongkir, buat AWB, dan cek resi J&T. Isi hanya field yang mau diubah — field
          yang dikosongkan tetap memakai nilai tersimpan (atau environment variable).
        </p>
      </div>

      {!tableReady && (
        <div className="flex gap-2 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(231,76,60,.06)", color: "#a33" }}>
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Tabel <code>jnt_settings</code> belum ada. Jalankan <code>supabase/jnt-settings.sql</code> di SQL
            Editor Supabase dulu supaya kredensial bisa disimpan.
          </span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Environment J&T</label>
        <div className="flex gap-3">
          {([
            { value: "testing" as const, label: "Testing", desc: "Sandbox / demo J&T" },
            { value: "production" as const, label: "Production", desc: "Server J&T asli" },
          ]).map((opt) => (
            <label key={opt.value} className="flex-1 flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all" style={{ border: `1.5px solid ${env === opt.value ? "var(--gold)" : "rgba(64,50,37,.15)"}`, background: env === opt.value ? "rgba(181,140,74,.04)" : "white" }}>
              <input type="radio" name="jnt_env" checked={env === opt.value} onChange={() => setEnv(opt.value)} className="sr-only" />
              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: `2px solid ${env === opt.value ? "var(--gold)" : "var(--text-muted)"}`, background: env === opt.value ? "var(--gold)" : "transparent" }}>
                {env === opt.value && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--espresso)" }}>{opt.label}</span>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {field.label}
              {configured[field.key] && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(39,174,96,.12)", color: "#1e8e4f" }}>
                  tersimpan
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={field.secret && !showKey[field.key] ? "password" : "text"}
                value={values[field.key] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full rounded-xl px-4 py-2.5 pr-10 bg-white text-sm outline-none font-mono"
                style={{ border: "1px solid rgba(64,50,37,.1)" }}
                placeholder={configured[field.key] ? "•••••• isi untuk mengganti" : field.placeholder}
              />
              {field.secret && (
                <button type="button" onClick={() => setShowKey((prev) => ({ ...prev, [field.key]: !prev[field.key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {showKey[field.key] ? "🙈" : "👁️"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving || !hasInput || !tableReady} className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}>
          {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null} Simpan Kredensial
        </button>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Nilai yang disimpan tidak bisa ditampilkan lagi — disimpan di tabel khusus yang hanya bisa dibaca server.
        </p>
      </div>
    </div>
  );
}
