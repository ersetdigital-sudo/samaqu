"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import AkunShell, { AkunHeader } from "@/components/akun/AkunShell";
import { tglJamID, tglPanjangID } from "@/lib/akun-format";

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  updated_at?: string;
  awb_no?: string | null;
  shipping_method?: string;
}

interface TrackHistory {
  date?: string;
  desc?: string;
  city?: string;
}

export default function LacakPage() {
  const params = useParams();
  const orderNo = decodeURIComponent(String(params.orderNo));
  const locale = useSafeLocale();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<TrackHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      const all = (await getCustomerOrders(c.id)) as Order[];
      const found = all.find((o) => o.order_number === orderNo) || null;
      setOrder(found);
      if (found?.awb_no) {
        try {
          const res = await fetch(`/api/jnt/track?awb=${encodeURIComponent(found.awb_no)}`);
          const json = await res.json();
          if (json?.success && json?.data?.history) setHistory(json.data.history);
          else if (json?.error) setTrackError("Gagal mengambil data tracking dari kurir.");
        } catch {
          setTrackError("Gagal mengambil data tracking dari kurir.");
        }
      }
      setLoading(false);
    }
    init();
  }, [orderNo]);

  async function salin() {
    if (!order?.awb_no) return;
    try {
      await navigator.clipboard.writeText(order.awb_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  }

  const awb = order?.awb_no;

  return (
    <AkunShell>
      <AkunHeader title="Lacak Pesanan" back={`/akun/pesanan/${orderNo}`} />

      <div className="md:flex md:gap-6 md:items-start">
        <div className="md:w-[340px] md:shrink-0 space-y-3 md:space-y-4">
          <div className="akun-card p-5 flex gap-4 items-start">
            <span className="shrink-0 px-3 py-2 rounded-xl bg-[#e11d48] text-white font-extrabold text-xs">J&amp;T</span>
            <div>
              <p className="font-bold text-sm md:text-base" style={{ color: "#0f3d33" }}>Pengiriman menggunakan J&amp;T Express</p>
              <p className="text-[12px] md:text-sm text-[#6c7a75] mt-1">Nomor resi terhubung langsung dengan sistem J&amp;T.</p>
            </div>
          </div>

          <div className="akun-card p-5">
            <p className="akun-sect mb-2">Nomor Resi</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg md:text-xl font-extrabold tracking-wide" style={{ color: "#0f3d33" }}>{awb || "—"}</p>
              <button onClick={salin} disabled={!awb} className="flex items-center gap-1.5 text-xs font-bold border border-[#cfdcd7] rounded-full px-3 py-1.5 disabled:opacity-40" style={{ color: "#0f3d33" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5h10" /></svg>
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: "#efe8db" }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8 shrink-0" fill="none" stroke="#0f3d33" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>
            <div>
              <p className="text-[11px] md:text-xs font-bold text-[#6c7a75] uppercase tracking-wider">Terakhir diperbarui</p>
              <p className="font-extrabold text-base md:text-lg" style={{ color: "#0f3d33" }}>{tglPanjangID(order?.updated_at || order?.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="akun-card p-5 md:p-6 mt-3 md:mt-0 md:flex-1 md:min-w-0">
          <h3 className="font-extrabold mb-4 md:text-lg" style={{ color: "#0f3d33" }}>Status Pengiriman</h3>
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded bg-[#f2efe8] animate-pulse" />)}
            </div>
          ) : trackError ? (
            <div className="rounded-xl p-4 text-sm" style={{ background: "#fef2f2", color: "#b91c1c" }}>{trackError}</div>
          ) : history.length > 0 ? (
            <ol className="relative">
              {history.map((h, i) => {
                const last = i === history.length - 1;
                const active = i === 0;
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {active ? (
                        <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: "#dcefe8" }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#0f3d33" }} /></span>
                      ) : (
                        <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: "#0f3d33" }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#fff" strokeWidth="3"><path d="m5 13 4 4 10-10" /></svg>
                        </span>
                      )}
                      {!last && <span className="w-px flex-1 my-1" style={{ background: "#bcd3cb" }} />}
                    </div>
                    <div className={last ? "pb-0" : "pb-5"}>
                      <p className="font-bold text-sm md:text-base" style={{ color: "#0f3d33" }}>{h.desc || "Update"}{h.city ? ` — ${h.city}` : ""}</p>
                      <p className="text-[11px] md:text-xs text-[#8b9793] mt-0.5">{h.date ? tglJamID(h.date) : ""}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="rounded-xl p-4 text-sm text-[#6c7a75]" style={{ background: "#f5f1ea" }}>
              Belum ada data tracking. {awb ? "Data akan muncul setelah kurir memindai paket." : "Nomor resi belum tersedia."}
            </div>
          )}
        </div>
      </div>
    </AkunShell>
  );
}