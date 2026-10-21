"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Percent, Search, ShoppingBag, X } from "lucide-react";
import { useToast } from "@/components/AdminToast";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  StatusBadge,
  StatCard,
  adminFetch,
  fmtDateTime,
  money,
  num,
} from "./affiliate-admin-ui";

/**
 * Admin → Affiliate → Transaksi & Komisi.
 *
 * Pesanan yang berasal dari referral + komisinya: dasar perhitungan, nominal,
 * status, dan riwayat perubahan komisi (ledger).
 */

interface CommissionRow {
  id: string;
  orderId: string;
  orderNumber: string | null;
  orderStatus: string | null;
  orderTotal: number | null;
  orderCreatedAt: string;
  affiliateId: string;
  affiliateName: string;
  affiliateCode: string;
  affiliateEmail: string;
  baseAmount: number;
  rate: number;
  amount: number;
  paidAmount: number;
  status: string;
  reason: string | null;
  availableAt: string | null;
  breakdown: { productId: string; price: number; quantity: number; rate: number; amount: number }[];
  createdAt: string;
  history: { from_status: string | null; to_status: string | null; amount: number | null; note: string | null; actor: string | null; created_at: string }[];
}

interface Payload {
  commissions: CommissionRow[];
  totals: { count: number; base: number; amount: number; pending: number; approved: number; paid: number; rejected: number };
  settings: { commission_mode: string; commission_percent: number; fixed_commission: number | null; validation_days: number };
}

