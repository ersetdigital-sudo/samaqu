"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  Copy,
  Loader2,
  MessageCircle,
  Phone,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { IconCheckCircle, IconExternalLink } from "@/components/ops/icons";
import {
  OUTCOMES,
  LOST_REASONS,
  waLink,
  fmtWibDateTime,
  normalizeWaNumber,
  isoToWibInput,
  wibInputToIso,
  defaultFirstFollowup,
} from "@/lib/ops-followup";
import { useToast } from "@/components/ops/ui/use-toast";

type Lead = {
  id: string;
  kontak: string;
  produk?: string | null;
  sumber?: string | null;
  pic?: string | null;
  outcome?: string | null;
  note?: string | null;
  lastContactAt?: string | null;
  nextFollowupAt?: string | null;
};

type Activity = {
  id: string;
  action: string;
  outcome?: string | null;
  note?: string | null;
  actor?: string | null;
  prevSchedule?: string | null;
  nextSchedule?: string | null;
  createdAt: string;
};

const ACTION_LABEL: Record<string, string> = {
  open_wa: "Membuka WhatsApp untuk follow-up",
  result: "Hasil dicatat",
  schedule: "Jadwal diubah",
  set_pic: "PIC diubah",
  created: "Lead dibuat",
};

export default function ResultDrawer({
  open,
  lead,
  picOptions = [],
  onClose,
  onSaved,
}: {
  open: boolean;
  lead: Lead | null;
  picOptions?: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<string>("");
  const [note, setNote] = useState("");
  const [nextSchedule, setNextSchedule] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [confirmStop, setConfirmStop] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pic, setPic] = useState("");
  const [savingPic, setSavingPic] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Reset form tiap kali drawer dibuka untuk lead baru
  useEffect(() => {
    if (!open) return;
    setOutcome("");
    setNote("");
    setNextSchedule(isoToWibInput(defaultFirstFollowup()));
    setPic(lead?.pic || "");
    setLostReason("");
    setConfirmStop(false);
    setError("");
    setSaving(false);
    setRequestId(`fu-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  }, [open, lead?.id]);

  // Riwayat aktivitas lead
  useEffect(() => {
    if (!open || !lead?.id) return;
    let cancelled = false;
    setLoadingHistory(true);
    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch(`/api/ops/followups?view=lead&leadId=${lead.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!cancelled) setActivities(json.items || []);
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, lead?.id]);

  const wa = useMemo(() => waLink(lead?.kontak), [lead?.kontak]);
  const needsSchedule = outcome === "no_reply" || outcome === "replied" || outcome === "interested" || outcome === "buy";
  const isStop = outcome === "stop";

  async function savePic() {
    if (!lead) return;
    setSavingPic(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/ops/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          action: "set_pic",
          leadId: lead.id,
          pic: pic.trim() || null,
          requestId: `pic-${lead.id}-${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal menyimpan PIC");
      toast({
        title: "PIC disimpan",
        description: pic.trim() ? `Penanggung jawab: ${pic.trim()}` : "PIC dikosongkan.",
        variant: "success",
      });
      onSaved();
    } catch (e) {
      toast({ title: "Gagal menyimpan PIC", description: e instanceof Error ? e.message : "Coba lagi.", variant: "destructive" });
    } finally {
      setSavingPic(false);
    }
  }

  async function submit() {
    if (!lead) return;
    if (!outcome) { setError("Pilih hasil follow-up dulu ya."); return; }
    if (outcome === "not_interested" && !lostReason) { setError("Alasan tidak berminat wajib dipilih."); return; }
    if (isStop && !confirmStop) { setConfirmStop(true); setError(""); return; }

    setSaving(true);
    setError("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/ops/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          action: "record",
          leadId: lead.id,
          outcome,
          note: note.trim() || null,
          nextSchedule: needsSchedule ? wibInputToIso(nextSchedule) : null,
          lostReason: outcome === "not_interested" ? lostReason : null,
          requestId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal menyimpan hasil");

      toast({ title: "Hasil follow-up tersimpan", description: "Daftar tugas sudah diperbarui.", variant: "success" });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan hasil follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && lead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/45"
          onClick={() => { if (!saving) onClose(); }}
        >
          <motion.aside
            initial={{ x: 40, opacity: 0.4, y: 20 }}
            animate={{ x: 0, opacity: 1, y: 0 }}
            exit={{ x: 40, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 bottom-0 w-full sm:w-[460px] bg-white dark:bg-[#141821] shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none"
            role="dialog"
            aria-modal="true"
            aria-label="Catat hasil follow-up"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Catat Hasil Follow-up</p>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white truncate">{lead.kontak}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {lead.produk || "Produk belum diisi"} · {lead.sumber || "-"} · PIC {lead.pic || "-"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock size={12} /> Jadwal saat ini: {fmtWibDateTime(lead.nextFollowupAt)} WIB
                  </p>
                </div>
                <button
                  onClick={() => { if (!saving) onClose(); }}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  aria-label="Tutup"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <MessageCircle size={14} className="text-[#25D366]" /> Buka WhatsApp
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold">
                    <Phone size={14} /> Nomor tidak valid — perbaiki data kontak
                  </span>
                )}
                <button
                  onClick={async () => {
                    if (!note) return;
                    try { await navigator.clipboard.writeText(note); toast({ title: "Catatan disalin", description: "Tersalin ke clipboard.", variant: "success" }); } catch { /* diabaikan */ }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Copy size={14} /> Salin Catatan
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* PIC / penanggung jawab */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-blue-600 dark:text-blue-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">PIC / penanggung jawab</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="drawer-pic-options"
                    value={pic}
                    onChange={(e) => setPic(e.target.value)}
                    placeholder="Pilih atau ketik nama"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <datalist id="drawer-pic-options">
                    {(picOptions || []).map((p) => <option key={p} value={p} />)}
                  </datalist>
                  <button
                    type="button"
                    onClick={savePic}
                    disabled={savingPic || pic.trim() === (lead.pic || "").trim()}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    {savingPic ? "Menyimpan..." : "Simpan PIC"}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-2.5">Apa hasil follow-up kali ini?</p>
                <div className="grid gap-2">
                  {OUTCOMES.map((o) => {
                    const active = outcome === o.code;
                    return (
                      <button
                        key={o.code}
                        type="button"
                        onClick={() => { setOutcome(o.code); setConfirmStop(false); setError(""); }}
                        className={`w-full text-left px-3.5 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          active
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-900/20 text-slate-900 dark:text-white"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                        }`}
                        aria-pressed={active}
                      >
                        <span className="flex items-center gap-2">
                          {active && <IconCheckCircle size={15} className="text-blue-600" />}
                          {o.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {outcome && (
                <div className="space-y-4">
                  {outcome === "not_interested" && (
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                        Alasan (wajib)
                      </label>
                      <select
                        value={lostReason}
                        onChange={(e) => setLostReason(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="">Pilih alasan…</option>
                        {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      {outcome === "replied" ? "Isi percakapan / kebutuhan pelanggan" : "Catatan (opsional)"}
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder={
                        outcome === "no_reply"
                          ? "Contoh: pesan sudah dikirim, belum dibalas"
                          : outcome === "replied"
                          ? "Contoh: menanyakan ukuran L dan estimasi pengiriman"
                          : outcome === "interested"
                          ? "Contoh: ingin mempertimbangkan warna dulu"
                          : "Catatan tambahan…"
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    />
                  </div>

                  {needsSchedule && (
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                        Follow-up berikutnya (WIB)
                      </label>
                      <input
                        type="datetime-local"
                        value={nextSchedule}
                        onChange={(e) => setNextSchedule(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Saran sistem: besok 10.00 WIB (SOP H+1). Lu bisa ubah sesuai konteks pelanggan.
                      </p>
                    </div>
                  )}

                  {outcome === "buy" && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Order <b>tidak dibuat otomatis</b> dari sini. Buat transaksinya di menu Transaksi supaya tidak ada
                        order ganda, lalu catat nomor ordernya di catatan.
                      </p>
                      <a
                        href="/ops/transaksi"
                        className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ShoppingCart size={14} /> Buka Transaksi <IconExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  {isStop && (
                    <div className={`rounded-xl p-3.5 border ${confirmStop ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                      <p className="flex items-start gap-2 text-xs font-semibold text-slate-800 leading-relaxed">
                        <AlertTriangle size={15} className={confirmStop ? "text-red-600 mt-0.5" : "text-amber-600 mt-0.5"} />
                        {confirmStop
                          ? "Konfirmasi: semua tugas follow-up untuk pelanggan ini akan dihentikan dan sistem tidak akan membuat tugas baru."
                          : `Pelanggan ${lead.kontak} akan ditandai "jangan dihubungi lagi".`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  {error}
                </p>
              )}

              {/* Riwayat */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Riwayat komunikasi</p>
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum ada aktivitas tercatat untuk lead ini.</p>
                ) : (
                  <ol className="space-y-3">
                    {activities.map((a) => (
                      <li key={a.id} className="flex gap-3">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {ACTION_LABEL[a.action] || a.action}
                            {a.outcome ? ` · ${OUTCOMES.find((o) => o.code === a.outcome)?.label || a.outcome}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {fmtWibDateTime(a.createdAt)} WIB · {a.actor || "admin"}
                          </p>
                          {a.note && <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{a.note}</p>}
                          {a.nextSchedule && a.action !== "result" && (
                            <p className="text-[11px] text-slate-500 mt-0.5">Jadwal: {fmtWibDateTime(a.nextSchedule)} WIB</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-end gap-2.5">
              <button
                onClick={() => { if (!saving) onClose(); }}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={saving || !outcome}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {isStop && confirmStop ? "Ya, hentikan follow-up" : "Simpan Hasil"}
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
