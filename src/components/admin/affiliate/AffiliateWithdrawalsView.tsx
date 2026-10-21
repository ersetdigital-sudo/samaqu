"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, CreditCard, Search, X } from "lucide-react";
import { useToast } from "@/components/AdminToast";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  StatCard,
  StatusBadge,
  adminFetch,
  fmtDateTime,
  money,
  num,
} from "./affiliate-admin-ui";

/**
 * Admin → Affiliate → Pencairan Komisi.
 *
 * Pengajuan pencairan: approve → diproses → dicatat bukti pembayaran → berhasil.
 * Menyetel status "berhasil" juga mengalokasikan saldo komisi ke pengajuan tsb.
 */

interface WithdrawalRow {
  id: string;
  ref: string;
  affiliateName: string;
  affiliateCode: string;
  affiliateEmail: string;
  affiliatePhone: string | null;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  bankName: string | null;
  bankNumber: string | null;
  bankHolder: string | null;
  status: string;
  reason: string | null;
  proofUrl: string | null;
  proofNote: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  history: { from_status: string | null; to_status: string | null; note: string | null; actor: string | null; created_at: string }[];
}

interface Payload {
  withdrawals: WithdrawalRow[];
  totals: { count: number; pending: number; processing: number; paid: number; rejected: number };
}

