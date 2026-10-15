"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/AdminToast";
import { SettingsCard, Field } from "@/components/admin/SettingsCard";

/**
 * Pengaturan notifikasi WhatsApp (Fonnte) — DUA bagian terpisah:
 * - **Customer**: token device untuk semua pesan otomatis ke pembeli.
 * - **Admin**: token device + nomor tujuan untuk pesan internal.
 *
 * Token tidak pernah dibaca balik ke browser (hanya disamarkan), jadi field token selalu kosong
 * saat form dibuka: diisi hanya kalau memang mau mengganti. Saklar aktif/nonaktif bersifat global
 * (satu kolom `enabled`), jadi statusnya dipegang komponen induk supaya kedua kartu tidak
 * saling menimpa.
 */

type SectionKey = "customer" | "admin";

interface ChannelPayload {
  hasToken?: boolean;
  tokenPreview?: string;
  number?: string;
  usingLegacyToken?: boolean;
  fromEnv?: boolean;
}

interface SettingsPayload {
  tableReady?: boolean;
  enabled?: boolean;
  envToken?: boolean;
  envAdminNumber?: string;
  customer?: ChannelPayload;
  admin?: ChannelPayload;
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` };
}

export function FonnteSections() {
  const [enabled, setEnabled] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/fonnte-settings", { headers: await authHeaders() });
    const json = (await res.json()) as SettingsPayload & { error?: string };
    if (!res.ok) throw new Error(json.error || "Gagal memuat pengaturan Fonnte");
    setTableReady(json.tableReady !== false);
    setEnabled(json.enabled !== false);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => console.error("[ADMIN] Gagal memuat pengaturan Fonnte:", e))
      .finally(() => setLoading(false));
  }, [load, reloadKey]);

  if (loading) {
    return (
      <div className="card p-6 max-w-2xl">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} />
      </div>
    );
  }

  return (
    <>
      <FonnteChannelCard
        section="customer"
        tableReady={tableReady}
        enabled={enabled}
        onSaved={() => setReloadKey((key) => key + 1)}
        title="Notifikasi WhatsApp — Customer"
        description="Dipakai untuk semua pesan otomatis ke pembeli: pesanan dibuat, pembayaran diterima, paket dikirim, paket diterima, reminder, dan pembatalan."
        numberLabel="Nomor WhatsApp pengirim Customer"
        numberPlaceholder="0812xxxxxxx"
        numberHint="Nomor device customer (catatan pengirim). Kosong = tampil apa adanya di pengaturan saja."
      />
      <FonnteChannelCard
        section="admin"
        tableReady={tableReady}
        enabled={enabled}
        onSaved={() => setReloadKey((key) => key + 1)}
        title="Notifikasi WhatsApp — Admin"
        description="Dipakai untuk pesan internal: pemberitahuan pesanan baru dan pembatalan pesanan."
        numberLabel="Nomor WhatsApp tujuan Admin"
        numberPlaceholder="0812xxxxxxx"
        numberHint="Boleh beberapa nomor dipisah koma. Kosong = pakai nomor toko di Informasi Toko."
      />
    </>
  );
}

function FonnteChannelCard({
  section,
  tableReady,
  enabled,
  onSaved,
  title,
  description,
  numberLabel,
  numberPlaceholder,
  numberHint,
}: {
  section: SectionKey;
  tableReady: boolean;
  enabled: boolean;
  onSaved: () => void;
  title: string;
  description: string;
  numberLabel: string;
  numberPlaceholder: string;
  numberHint: string;
}) {
  const [number, setNumber] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenPreview, setTokenPreview] = useState("");
  const [usingLegacyToken, setUsingLegacyToken] = useState(false);
  const [fromEnv, setFromEnv] = useState(false);
  const [original, setOriginal] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/fonnte-settings", { headers: await authHeaders() });
    const json = (await res.json()) as SettingsPayload & { error?: string };
    if (!res.ok) throw new Error(json.error || "Gagal memuat pengaturan Fonnte");

    const channel = (section === "customer" ? json.customer : json.admin) || {};
    setNumber(channel.number || "");
    setOriginal(channel.number || "");
    setTokenPreview(channel.tokenPreview || "");
    setUsingLegacyToken(!!channel.usingLegacyToken);
    setFromEnv(!!channel.fromEnv);
  }, [section]);

  useEffect(() => {
    load()
      .catch((e) => console.error("[ADMIN] Gagal memuat pengaturan Fonnte:", e))
      .finally(() => setLoading(false));
  }, [load]);

  const dirty = number !== original || !!token.trim();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fonnte-settings", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ section, enabled, number, token }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.showToast("error", json.error || "Gagal menyimpan pengaturan");
        return;
      }
      toast.showToast("success", `Pengaturan notifikasi ${section === "customer" ? "Customer" : "Admin"} disimpan`);
      setToken("");
      setShowToken(false);
      setEditing(false);
      await load();
      onSaved();
    } catch (e) {
      console.error("[ADMIN] Gagal menyimpan pengaturan Fonnte:", e);
      toast.showToast("error", "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setNumber(original);
    setToken("");
    setShowToken(false);
    setEditing(false);
  }

  async function handleToggleEnabled() {
    // Saklar global: langsung disimpan supaya kedua kartu memakai nilai yang sama.
    try {
      const res = await fetch("/api/admin/fonnte-settings", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ section, enabled: !enabled }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.showToast("error", json.error || "Gagal mengubah status notifikasi");
        return;
      }
      onSaved();
    } catch (e) {
      console.error("[ADMIN] Gagal mengubah status notifikasi:", e);
      toast.showToast("error", "Gagal mengubah status notifikasi");
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/fonnte-settings", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ action: "test", section, target: number }),
      });
      const json = await res.json();
      if (json.ok) toast.showToast("success", `Pesan tes terkirim ke ${json.target}`);
      else toast.showToast("error", json.error || "Gagal mengirim pesan tes");
    } catch (e) {
      console.error("[ADMIN] Gagal mengirim pesan tes:", e);
      toast.showToast("error", "Gagal mengirim pesan tes");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-6 max-w-2xl">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--gold)" }} />
      </div>
    );
  }

  const tokenLabel = tokenPreview || (fromEnv ? "(dari environment variable)" : "");
  const tokenStatus = usingLegacyToken
    ? "Masih memakai token lama (dipakai bersama customer & admin)."
    : tokenLabel
      ? `Token tersimpan saat ini: ${tokenLabel}`
      : "Belum ada token tersimpan.";

  return (
    <SettingsCard
      title={title}
      description={description}
      headerRight={
        <button
          onClick={handleToggleEnabled}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0"
          style={{ background: enabled ? "#f4f4f5" : "#f1f1f3", color: enabled ? "#3f3f46" : "var(--text-muted)" }}
          title="Saklar notifikasi WhatsApp (berlaku untuk kedua jalur)"
        >
          {enabled ? "Aktif" : "Nonaktif"}
        </button>
      }
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
      canSave={tableReady && dirty}
      saveLabel="Simpan"
    >
      {!tableReady && (
        <p className="text-[11px] rounded-xl px-3 py-2" style={{ background: "#fff7ed", color: "#9a3412" }}>
          Tabel <code>fonnte_settings</code> belum dibuat. Jalankan <code>supabase/fonnte-settings.sql</code> di Supabase SQL Editor dulu.
        </p>
      )}

      <Field
        label={numberLabel}
        value={number}
        editing={editing}
        onChange={setNumber}
        placeholder={numberPlaceholder}
        hint={numberHint}
      />

      {editing ? (
        <div>
          <label className="block text-sm font-semibold" style={{ color: "var(--espresso)" }}>
            Token Fonnte {section === "customer" ? "Customer" : "Admin"}
          </label>
          <div className="relative mt-1.5">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 pr-10 bg-white text-sm outline-none font-mono"
              style={{ border: "1px solid #e4e4e7" }}
              placeholder={tokenLabel ? "Masukkan token baru untuk mengganti" : "Masukkan token device Fonnte"}
            />
            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
              {showToken ? "Sembunyikan" : "Lihat"}
            </button>
          </div>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            {tokenStatus} Ambil di dashboard Fonnte → Device.
          </p>
        </div>
      ) : (
        <Field
          label={`Token Fonnte ${section === "customer" ? "Customer" : "Admin"}`}
          value={tokenLabel}
          editing={false}
          mono
        />
      )}

      <div className="pt-1">
        <button
          onClick={handleTest}
          disabled={testing || !tableReady}
          className="text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40"
          style={{ border: "1px solid #d4d4d8", color: "var(--espresso)" }}
        >
          {testing ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
          Test Notifikasi
        </button>
      </div>
    </SettingsCard>
  );
}
