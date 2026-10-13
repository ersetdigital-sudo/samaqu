"use client";

/**
 * Pengaturan Open Order (menu admin "Open Order") — isi halaman /admin/open-order dan
 * /id/admin/open-order.
 *
 * Dua bagian:
 * - **Jendela Open Order** — tanggal mulai + tanggal tutup. Status buka/tutup dihitung dari
 *   tanggalnya (lihat `src/lib/open-order-window.ts`), bukan toggle manual. Read-only sampai
 *   tombol Edit ditekan.
 * - **Produk di Open Order** — daftar produk katalog (dikelompokkan per produk utama, sama
 *   seperti kartu di halaman Katalog) dengan sakelar `products.open_order_enabled`. Sakelar
 *   tersimpan langsung per produk; produk yang dimatikan hilang dari wizard /open-order.
 *   Tombol **Tambah Produk** membuka form tambah produk (opsi "Tampilkan di Open Order" sudah
 *   nyala secara default).
 *
 * Tanggal tersimpan di baris tunggal `store_settings` (id = 1): `open_order_start_date`,
 * `open_order_end_date`. Kolomnya dibuat oleh `supabase/open-order-settings.sql` — selama belum
 * dijalankan halaman ini menampilkan peringatan dan simpan akan gagal.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Calendar, Edit, Loader2, Plus, Search } from "lucide-react";
import { useToast } from "@/components/AdminToast";
import { getProducts } from "@/lib/db";
import type { Product } from "@/lib/katalog-data";
import { OPEN_ORDER_PERIOD } from "@/lib/open-order-config";
import {
  formatDateLabel,
  formatOpenOrderPeriod,
  resolveOpenOrderState,
  type OpenOrderState,
} from "@/lib/open-order-window";
import { useSafeLocale } from "@/lib/safe-i18n";
import { supabase } from "@/lib/supabase";

const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em]";
const LABEL_COLOR = "var(--text-muted)";

/** Tampilan status hasil hitungan tanggal — supaya admin langsung lihat efek tanggalnya. */
const STATE_STYLE: Record<OpenOrderState, { label: string; color: string; background: string }> = {
  open: { label: "Dibuka — customer bisa memesan", color: "#1f6f45", background: "rgba(31,111,69,.09)" },
  before: { label: "Belum dibuka", color: "#8a6516", background: "rgba(138,101,22,.1)" },
  closed: { label: "Ditutup — menunggu periode berikutnya", color: "#7a5548", background: "rgba(122,85,72,.1)" },
};

/** Satu baris daftar = satu produk utama (nama + kategori), gabungan semua baris series/warnanya. */
interface OpenOrderProductRow {
  key: string;
  name: string;
  category: string;
  /** Baris `products` di grup ini (satu per series/warna). */
  rowCount: number;
  enabled: boolean;
}