export default function AffiliateWithdrawalsView() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<WithdrawalRow | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [busy, setBusy] = useState("");
  const { showToast } = useToast();

  const load = async () => {
    try {
      const json = await adminFetch<Payload>("/api/admin/affiliate/withdrawals");
      setData(json);
      setError("");
    } catch (e) {
      console.error("[ADMIN-AFFILIATE] Gagal memuat pencairan:", e);
      setError(e instanceof Error ? e.message : "Gagal memuat data pencairan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const list = data?.withdrawals || [];
    const q = query.trim().toLowerCase();
    return list.filter((w) => {
      if (statusFilter && w.status !== statusFilter) return false;
      if (!q) return true;
      return [w.ref, w.affiliateName, w.affiliateCode, w.affiliateEmail, w.bankNumber || ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, query, statusFilter]);

  const act = async (row: WithdrawalRow, action: string, extra?: { reason?: string; proofNote?: string; proofUrl?: string }) => {
    setBusy(row.id);
    try {
      await adminFetch("/api/admin/affiliate/withdrawals", {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, action, ...(extra || {}) }),
      });
      showToast("success", "Status pencairan diperbarui.");
      setDetail(null);
      setProofNote("");
      setProofUrl("");
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Gagal menyimpan perubahan.");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <LoadingBlock />;

  const totals = data?.totals;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Pencairan Komisi"
        sub="Pengajuan pencairan dari affiliate, persetujuan admin, dan bukti pembayaran."
      />

      {error && <ErrorBlock message={error} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<CreditCard size={16} strokeWidth={1.9} />} label="Total Pengajuan" value={num(totals?.count)} />
        <StatCard icon={<Clock size={16} strokeWidth={1.9} />} label="Menunggu & Diproses" value={money((totals?.pending || 0) + (totals?.processing || 0))} />
        <StatCard icon={<CreditCard size={16} strokeWidth={1.9} />} label="Sudah Dibayar" value={money(totals?.paid)} />
        <StatCard icon={<Clock size={16} strokeWidth={1.9} />} label="Ditolak" value={money(totals?.rejected)} />
      </div>

      <div className="card">
        <div className="flex items-center gap-3 flex-wrap p-3" style={{ borderBottom: "1px solid var(--bd)" }}>
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--fg3)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nomor referensi, nama, atau rekening…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: "var(--sub)", border: "1px solid var(--bd)", color: "var(--fg)" }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg outline-none"
            style={{ background: "var(--sub)", border: "1px solid var(--bd)", color: "var(--fg)" }}
          >
            <option value="">Semua Status</option>
            <option value="menunggu">Menunggu</option>
            <option value="diproses">Diproses</option>
            <option value="berhasil">Berhasil</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyBlock message="Belum ada pengajuan pencairan." />
        ) : (
          <AdminTable head={["Referensi", "Affiliate", "Nominal", "Biaya", "Dana Bersih", "Rekening Tujuan", "Status", "Aksi"]}>
            {rows.map((w) => (
              <tr key={w.id}>
                <AdminTh>
                  <div className="font-semibold" style={{ color: "var(--fg)" }}>{w.ref}</div>
                  <div className="text-[11px]" style={{ color: "var(--fg3)" }}>{fmtDateTime(w.createdAt)}</div>
                </AdminTh>
                <AdminTh>
                  <div className="font-semibold" style={{ color: "var(--fg)" }}>{w.affiliateName}</div>
                  <div className="text-[11px]" style={{ color: "var(--fg3)" }}>{w.affiliateCode}</div>
                </AdminTh>
                <AdminTh className="font-semibold">{money(w.amount)}</AdminTh>
                <AdminTh>{money(w.fee)}</AdminTh>
                <AdminTh className="font-semibold">{money(w.netAmount)}</AdminTh>
                <AdminTh>
                  <div style={{ color: "var(--fg2)" }}>{w.bankName} {w.bankNumber}</div>
                  <div className="text-[11px]" style={{ color: "var(--fg3)" }}>{w.bankHolder} · {w.method}</div>
                </AdminTh>
                <AdminTh><StatusBadge status={w.status} kind="withdrawal" /></AdminTh>
                <AdminTh>
                  <button
                    onClick={() => { setDetail(w); setProofNote(w.proofNote || ""); setProofUrl(w.proofUrl || ""); }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg"
                    style={{ background: "var(--sub)", color: "var(--fg)" }}
                  >
                    Detail
                  </button>
                </AdminTh>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(17,24,39,.45)" }}>
          <div className="card w-full max-w-xl my-8">
            <div className="flex items-start justify-between gap-3 p-4" style={{ borderBottom: "1px solid var(--bd)" }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: "var(--fg)" }}>Detail Pencairan</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg3)" }}>
                  {detail.ref} · {detail.affiliateName} ({detail.affiliateCode})
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg" style={{ color: "var(--fg3)" }} aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg p-3" style={{ background: "var(--sub)" }}>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>Nominal Pengajuan</p>
                  <p className="font-semibold mt-0.5" style={{ color: "var(--fg)" }}>{money(detail.amount)}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--sub)" }}>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>Dana Bersih (setelah biaya)</p>
                  <p className="font-semibold mt-0.5" style={{ color: "var(--fg)" }}>{money(detail.netAmount)}</p>
                </div>
                <div className="rounded-lg p-3 col-span-2" style={{ background: "var(--sub)" }}>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>Rekening Tujuan</p>
                  <p className="font-semibold mt-0.5" style={{ color: "var(--fg)" }}>
                    {detail.method} · {detail.bankName} {detail.bankNumber}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>a.n. {detail.bankHolder} · {detail.affiliatePhone || detail.affiliateEmail}</p>
                </div>
              </div>

              {detail.reason && (
                <p className="text-xs rounded-lg p-3" style={{ background: "var(--sub)", color: "var(--fg2)" }}>
                  {detail.reason}
                </p>
              )}

              {detail.status !== "berhasil" && detail.status !== "ditolak" && (
                <div className="space-y-2">
                  <p className="text-xs font-bold" style={{ color: "var(--fg)" }}>Bukti pembayaran</p>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>
                    Wajib dicatat sebelum pencairan ditandai "berhasil". Transfer di luar sistem tetap
                    dicek manual oleh admin.
                  </p>
                  <textarea
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Transfer BCA a.n. Surya Pratama, ref 12345"
                    className="w-full p-3 text-sm rounded-lg outline-none"
                    style={{ background: "var(--sub)", border: "1px solid var(--bd)", color: "var(--fg)" }}
                  />
                  <input
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="URL bukti (opsional, mis. foto nota transfer)"
                    className="w-full p-3 text-sm rounded-lg outline-none"
                    style={{ background: "var(--sub)", border: "1px solid var(--bd)", color: "var(--fg)" }}
                  />
                </div>
              )}

              <div>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--fg)" }}>Riwayat Tindakan</p>
                {detail.history.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--fg3)" }}>Belum ada riwayat.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.history.map((h, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--fg3)" }} />
                        <div>
                          <p style={{ color: "var(--fg2)" }}>
                            {h.from_status || "baru"} → <b style={{ color: "var(--fg)" }}>{h.to_status || "-"}</b>
                          </p>
                          {h.note && <p style={{ color: "var(--fg3)" }}>{h.note}</p>}
                          <p style={{ color: "var(--fg3)" }}>{fmtDateTime(h.created_at)} · {h.actor || "system"}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {detail.status !== "berhasil" && detail.status !== "ditolak" && (
              <div className="flex items-center justify-end gap-2 p-4 flex-wrap" style={{ borderTop: "1px solid var(--bd)" }}>
                <button
                  disabled={busy === detail.id}
                  onClick={() => {
                    const reason = window.prompt("Alasan penolakan pencairan:");
                    if (reason && reason.trim()) act(detail, "reject", { reason: reason.trim() });
                  }}
                  className="px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
                  style={{ background: "#fef2f2", color: "#b91c1c" }}
                >
                  Tolak
                </button>
                {detail.status === "menunggu" && (
                  <button
                    disabled={busy === detail.id}
                    onClick={() => act(detail, "process")}
                    className="px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
                    style={{ background: "var(--sub)", color: "var(--fg)" }}
                  >
                    Setujui (Proses)
                  </button>
                )}
                <button
                  disabled={busy === detail.id}
                  onClick={() => act(detail, "pay", { proofNote: proofNote.trim(), proofUrl: proofUrl.trim() })}
                  className="px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
                  style={{ background: "var(--su)", color: "#fff" }}
                >
                  Tandai Sudah Dibayar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
