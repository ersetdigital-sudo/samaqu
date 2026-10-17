"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Pratinjau SEMUA notifikasi WhatsApp yang dikirim sistem (baca-saja) — dipasang di panel
 * Pengaturan dashboard admin, tepat di bawah kartu Fonnte.
 *
 * Isinya datang dari `katalogNotifikasi()` di `src/lib/fonnte.ts` (satu sumber dengan template
 * yang benar-benar dipakai mengirim), jadi apa yang tampil di sini = apa yang benar-benar
 * dikirim. Pesan yang belum jalan ditandai "belum aktif".
 */

type Item = {
  key: string;
  label: string;
  ke: "Pembeli" | "Admin";
  kapan: string;
  isi: string;
  aktif: boolean;
};

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` };
}

export default function NotifikasiKatalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tersalin, setTersalin] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifikasi", { headers: await authHeaders() });
      const json = (await res.json()) as { items?: Item[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Gagal memuat daftar notifikasi");
      setItems(json.items || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar notifikasi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function salin(item: Item) {
    try {
      await navigator.clipboard.writeText(item.isi);
      setTersalin(item.key);
      setTimeout(() => setTersalin((k) => (k === item.key ? "" : k)), 2000);
    } catch {
      setError("Gagal menyalin — browser menolak akses clipboard.");
    }
  }

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium" style={{ color: "var(--espresso)" }}>
            Notifikasi WhatsApp (semua pesan sistem)
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Daftar pesan yang otomatis dikirim aplikasi — termasuk transaksi yang diinput admin/ops. Isinya sama
            dengan template yang benar-benar dipakai mengirim.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "rgba(0,0,0,.12)", color: "var(--text-secondary)" }}
        >
          Muat ulang
        </button>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={14} className="animate-spin" /> Memuat daftar notifikasi…
        </p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.key} className="rounded-xl border" style={{ borderColor: "rgba(0,0,0,.08)" }}>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--espresso)" }}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.kapan}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={{ borderColor: "rgba(0,0,0,.12)", color: "var(--text-secondary)" }}
                  >
                    {item.ke}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.aktif ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.aktif ? "aktif" : "belum aktif"}
                  </span>
                  <button
                    type="button"
                    onClick={() => salin(item)}
                    className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold"
                    style={{ borderColor: "rgba(0,0,0,.12)", color: "var(--text-secondary)" }}
                  >
                    <Copy size={12} /> {tersalin === item.key ? "Tersalin" : "Salin"}
                  </button>
                </div>
              </div>
              <pre
                className="whitespace-pre-wrap rounded-b-xl border-t px-4 py-3 text-xs leading-relaxed"
                style={{ borderColor: "rgba(0,0,0,.08)", background: "rgba(0,0,0,.02)", color: "var(--espresso)" }}
              >
                {item.isi}
              </pre>
            </div>
          ))}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Mengubah teks template langsung dari panel ini menyusul — butuh tempat penyimpanan template dulu
            (satu kolom/tabel baru). Untuk sekarang daftar ini read-only supaya tidak ada pesan yang jalan tanpa
            kelihatan.
          </p>
        </div>
      )}
    </section>
  );
}
