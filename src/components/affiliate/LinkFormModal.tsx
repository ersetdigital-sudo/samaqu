"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { CopyButton, Field, Select, useModal, useToast } from "./ui";
import { affiliateFetch } from "@/lib/affiliate/client";

/**
 * Formulir "Buat Tautan Affiliate" (dipakai di katalog, detail produk, dan
 * halaman Tautan). Bentuk & alurnya mengikuti mockup.
 */

interface AffiliateProduct {
  id: string;
  name: string;
  rate: number;
}

const SOURCES = ["TikTok", "Instagram", "WhatsApp", "Facebook", "YouTube", "Lainnya"];

export default function LinkFormModal({ products, initialProductId }: {
  products: AffiliateProduct[];
  initialProductId?: string;
}) {
  const { open, close } = useModal();
  const { toast } = useToast();
  const [productId, setProductId] = useState(initialProductId || "");
  const [campaign, setCampaign] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ code: string; url: string } | null>(null);

  useEffect(() => {
    setProductId(initialProductId || "");
    setCampaign("");
    setSource("");
    setNote("");
    setErr({});
    setCreated(null);
  }, [initialProductId]);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!productId) next.productId = "Pilih produk yang ingin dipromosikan.";
    if (campaign.trim().length < 3) next.campaign = "Nama kampanye minimal 3 karakter.";
    else if (campaign.trim().length > 40) next.campaign = "Nama kampanye maksimal 40 karakter.";
    if (!source) next.source = "Pilih sumber promosi.";
    setErr(next);
    if (Object.keys(next).length) {
      toast("Periksa kembali formulir tautan", "err");
      return;
    }

    setBusy(true);
    try {
      const res = await affiliateFetch<{ link: { code: string } }>("/api/affiliate/links", {
        method: "POST",
        body: JSON.stringify({
          productId,
          campaign: campaign.trim(),
          source,
          note: note.trim(),
        }),
      });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setCreated({ code: res.link.code, url: `${origin}/r/${res.link.code}` });
      toast("Tautan affiliate berhasil dibuat");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal membuat tautan", "err");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="row" style={{ marginBottom: 14, width: "100%" }}>
          <div style={{ flex: 1 }}>
            <label className="fl">Tautan Affiliate</label>
            <div className="row">
              <input className="inp" readOnly value={created.url} />
              <CopyButton value={created.url} label="Salin Tautan" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Field label="Pilih Produk" error={err.productId}>
        <Select
          value={productId}
          onChange={setProductId}
          options={[
            ["", "— Pilih produk —"],
            ...products.map((p) => [p.id, `${p.name} · ${p.rate}%`] as [string, string]),
          ]}
        />
      </Field>

      <Field label="Nama Kampanye" error={err.campaign} help="Maksimal 40 karakter.">
        <input
          className={`inp ${err.campaign ? "e" : ""}`}
          maxLength={40}
          placeholder="Contoh: Promo Payday Oktober"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
        />
      </Field>

      <Field label="Sumber Promosi" error={err.source}>
        <Select
          value={source}
          onChange={setSource}
          options={[["", "— Pilih sumber —"], ...SOURCES.map((s) => [s, s] as [string, string])]}
        />
      </Field>

      <Field label="Catatan (opsional)">
        <textarea
          className="inp"
          rows={2}
          placeholder="Catatan internal untuk kampanye ini"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
        <button className="btn s" onClick={close} type="button">
          Batal
        </button>
        <button className="btn p" onClick={submit} disabled={busy} type="button">
          <Icon name="link" className="sm" />
          {busy ? "Menyimpan…" : "Buat Tautan"}
        </button>
      </div>
    </div>
  );
}