export default function AffiliateTransactionsView() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<CommissionRow | null>(null);
  const [busy, setBusy] = useState("");
  const { showToast } = useToast();

  const load = async () => {
    try {
      const json = await adminFetch<Payload>("/api/admin/affiliate/commissions");
      setData(json);
      setError("");
    } catch (e) {
      console.error("[ADMIN-AFFILIATE] Gagal memuat komisi:", e);
      setError(e instanceof Error ? e.message : "Gagal memuat data komisi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const list = data?.commissions || [];
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.orderNumber || "", c.affiliateName, c.affiliateCode, c.affiliateEmail]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, query, statusFilter]);

  const act = async (row: CommissionRow, action: string, reason?: string) => {
    setBusy(row.id);
    try {
      await adminFetch("/api/admin/affiliate/commissions", {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, action, reason }),
      });
      showToast("success", "Status komisi diperbarui.");
      setDetail(null);
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
        title="Transaksi & Komisi"
        sub="Pesanan yang berasal dari referral beserta dasar perhitungan, nominal, dan status komisinya."
      />

      {error && <ErrorBlock message={error} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<ShoppingBag size={16} strokeWidth={1.9} />} label="Pesanan Teratribusi" value={num(totals?.count)} sub={`${money(totals?.base)} nilai produk`} />
        <StatCard icon={<Coins size={16} strokeWidth={1.9} />} label="Total Komisi" value={money(totals?.amount)} />
        <StatCard icon={<Percent size={16} strokeWidth={1.9} />} label="Menunggu Validasi" value={money(totals?.pending)} sub={`Disetujui ${money(totals?.approved)}`} />
        <StatCard icon={<Coins size={16} strokeWidth={1.9} />} label="Sudah Dibayarkan" value={money(totals?.paid)} sub={`Ditolak ${money(totals?.rejected)}`} />
      </div>

      <div className="card">
        <div className="flex items-center gap-3 flex-wrap p-3" style={{ borderBottom: "1px solid var(--bd)" }}>
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--fg3)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nomor pesanan, nama, atau kode affiliate…"
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
            <option value="menunggu">Menunggu Validasi</option>
            <option value="disetujui">Disetujui</option>
            <option value="dibayarkan">Dibayarkan</option>
            <option value="ditolak">Tidak Disetujui</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyBlock message="Belum ada pesanan yang teratribusi referral." />
        ) : (
          <AdminTable head={["Nomor Pesanan", "Affiliate", "Nilai Transaksi", "Dasar Perhitungan", "Komisi", "Status", "Aksi"]}>
            {rows.map((c) => (
              <tr key={c.id}>
                <AdminTh>
                  <div className="font-semibold" style={{ color: "var(--fg)" }}>{c.orderNumber || "-"}</div>
                  <div className="text-[11px]" style={{ color: "var(--fg3)" }}>
                    {fmtDateTime(c.orderCreatedAt)} · pesanan {c.orderStatus || "-"}
                  </div>
                </AdminTh>
                <AdminTh>
                  <div className="font-semibold" style={{ color: "var(--fg)" }}>{c.affiliateName}</div>
                  <div className="text-[11px]" style={{ color: "var(--fg3)" }}>{c.affiliateCode}</div>
                </AdminTh>
                <AdminTh className="font-semibold">{money(c.orderTotal)}</AdminTh>
                <AdminTh>
                  <div className="font-semibold" style={{ color: "var(--fg)" }}>{money(c.baseAmount)}</div>
                  <div className="text-[11px]" style={{ color: "var(--fg3)" }}>{c.rate}%</div>
                </AdminTh>
                <AdminTh className="font-semibold">{money(c.amount)}</AdminTh>
                <AdminTh><StatusBadge status={c.status} kind="commission" /></AdminTh>
                <AdminTh>
                  <button
                    onClick={() => setDetail(c)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg"
                    style={{ background: "var(--sub)", color: "var(--fg)" }}
                  >
                    Rincian
                  </button>
                </AdminTh>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(17,24,39,.45)" }}>
          <div className="card w-full max-w-2xl my-8">
            <div className="flex items-start justify-between gap-3 p-4" style={{ borderBottom: "1px solid var(--bd)" }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: "var(--fg)" }}>Rincian Komisi</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg3)" }}>
                  {detail.orderNumber} · {detail.affiliateName} ({detail.affiliateCode})
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg" style={{ color: "var(--fg3)" }} aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg p-3" style={{ background: "var(--sub)" }}>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>Status Pesanan</p>
                  <p className="font-semibold mt-0.5" style={{ color: "var(--fg)" }}>{detail.orderStatus || "-"}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--sub)" }}>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>Status Komisi</p>
                  <p className="font-semibold mt-0.5" style={{ color: "var(--fg)" }}>
                    <StatusBadge status={detail.status} kind="commission" />
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--sub)" }}>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>Dasar Perhitungan</p>
                  <p className="font-semibold mt-0.5" style={{ color: "var(--fg)" }}>{money(detail.baseAmount)}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--sub)" }}>
                  <p className="text-[11px]" style={{ color: "var(--fg3)" }}>Nilai Komisi</p>
                  <p className="font-semibold mt-0.5" style={{ color: "var(--fg)" }}>{money(detail.amount)}</p>
                </div>
              </div>

              {detail.reason && (
                <p className="text-xs rounded-lg p-3" style={{ background: "var(--sub)", color: "var(--fg2)" }}>
                  {detail.reason}
                </p>
              )}

              {detail.breakdown && detail.breakdown.length > 0 && (
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color: "var(--fg)" }}>Rincian per item</p>
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--bd)" }}>
                    {detail.breakdown.map((b, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs" style={{ borderBottom: "1px solid var(--bd)" }}>
                        <span style={{ color: "var(--fg2)" }}>
                          {b.quantity} × {money(b.price)} ({b.rate}%)
                        </span>
                        <span className="font-semibold" style={{ color: "var(--fg)" }}>{money(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--fg)" }}>Riwayat Perubahan Komisi</p>
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
                            {h.amount ? ` · ${money(h.amount)}` : ""}
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

            {detail.status !== "dibayarkan" && (
              <div className="flex items-center justify-end gap-2 p-4" style={{ borderTop: "1px solid var(--bd)" }}>
                <button
                  disabled={busy === detail.id}
                  onClick={() => act(detail, "reset")}
                  className="px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
                  style={{ background: "var(--sub)", color: "var(--fg)" }}
                >
                  Kembalikan ke Menunggu
                </button>
                <button
                  disabled={busy === detail.id}
                  onClick={() => act(detail, "approve")}
                  className="px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
                  style={{ background: "var(--su)", color: "#fff" }}
                >
                  Setujui Komisi
                </button>
                <button
                  disabled={busy === detail.id}
                  onClick={() => {
                    const reason = window.prompt("Alasan komisi tidak disetujui:");
                    if (reason && reason.trim()) act(detail, "reject", reason.trim());
                  }}
                  className="px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
                  style={{ background: "#fef2f2", color: "#b91c1c" }}
                >
                  Tolak Komisi
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
