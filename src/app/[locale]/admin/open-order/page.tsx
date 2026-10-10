"use client";

/**
 * Menu admin "Open Order" — atur periode dan status buka/tutup Open Order Samaqu.
 * Nilainya tersimpan di baris tunggal `store_settings` (id = 1): `open_order_period`
 * (teks periode, mis. "8-15 Agustus 2026") dan `open_order_active` (status buka/tutup).
 * Halaman publik /open-order membaca keduanya lewat `useStoreSettings()`.
 *
 * Kolomnya dibuat oleh supabase/open-order-settings.sql (dijalankan manual di Supabase SQL
 * editor — tidak ada jalur DDL dari sandbox); selama belum dijalankan halaman ini menampilkan
 * peringatan dan simpan tidak akan berpengaruh.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/AdminToast";
import { OPEN_ORDER_PERIOD } from "@/lib/open-order-config";
import { supabase } from "@/lib/supabase";

export default function AdminOpenOrderPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsSql, setNeedsSql] = useState(false);
  const [active, setActive] = useState(true);
  const [period, setPeriod] = useState(OPEN_ORDER_PERIOD);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("store_settings")
      .select("open_order_period, open_order_active")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          // Paling sering: kolom belum ada karena SQL-nya belum dijalankan.
          setNeedsSql(true);
        } else if (data) {
          setPeriod(data.open_order_period ?? OPEN_ORDER_PERIOD);
          setActive(data.open_order_active !== false);
        }
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("store_settings").upsert({
      id: 1,
      open_order_period: period.trim() || null,
      open_order_active: active,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.showToast("error", error.message);
      return;
    }
    toast.showToast("success", "Pengaturan Open Order disimpan");
  }

  return (
    <AdminShell>
      <section className="p-5 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--espresso)" }}>Open Order</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Atur periode dan status Open Order Samaqu.
          </p>
        </div>

        {needsSql && (
          <div className="rounded-xl p-4 mb-5 flex gap-3" style={{ background: "#fdf6e7", border: "1px solid rgba(181,140,74,.28)" }}>
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--gold-deep)" }} />
            <p className="text-[13px] leading-relaxed" style={{ color: "#7a5c22" }}>
              Kolom <code>open_order_period</code> / <code>open_order_active</code> belum ada di Supabase.
              Jalankan <code>supabase/open-order-settings.sql</code> di SQL editor Supabase, lalu muat ulang halaman ini.
            </p>
          </div>
        )}

        <div className="rounded-2xl p-5 lg:p-6" style={{ background: "#fffdfb", border: "1px solid rgba(64,50,37,.06)", boxShadow: "0 1px 3px rgba(64,50,37,.04)" }}>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 size={22} className="animate-spin" style={{ color: "var(--gold)" }} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status buka / tutup */}
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>Status Open Order</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {active
                      ? "Dibuka — pelanggan bisa mengirim pesanan lewat /open-order."
                      : "Ditutup — /open-order hanya menampilkan pesan bahwa periode ditutup."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  aria-label="Buka atau tutup Open Order"
                  onClick={() => setActive((v) => !v)}
                  className="relative shrink-0 w-14 h-8 rounded-full transition-colors duration-200"
                  style={{ background: active ? "var(--gold)" : "#ded3c4" }}
                >
                  <span
                    className="absolute top-1 h-6 w-6 rounded-full bg-white transition-all duration-200"
                    style={{ left: active ? "1.75rem" : "0.25rem", boxShadow: "0 1px 3px rgba(64,50,37,.25)" }}
                  />
                </button>
              </div>

              {/* Periode */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--espresso)" }}>
                  Periode Open Order
                </label>
                <input
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="8-15 Agustus 2026"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "#fff", border: "1px solid rgba(64,50,37,.12)", color: "var(--espresso)" }}
                />
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Tampil di halaman /open-order sebagai &quot;Periode {period || "…"}&quot;.
                </p>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, var(--gold), #96742f)" }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Simpan
                </button>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Status saat ini: {active ? "Dibuka" : "Ditutup"}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
