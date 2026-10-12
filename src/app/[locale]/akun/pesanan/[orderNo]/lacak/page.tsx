"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import { strukStatus, tglJamID } from "@/lib/akun-format";
import type { TrackHistoryItem } from "@/lib/jnt/types";
import { STRUK_CSS, StrukHeader, StrukTitle } from "@/components/akun/StrukShell";

interface Order {
  order_number: string;
  status: string;
  created_at: string;
  updated_at?: string;
  awb_no?: string | null;
  shipping_method?: string | null;
}

interface TrackDetail {
  services_code?: string;
  qty?: number;
  weight?: number;
  itemname?: string;
  shipped_date?: string;
  receiver?: { name?: string; city?: string };
}

interface TrackPayload {
  awb?: string;
  orderid?: string;
  detail?: TrackDetail;
  history?: TrackHistoryItem[];
}

/** J&T mengirim tanggal "YYYY-MM-DD HH:mm:ss" — jadikan ISO supaya stabil di semua browser. */
function updateTime(value?: string) {
  if (!value) return "";
  const stamp = tglJamID(value.includes("T") ? value : value.replace(" ", "T"));
  return stamp === "-" ? value : stamp;
}

export default function LacakPage() {
  const params = useParams();
  const orderNo = decodeURIComponent(String(params.orderNo));
  const locale = useSafeLocale();
  const [order, setOrder] = useState<Order | null>(null);
  const [payload, setPayload] = useState<TrackPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function init() {
      const customer = await getCurrentCustomer();
      if (!customer) return;

      const orders = (await getCustomerOrders(customer.id)) as Order[];
      const found = orders.find((o) => o.order_number === orderNo) || null;
      setOrder(found);
      setLoading(false);
      if (!found?.awb_no) return;

      setTracking(true);
      try {
        const res = await fetch(`/api/jnt/track?awb=${encodeURIComponent(found.awb_no)}`);
        const json = await res.json();
        if (json?.success && json?.data) setPayload(json.data as TrackPayload);
        else setTrackError(json?.error || "Data pelacakan J&T belum bisa diambil.");
      } catch {
        setTrackError("Tidak bisa menghubungi layanan J&T. Coba muat ulang sebentar lagi.");
      } finally {
        setTracking(false);
      }
    }
    init();
  }, [orderNo]);

  // J&T mengirim riwayat dari kejadian terlama; yang terbaru tampil di atas.
  const updates = useMemo(() => [...(payload?.history || [])].reverse(), [payload]);
  const sc = order ? strukStatus(order.status) : null;
  const awb = order?.awb_no || payload?.awb;

  async function salin() {
    if (!awb) return;
    try {
      await navigator.clipboard.writeText(awb);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard bisa diblokir browser — abaikan */
    }
  }

  return (
    <div className="sk-root -mx-4 -mt-4 md:mx-0 md:mt-0">
      <style>{STRUK_CSS}</style>
      <StrukHeader title="Lacak Pesanan" back={`/akun/pesanan/${orderNo}`} />

      <div className="sk-wrap sk-body">
        <StrukTitle
          title="Lacak Pesanan"
          back={`/${locale}/akun/pesanan/${orderNo}`}
          backLabel="Detail Pesanan"
        />

        <div className="sk-cols">
          <section className="sk-hero sk-up sk-d2">
            <div
              className="sk-card"
              style={{ margin: 0, padding: "20px 18px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    flex: "none",
                    padding: "7px 12px",
                    borderRadius: 12,
                    background: "#ED1C24",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: ".02em",
                  }}
                >
                  J&amp;T
                </span>
                <div>
                  <p className="sk-eyebrow">Kurir</p>
                  <p style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>
                    J&amp;T Express{payload?.detail?.services_code ? ` — ${payload.detail.services_code}` : ""}
                  </p>
                </div>
                {sc ? (
                  <span className={`sk-chip sk-t-${sc.tone}`} style={{ position: "static", marginLeft: "auto" }}>
                    <span className="sk-dot" />
                    {sc.label}
                  </span>
                ) : null}
              </div>

              <div className="sk-sep" style={{ margin: "16px 0 14px" }} />

              <p className="sk-eyebrow">Nomor Resi</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                <p
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    letterSpacing: ".04em",
                    fontFamily: "'Consolas','Courier New',monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {awb || "—"}
                </p>
                <button
                  type="button"
                  onClick={salin}
                  disabled={!awb}
                  className="sk-bk"
                  style={{ width: "auto", marginLeft: "auto", padding: "0 13px", height: 36, gap: 7, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700 }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5h10" /></svg>
                  {copied ? "Tersalin" : "Salin"}
                </button>
              </div>

              {payload?.detail?.receiver?.city ? (
                <p style={{ fontSize: 12.5, color: "#666666", marginTop: 12 }}>
                  Tujuan: {payload.detail.receiver.city}
                  {payload.detail.weight ? ` • ${payload.detail.weight} kg` : ""}
                </p>
              ) : null}
            </div>
          </section>

          <section className="sk-card sk-pay sk-up sk-d3">
            <h3>Riwayat Pengiriman</h3>

            {loading || tracking ? (
              <div className="sk-steps">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="sk-step">
                    <div className="sk-rail"><span className="sk-node" /></div>
                    <div className="sk-txt" style={{ width: "100%" }}>
                      <span style={{ display: "block", height: 13, borderRadius: 7, background: "#ECECEC" }} />
                      <span style={{ display: "block", height: 11, width: "45%", borderRadius: 7, background: "#ECECEC", marginTop: 8 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : trackError ? (
              <div className="sk-hint" style={{ marginTop: 0 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
                {trackError}
              </div>
            ) : updates.length > 0 ? (
              <div className="sk-steps">
                {updates.map((update, i) => (
                  <div key={`${update.date_time}-${i}`} className={`sk-step ${i === 0 ? "is-active" : "is-done"}`}>
                    <div className="sk-rail">
                      <span className="sk-node" />
                      {i < updates.length - 1 ? <span className="sk-line" /> : null}
                    </div>
                    <div className="sk-txt">
                      <b>{update.status || "Update pengiriman"}</b>
                      <i>{[update.city_name, updateTime(update.date_time)].filter(Boolean).join(" • ")}</i>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sk-note" style={{ margin: 0 }}>
                {awb
                  ? "Belum ada update dari J&T. Riwayat muncul setelah kurir memindai paket."
                  : "Nomor resi belum tersedia. Kami kabari begitu paket diserahkan ke J&T."}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