/** Kelompokkan baris `products` per produk utama — sama seperti kartu di halaman Katalog. */
function groupCatalog(products: Product[]): OpenOrderProductRow[] {
  const groups = new Map<string, OpenOrderProductRow>();
  for (const product of products) {
    const key = `${product.category}::${product.name}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rowCount += 1;
      continue;
    }
    groups.set(key, {
      key,
      name: product.name,
      category: product.category,
      rowCount: 1,
      enabled: product.open_order_enabled !== false,
    });
  }
  return [...groups.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}

export default function OpenOrderSettingsForm() {
  const toast = useToast();
  const locale = useSafeLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [needsSql, setNeedsSql] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  // Nilai tanggal terakhir yang tersimpan — dasar tombol Batal & penanda perubahan.
  const [original, setOriginal] = useState({ start: "", end: "" });

  // Produk di Open Order
  const [items, setItems] = useState<OpenOrderProductRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase
      .from("store_settings")
      .select("open_order_start_date, open_order_end_date")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          // Paling sering: kolomnya belum ada karena SQL-nya belum dijalankan.
          setNeedsSql(true);
        } else if (data) {
          const savedStart = data.open_order_start_date ?? "";
          const savedEnd = data.open_order_end_date ?? "";
          setStart(savedStart);
          setEnd(savedEnd);
          setOriginal({ start: savedStart, end: savedEnd });
        }
        setLoading(false);
      });

    // Daftar produk dari katalog yang sama dengan wizard.
    getProducts()
      .then((products) => {
        if (!mounted) return;
        setItems(groupCatalog(products));
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
  const dirty = start !== original.start || end !== original.end;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  const enabledCount = items.filter((item) => item.enabled).length;

  function cancel() {
    setStart(original.start);
    setEnd(original.end);
    setEditing(false);
  }

  async function save() {
    if (invalidRange) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").upsert({
      id: 1,
      open_order_start_date: start || null,
      open_order_end_date: end || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.showToast("error", error.message);
      return;
    }
    setOriginal({ start, end });
    setEditing(false);
    toast.showToast("success", "Jendela Open Order disimpan");
  }

  /** Sakelar produk: simpan langsung ke SEMUA baris katalog pada grup nama + kategori ini. */
  async function toggleProduct(item: OpenOrderProductRow) {
    const next = !item.enabled;
    setSavingKey(item.key);
    const { error } = await supabase
      .from("products")
      .update({ open_order_enabled: next })
      .eq("category", item.category)
      .eq("name", item.name);
    setSavingKey(null);
    if (error) {
      toast.showToast("error", error.message);
      return;
    }
    setItems((prev) => prev.map((row) => (row.key === item.key ? { ...row, enabled: next } : row)));
    toast.showToast("success", next ? `${item.name} tampil di Open Order` : `${item.name} disembunyikan dari Open Order`);
  }

  const fieldStyle = {
    background: "#fff",
    border: "1px solid rgba(17,17,17,.12)",
    color: "var(--espresso)",
  };
  const labelStyle = { color: LABEL_COLOR };

  return (
    <section className="mx-auto max-w-3xl p-5 lg:p-8">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--espresso)" }}>
          Open Order
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: LABEL_COLOR }}>
          Atur tanggal buka &amp; tutup, lalu pilih produk mana yang tampil di halaman /open-order.
        </p>
      </header>

      {needsSql && (
        <div
          className="mb-6 flex gap-3 rounded-xl p-4"
          style={{ background: "#fdf6e7", border: "1px solid rgba(181,140,74,.28)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--gold-deep)" }} />
          <p className="text-[13px] leading-relaxed" style={{ color: "#7a5c22" }}>
            Kolom <code>open_order_start_date</code> / <code>open_order_end_date</code> belum ada di
            Supabase. Jalankan <code>supabase/open-order-settings.sql</code> di SQL editor Supabase,
            lalu muat ulang halaman ini.
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

            {editing ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL} style={labelStyle}>
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
                  <span className={LABEL} style={labelStyle}>
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
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <span className={LABEL} style={labelStyle}>
                    Tanggal mulai
                  </span>
                  <p
                    className="mt-2 text-sm font-medium"
                    style={{ color: start ? "var(--espresso)" : LABEL_COLOR }}
                  >
                    {formatDateLabel(start) || "Belum diatur"}
                  </p>
                </div>
                <div>
                  <span className={LABEL} style={labelStyle}>
                    Tanggal tutup
                  </span>
                  <p
                    className="mt-2 text-sm font-medium"
                    style={{ color: end ? "var(--espresso)" : LABEL_COLOR }}
                  >
                    {formatDateLabel(end) || "Belum diatur"}
                  </p>
                </div>
              </div>
            )}

            {editing && invalidRange && (
              <p className="mt-3 text-[12.5px]" style={{ color: "#b3261e" }}>
                Tanggal tutup harus setelah tanggal mulai.
              </p>
            )}

            <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: LABEL_COLOR }}>
              Tampil di halaman /open-order sebagai <span style={{ color: "var(--espresso)" }}>Periode {periodLabel}</span>.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-medium"
                style={{ background: STATE_STYLE[state].background, color: STATE_STYLE[state].color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATE_STYLE[state].color }} />
                {STATE_STYLE[state].label}
              </span>

              {editing ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || invalidRange || !dirty}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white transition-opacity duration-150 disabled:opacity-50"
                    style={{ background: "var(--espresso)" }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Edit size={16} />}
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={saving}
                    className="inline-flex items-center rounded-xl px-5 py-3 text-[13.5px] font-semibold transition-colors duration-150 disabled:opacity-50"
                    style={{ border: "1px solid rgba(17,17,17,.14)", color: "var(--espresso)" }}
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold transition-colors duration-150"
                  style={{ border: "1px solid rgba(17,17,17,.14)", color: "var(--espresso)" }}
                >
                  <Edit size={16} />
                  Edit tanggal
                </button>
              )}
            </div>
          </div>

          {/* Produk di Open Order */}
          <div className="rounded-2xl bg-white p-6 sm:p-7" style={{ border: "1px solid rgba(17,17,17,.08)" }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--espresso)" }}>
                  Produk di Open Order
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: LABEL_COLOR }}>
                  Produk yang dimatikan tidak muncul di /open-order. Produk baru otomatis ikut.
                </p>
              </div>
              <Link
                href={`/${locale}/admin/produk/tambah`}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
                style={{ background: "var(--espresso)" }}
              >
                <Plus size={15} />
                Tambah Produk
              </Link>
            </div>

            <p className="mt-4 text-[12.5px] font-medium" style={{ color: "var(--espresso)" }}>
              {enabledCount} dari {items.length} produk tampil di Open Order.
            </p>

            {items.length > 5 && (
              <div className="relative mt-4">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: LABEL_COLOR }}
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari produk…"
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-[13px] outline-none"
                  style={fieldStyle}
                />
              </div>
            )}

            {items.length === 0 ? (
              <p className="mt-5 text-[12.5px]" style={{ color: LABEL_COLOR }}>
                Belum ada produk di katalog.
              </p>
            ) : (
              <ul className="mt-4 divide-y" style={{ borderColor: "rgba(17,17,17,.06)" }}>
                {shown.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium" style={{ color: "var(--espresso)" }}>
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[11.5px]" style={{ color: LABEL_COLOR }}>
                        {item.category}
                        {item.rowCount > 1 ? ` · ${item.rowCount} series/warna` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleProduct(item)}
                      disabled={savingKey === item.key}
                      aria-pressed={item.enabled}
                      aria-label={`${item.enabled ? "Sembunyikan" : "Tampilkan"} ${item.name} di Open Order`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors duration-150 disabled:opacity-50"
                      style={
                        item.enabled
                          ? { background: "rgba(31,111,69,.1)", color: "#1f6f45" }
                          : { background: "rgba(17,17,17,.06)", color: LABEL_COLOR }
                      }
                    >
                      {savingKey === item.key ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: "currentColor" }}
                        />
                      )}
                      {item.enabled ? "Tampil" : "Tersembunyi"}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {items.length > 0 && shown.length === 0 && (
              <p className="py-6 text-center text-[12.5px]" style={{ color: LABEL_COLOR }}>
                Tidak ada produk yang cocok dengan pencarian “{query}”.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
