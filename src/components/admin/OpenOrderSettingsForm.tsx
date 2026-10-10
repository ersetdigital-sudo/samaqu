"use client";

/**
 * Pengaturan Open Order (menu admin "Open Order") — isi halaman /admin/open-order dan
 * /id/admin/open-order.
 *
 * Admin memilih **tanggal mulai + tanggal tutup** dan **series yang dibuka**. Status buka/tutup
 * tidak lagi diatur manual: dihitung dari tanggalnya (lihat `src/lib/open-order-window.ts`).
 * Series yang tidak dipilih otomatis hilang dari wizard /open-order.
 *
 * Tersimpan di baris tunggal `store_settings` (id = 1): `open_order_start_date`,
 * `open_order_end_date`, `open_order_series` (JSONB array). Kolomnya dibuat oleh
 * `supabase/open-order-settings.sql` yang dijalankan manual di Supabase SQL editor — selama
 * belum dijalankan halaman ini menampilkan peringatan dan simpan akan gagal.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Check, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/AdminToast";
import { getProducts } from "@/lib/db";
import { OPEN_ORDER_PERIOD } from "@/lib/open-order-config";
import { buildOpenOrderProducts } from "@/lib/open-order-offering";
import {
  formatOpenOrderPeriod,
  openOrderSeriesList,
  resolveOpenOrderState,
  type OpenOrderState,
} from "@/lib/open-order-window";
import { supabase } from "@/lib/supabase";

const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em]";
const LABEL_COLOR = "var(--text-muted)";

/** Tampilan status hasil hitungan tanggal — supaya admin langsung lihat efek tanggalnya. */
const STATE_STYLE: Record<OpenOrderState, { label: string; color: string; background: string }> = {
  open: { label: "Dibuka — customer bisa memesan", color: "#1f6f45", background: "rgba(31,111,69,.09)" },
  before: { label: "Belum dibuka", color: "#8a6516", background: "rgba(138,101,22,.1)" },
  closed: { label: "Ditutup — menunggu periode berikutnya", color: "#7a5548", background: "rgba(122,85,72,.1)" },
};

