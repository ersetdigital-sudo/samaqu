"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Pencil, RotateCcw, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Pratinjau + editor SEMUA notifikasi WhatsApp sistem — panel Pengaturan dashboard admin.
 *
 * - Kartu dan editor memakai teks yang SAMA: template mentah dengan penanda
 *   ({nama}, {nomor}, {resi}, …), bukan data contoh. Jadi saat mengedit, isinya tidak berbeda
 *   dari yang terlihat di kartu.
 * - Kalau admin sudah pernah mengubah, yang tampil adalah versi tersimpan; kalau belum,
 *   teks bawaan sistem.
 * - "Kembalikan ke default" mengembalikan isi ke teks bawaan sistem (dengan konfirmasi).
 * - Kosongkan kotak = kembali ke teks bawaan saat disimpan.
 */

type Item = {
  key: string;
  label: string;
  ke: "Pembeli" | "Admin";
  kapan: string;
  isi: string;
  /** Teks mentah dengan penanda — isi awal editor. */
  template: string;
  /** Teks pengganti yang tersimpan (kosong = belum pernah diubah). */
  override: string;
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
  const [pesan, setPesan] = useState("");
  const [tersalin, setTersalin] = useState("");
  const [suntingKey, setSuntingKey] = useState("");
  const [draf, setDraf] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

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

  const penandaDiDraf = useMemo(
    () => [...new Set([...draf.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]))],
    [draf],
  );

  async function salin(item: Item) {
    try {
      await navigator.clipboard.writeText(item.override || item.template || item.isi);
      setTersalin(item.key);
      setTimeout(() => setTersalin((k) => (k === item.key ? "" : k)), 2000);
    } catch {
      setError("Gagal menyalin — browser menolak akses clipboard.");
    }
  }

  async function simpan(item: Item, body: string) {
    setMenyimpan(true);
    setPesan("");
    try {
      const res = await fetch("/api/admin/notifikasi", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ key: item.key, body }),
      });
      const json = (await res.json()) as { error?: string; kembaliKeBawaan?: boolean };
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan template");
      setPesan(
        json.kembaliKeBawaan
          ? `Template "${item.label}" kembali ke teks bawaan sistem.`
          : `Template "${item.label}" tersimpan dan langsung dipakai untuk pesan berikutnya.`,
      );
      setSuntingKey("");
      setDraf("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan template");
    } finally {
      setMenyimpan(false);
    }
  }

  /** Kembalikan ke default: kalau ada versi tersimpan, hapus; kalau belum, isi editor dengan teks bawaan. */
  async function kembalikanDefault(item: Item) {
    const yakin = window.confirm(
      `Kembalikan "${item.label}" ke teks bawaan sistem? Perubahan yang pernah disimpan akan hilang.`,
    );
    if (!yakin) return;
    if (item.override) return simpan(item, "");
    setDraf(item.template);
    setPesan(`Isi editor "${item.label}" dikembalikan ke teks bawaan sistem. Klik Simpan untuk memakai ini.`);
  }

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium" style={{ color: "var(--espresso)" }}>
            Notifikasi WhatsApp (semua pesan sistem)
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Kartu dan editor memakai template yang sama, dengan penanda seperti <b>{"{nama}"}</b>,{" "}
            <b>{"{nomor}"}</b>, dan <b>{"{resi}"}</b>. Penanda itu diisi otomatis saat pesan dikirim.
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

      {pesan ? <p className="mt-3 text-sm text-emerald-700">{pesan}</p> : null}

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={14} className="animate-spin" /> Memuat daftar notifikasi…
        </p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const sedangSunting = suntingKey === item.key;
            const daftarPenanda = [...new Set([...item.template.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]))];
            return (
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
                    {item.override ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                        teks diubah
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (sedangSunting) {
                          setSuntingKey("");
                        } else {
                          // Isi awal: versi tersimpan kalau ada, kalau belum → template bawaan (penanda).
                          setSuntingKey(item.key);
                          setDraf(item.override || item.template);
                          setPesan("");
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold"
                      style={{ borderColor: "rgba(0,0,0,.12)", color: "var(--text-secondary)" }}
                    >
                      {sedangSunting ? <X size={12} /> : <Pencil size={12} />}
                      {sedangSunting ? "Batal" : "Ubah pesan"}
                    </button>
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

                {sedangSunting ? (
                  <div className="border-t px-4 py-3" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                    <textarea
                      rows={12}
                      value={draf}
                      onChange={(e) => setDraf(e.target.value)}
                      placeholder="Kosongkan untuk memakai teks bawaan sistem."
                      className="w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none"
                      style={{ borderColor: "rgba(0,0,0,.15)", color: "var(--espresso)" }}
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                        Penanda tersedia:
                      </span>
                      {daftarPenanda.length === 0 ? (
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          tidak ada (pesan ini teks tetap)
                        </span>
                      ) : (
                        daftarPenanda.map((nama) => (
                          <code
                            key={nama}
                            className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ borderColor: "rgba(0,0,0,.12)", color: "var(--text-secondary)" }}
                          >
                            {`{${nama}}`}
                          </code>
                        ))
                      )}
                    </div>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {penandaDiDraf.length > 0 ? `Dipakai di editor ini: ${penandaDiDraf.map((n) => `{${n}}`).join(", ")}.` : ""}{" "}
                      Penanda yang tidak dikenal akan tampil apa adanya di pesan, jadi salah ketik gampang ketahuan.
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={menyimpan}
                        onClick={() => simpan(item, draf)}
                        className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {menyimpan ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Simpan
                      </button>
                      <button
                        type="button"
                        disabled={menyimpan}
                        onClick={() => kembalikanDefault(item)}
                        className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                        style={{ borderColor: "rgba(0,0,0,.12)", color: "var(--text-secondary)" }}
                      >
                        <RotateCcw size={12} /> Kembalikan ke default
                      </button>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        Pratinjau di bawah memakai template yang sama dengan editor.
                      </span>
                    </div>
                  </div>
                ) : null}

                <pre
                  className="whitespace-pre-wrap rounded-b-xl border-t px-4 py-3 text-xs leading-relaxed"
                  style={{ borderColor: "rgba(0,0,0,.08)", background: "rgba(0,0,0,.02)", color: "var(--espresso)" }}
                >
                  {item.override || item.template}
                </pre>
              </div>
            );
          })}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Kartu bertanda "belum aktif" belum dikirim sistem. Template yang sudah diubah disimpan di server (akses
            khusus admin) dan langsung dipakai untuk pesan berikutnya — paling lambat 1 menit setelah disimpan.
          </p>
        </div>
      )}
    </section>
  );
}