export default function OpenOrderSettingsForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsSql, setNeedsSql] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [series, setSeries] = useState<string[]>([]);
  const [allSeries, setAllSeries] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    supabase
      .from("store_settings")
      .select("open_order_start_date, open_order_end_date, open_order_series")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          // Paling sering: kolomnya belum ada karena SQL-nya belum dijalankan.
          setNeedsSql(true);
        } else if (data) {
          setStart(data.open_order_start_date ?? "");
          setEnd(data.open_order_end_date ?? "");
          setSeries(openOrderSeriesList(data.open_order_series));
        }
        setLoading(false);
      });

    // Pilihan series datang dari katalog yang sama dengan wizard (bukan daftar hardcode).
    getProducts()
      .then((products) => {
        if (!mounted) return;
        const names = new Set<string>();
        buildOpenOrderProducts(products).forEach((product) =>
          product.series.forEach((option) => names.add(option.name))
        );
        setAllSeries([...names].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const windowSettings = { open_order_start_date: start || null, open_order_end_date: end || null };
  const state = resolveOpenOrderState(windowSettings);
  const periodLabel = formatOpenOrderPeriod(windowSettings, OPEN_ORDER_PERIOD);
  const invalidRange = Boolean(start && end && end < start);

  function toggleSeries(name: string) {
    setSeries((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  }

  async function save() {
    if (invalidRange) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").upsert({
      id: 1,
      open_order_start_date: start || null,
      open_order_end_date: end || null,
      open_order_series: series,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.showToast("error", error.message);
      return;
    }
    toast.showToast("success", "Pengaturan Open Order disimpan");
  }

  const fieldStyle = {
    background: "#fff",
    border: "1px solid rgba(17,17,17,.12)",
    color: "var(--espresso)",
  };

  return (
    <section className="mx-auto max-w-3xl p-5 lg:p-8">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--espresso)" }}>
          Open Order
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: LABEL_COLOR }}>
          Atur tanggal buka &amp; tutup, lalu pilih series yang dibuka untuk periode ini.
        </p>
      </header>

      {needsSql && (
        <div
          className="mb-6 flex gap-3 rounded-xl p-4"
          style={{ background: "#fdf6e7", border: "1px solid rgba(181,140,74,.28)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--gold-deep)" }} />
          <p className="text-[13px] leading-relaxed" style={{ color: "#7a5c22" }}>
            Kolom <code>open_order_start_date</code> / <code>open_order_end_date</code> /{" "}
            <code>open_order_series</code> belum ada di Supabase. Jalankan{" "}
            <code>supabase/open-order-settings.sql</code> di SQL editor Supabase, lalu muat ulang halaman ini.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 size={22} className="animate-spin" style={{ color: "var(--gold)" }} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Jendela Open Order */}
          <div className="rounded-2xl bg-white p-6 sm:p-7" style={{ border: "1px solid rgba(17,17,17,.08)" }}>
            <div className="flex items-start gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                style={{ background: "rgba(17,17,17,.04)", color: "var(--espresso)" }}
              >
                <Calendar size={17} />
              </span>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--espresso)" }}>
                  Jendela Open Order
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: LABEL_COLOR }}>
                  Status buka/tutup dihitung otomatis dari dua tanggal ini.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL} style={{ color: LABEL_COLOR }}>
                  Tanggal mulai
                </span>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors duration-150"
                  style={fieldStyle}
                />
              </label>
              <label className="block">
                <span className={LABEL} style={{ color: LABEL_COLOR }}>
                  Tanggal tutup
                </span>
                <input
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors duration-150"
                  style={fieldStyle}
                />
              </label>
            </div>

            {invalidRange && (
              <p className="mt-3 text-[12.5px]" style={{ color: "#b3261e" }}>
                Tanggal tutup harus setelah tanggal mulai.
              </p>
            )}

            <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: LABEL_COLOR }}>
              Tampil di halaman /open-order sebagai <span style={{ color: "var(--espresso)" }}>Periode {periodLabel}</span>.
            </p>
          </div>

          {/* Series yang dibuka */}
          <div className="rounded-2xl bg-white p-6 sm:p-7" style={{ border: "1px solid rgba(17,17,17,.08)" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--espresso)" }}>
                  Series yang dibuka
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: LABEL_COLOR }}>
                  Series yang tidak dipilih tidak muncul di /open-order.
                </p>
              </div>
              {series.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSeries([])}
                  className="text-[12px] font-medium underline underline-offset-2"
                  style={{ color: LABEL_COLOR }}
                >
                  Buka semua series
                </button>
              )}
            </div>

            {allSeries.length === 0 ? (
              <p className="mt-6 text-[12.5px]" style={{ color: LABEL_COLOR }}>
                Memuat daftar series dari katalog…
              </p>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                {allSeries.map((name) => {
                  const active = series.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleSeries(name)}
                      aria-pressed={active}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-150"
                      style={
                        active
                          ? { background: "var(--espresso)", borderColor: "var(--espresso)", color: "#fff" }
                          : { background: "#fff", borderColor: "rgba(17,17,17,.14)", color: "var(--espresso)" }
                      }
                    >
                      {active && <Check size={13} strokeWidth={2.5} />}
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: LABEL_COLOR }}>
              {series.length === 0
                ? "Belum ada yang dipilih — semua series dibuka."
                : `${series.length} series dibuka: ${series.join(", ")}.`}
            </p>
          </div>

          {/* Simpan */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-medium"
              style={{ background: STATE_STYLE[state].background, color: STATE_STYLE[state].color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATE_STYLE[state].color }} />
              {STATE_STYLE[state].label}
            </span>

            <button
              type="button"
              onClick={save}
              disabled={saving || invalidRange}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white transition-opacity duration-150 disabled:opacity-50"
              style={{ background: "var(--espresso)" }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
