"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSafeLocale } from "@/lib/safe-i18n";
import { strukStatus, strukSteps, tglJamID, rupiah } from "@/lib/akun-format";
import { usePaymentMethodName } from "@/lib/use-payment-methods";
import type { TrackHistoryItem } from "@/lib/jnt/types";

export interface RincianOrderItem {
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  product_image?: string;
  kain?: string | null;
  series?: string | null;
}

export interface RincianOrder {
  order_number: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  status: string;
  created_at: string;
  updated_at?: string;
  awb_no?: string | null;
  payment_method?: string | null;
  shipping_method?: string | null;
  customer_name?: string | null;
  customer_whatsapp?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_postal_code?: string | null;
  order_items: RincianOrderItem[];
}

/** Foto cadangan kalau baris pesanan tidak punya gambar dan katalog tidak ketemu. */
const FALLBACK_PHOTO =
  "https://media.base44.com/images/public/6ac9c2148b24683dd1215a67/1c559b304_generated_5f8be940.jpg";

/**
 * Gaya halaman rincian pesanan: kartu putih di atas latar abu terang, mengikuti
 * tata letak halaman pesanan marketplace (banner status → info pengiriman → alamat →
 * produk → bantuan → aksi bawah). Semua kelas berawalan `rp-` dan hanya hidup di
 * dalam <style> ini, jadi tidak menyentuh halaman akun lain.
 */
export const RINCIAN_CSS = `
.rp-root{background:#F5F6F7;color:#22262A;font-weight:500;letter-spacing:-.005em;min-height:70vh;padding-bottom:8px}
.rp-wrap{max-width:680px;margin:0 auto}
.rp-card{background:#fff;border:1px solid #ECEDEE;border-radius:12px;margin-top:10px;overflow:hidden}
.rp-sec{padding:14px 16px}
.rp-h{font-size:14px;font-weight:700;letter-spacing:-.01em;display:block}
.rp-sub{color:#757575}
.rp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.rp-mono{font-variant-numeric:tabular-nums}

/* ── Header mobile ── */
.rp-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border-bottom:1px solid #ECEDEE}
.rp-bk{width:36px;height:36px;flex:none;border-radius:10px;border:1px solid #E6E7E8;background:#fff;display:grid;place-items:center;cursor:pointer;transition:background .2s,transform .2s}
.rp-bk:hover{background:#F5F6F7}
.rp-bk:active{transform:scale(.95)}
.rp-bk:focus-visible{outline:2px solid #B4552F;outline-offset:2px}
.rp-top h1{font-size:16px;font-weight:700;letter-spacing:-.01em}

/* ── Judul desktop (sidebar akun sudah punya header sendiri) ── */
.rp-dhead{display:none}

/* ── Banner status ── */
.rp-banner{margin-top:10px;border-radius:12px;padding:16px;color:#fff;background:#B4552F;display:flex;align-items:center;gap:12px}
.rp-banner b{display:block;font-size:17px;font-weight:800;letter-spacing:-.015em}
.rp-banner small{display:block;font-size:12.5px;opacity:.86;margin-top:3px}
.rp-banner .rp-bico{flex:none;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center}
.rp-banner.t-wait{background:#B4552F}
.rp-banner.t-process{background:#B08148}
.rp-banner.t-ship{background:#3F6EA8}
.rp-banner.t-done{background:#3E6B57}
.rp-banner.t-cancel{background:#8B4A42}

/* ── Baris info pengiriman / alamat ── */
.rp-line{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.5}
.rp-line + .rp-line{margin-top:8px}
.rp-line svg{flex:none;margin-top:2px}
.rp-ico{color:#9AA0A5}
.rp-strong{font-weight:700}
.rp-addr{color:#5A6067;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rp-addr.is-open{display:block}
.rp-lihat{border:0;background:none;padding:0 0 0 4px;color:#B4552F;font-size:13px;font-weight:700;cursor:pointer}

/* ── Produk ── */
.rp-it{display:flex;gap:12px;padding:14px 16px}
.rp-it + .rp-it{border-top:1px solid #F2F3F4}
.rp-thumb{width:76px;height:76px;flex:none;border-radius:8px;overflow:hidden;background:#F6F7F8}
.rp-thumb img{width:100%;height:100%;object-fit:contain;display:block}
.rp-nm{font-size:13.5px;font-weight:700;line-height:1.4}
.rp-var{font-size:12.5px;color:#757575;margin-top:4px;line-height:1.45}
.rp-pr{font-size:13.5px;font-weight:700;margin-top:7px}
.rp-sum{display:flex;align-items:center;gap:8px;justify-content:flex-end;width:100%;padding:13px 16px;border-top:1px solid #F2F3F4;font-size:13.5px;cursor:pointer;list-style:none;background:#fff}
.rp-sum::-webkit-details-marker{display:none}
.rp-sum b{font-weight:800}
.rp-sum svg{margin-left:2px;color:#757575;transition:transform .2s}
.rp-card details[open] > .rp-sum svg,.rp-card[open] > .rp-sum svg{transform:rotate(180deg)}
.rp-paysum{background:#FAFBFC;border-top:1px solid #F2F3F4}
.rp-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:5px 0}
.rp-row span:first-child{color:#757575}
.rp-row span:last-child{text-align:right;font-weight:600}
.rp-sep{border-top:1px dashed #DDE0E2;margin:9px 0}

/* ── Linimasa status ── */
.rp-steps{display:flex;flex-direction:column}
.rp-step{display:flex;gap:12px}
.rp-rail{display:flex;flex-direction:column;align-items:center;width:20px;flex:none}
.rp-node{width:20px;height:20px;border-radius:50%;border:2px solid #D8DBDE;background:#fff;display:grid;place-items:center;flex:none}
.rp-step.is-done .rp-node{background:#3E6B57;border-color:#3E6B57}
.rp-step.is-done .rp-node:after{content:"";width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-2px)}
.rp-step.is-active .rp-node{border-color:#B4552F;box-shadow:0 0 0 4px rgba(180,85,47,.12)}
.rp-step.is-active .rp-node:after{content:"";width:7px;height:7px;border-radius:50%;background:#B4552F}
.rp-rail-line{flex:1;width:2px;background:#E9EBED;margin:3px 0;border-radius:2px}
.rp-txt{padding-bottom:16px;min-width:0}
.rp-step:last-child .rp-txt{padding-bottom:0}
.rp-txt b{display:block;font-size:13.5px;font-weight:700}
.rp-step.is-todo .rp-txt b{color:#A9AEB3;font-weight:600}
.rp-txt i{display:block;font-style:normal;font-size:12px;color:#8D9297;margin-top:2px}
.rp-step.is-active .rp-txt i{color:#B4552F;font-weight:600}
.rp-hint{display:flex;gap:9px;align-items:flex-start;margin-top:14px;padding:11px 13px;border-radius:10px;background:#FCF0EA;color:#9A4622;font-size:12.5px;line-height:1.45;font-weight:600}
.rp-hint svg{flex:none;margin-top:1px}

/* ── Butuh bantuan ── */
.rp-list{list-style:none;margin:0;padding:0}
.rp-link{display:flex;align-items:center;gap:11px;padding:14px 16px;font-size:13.5px;font-weight:600;color:#22262A;text-decoration:none}
.rp-link + .rp-link{border-top:1px solid #F2F3F4}
.rp-link:active{background:#FAFBFC}
.rp-link svg{margin-left:auto;color:#BFC4C8}

/* ── Aksi bawah ── */
.rp-act{position:sticky;bottom:var(--mobile-nav-h,62px);z-index:20;padding:10px 0 14px;background:linear-gradient(180deg,rgba(245,246,247,0),#F5F6F7 40%)}
.rp-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:15px;border-radius:12px;background:#B4552F;color:#fff;font-size:14.5px;font-weight:700;text-decoration:none;cursor:pointer;border:0;box-shadow:0 10px 22px rgba(180,85,47,.24);transition:background .2s,transform .2s}
.rp-btn:hover{background:#9E4A29}
.rp-btn:active{transform:scale(.99)}
.rp-btn:focus-visible{outline:2px solid #B4552F;outline-offset:2px}
.rp-note{padding:12px 14px;border-radius:10px;background:#fff;border:1px solid #ECEDEE;color:#757575;font-size:12.5px;text-align:center}
.rp-ft{text-align:center;font-size:11px;color:#9AA0A5;padding:16px 0 0}

@media (min-width:768px){
 .rp-top{display:none}
 .rp-dhead{display:flex;align-items:center;gap:14px;margin-bottom:12px}
 .rp-dhead h1{font-size:22px;font-weight:800;letter-spacing:-.025em}
 .rp-dhead a{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#757575;text-decoration:none}
 .rp-dhead a:hover{color:#B4552F}
 .rp-card{margin-top:14px}
 .rp-banner{margin-top:14px}
 .rp-act{position:static;padding:14px 0 0;background:none}
 .rp-ft{display:none}
}
`;

/** Header halaman rincian (mobile). Sekaligus pemuat gaya halaman ini. */
export function RincianHeader({ title = "Detail Pesanan", back }: { title?: string; back: string }) {
  const locale = useSafeLocale();
  const href = `/${locale}${back}`;

  return (
    <>
      <style>{RINCIAN_CSS}</style>
      <div className="rp-top rp-md-hide">
        <Link href={href} className="rp-bk" aria-label="Kembali">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22262A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
        </Link>
        <h1>{title}</h1>
      </div>
    </>
  );
}

function Pin() {
  return (
    <svg className="rp-ico" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
  );
}

const VARIAN_LINE = (item: RincianOrderItem) =>
  [item.color, item.size && `Size ${item.size}`, `x${item.quantity}`].filter(Boolean).join(" • ");

export default function RincianPesanan({ order }: { order: RincianOrder }) {
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;

  const { name: paymentName } = usePaymentMethodName(order.payment_method);
  const sc = strukStatus(order.status);
  const steps = strukSteps(order);
  const items = order.order_items || [];

  const resi = order.awb_no || "";
  const alamat = [order.shipping_address, order.shipping_city, order.shipping_postal_code]
    .filter(Boolean)
    .join(", ");

  const [showAlamat, setShowAlamat] = useState(false);
  const [latest, setLatest] = useState<TrackHistoryItem | null>(null);

  // Satu baris status kirim terakhir di blok "Info Pengiriman" — sama seperti halaman lacak.
  useEffect(() => {
    if (!resi) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/jnt/track?awb=${encodeURIComponent(resi)}`);
        const json = await res.json();
        const history: TrackHistoryItem[] = json?.data?.history || [];
        if (alive && history.length) setLatest(history[history.length - 1]);
      } catch {
        /* status kirim cuma pelengkap — biarkan kosong kalau J&T tidak menjawab */
      }
    })();
    return () => {
      alive = false;
    };
  }, [resi]);

  return (
    <div className="rp-root -mx-4 -mt-4 md:mx-0 md:mt-0">
      <style>{RINCIAN_CSS}</style>
      <RincianHeader title="Detail Pesanan" back="/akun/pesanan" />

      <div className="rp-wrap">
        <div className="rp-dhead">
          <h1>Detail Pesanan</h1>
          <Link href={to("/akun/pesanan")}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
            Pesanan Saya
          </Link>
        </div>

        <section className={`rp-banner t-${sc.tone}`}>
          <span className="rp-bico">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
          </span>
          <div>
            <b>{sc.label}</b>
            <small>#{order.order_number} • {tglJamID(order.created_at)}</small>
          </div>
        </section>

        <section className="rp-card">
          <div className="rp-sec">
            <span className="rp-h">Info Pengiriman</span>
            <div className="rp-line" style={{ marginTop: 8 }}>
              <span className="rp-sub">
                {order.shipping_method || "Pengiriman"}
                {resi ? `: ${resi}` : ""}
              </span>
            </div>
            {latest ? (
              <>
                <div className="rp-line" style={{ color: "#B4552F", fontWeight: 600 }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
                  <span>{[latest.status, latest.city_name].filter(Boolean).join(" — ")}</span>
                </div>
                <div className="rp-line rp-sub" style={{ marginLeft: 27 }}>
                  <span>{latest.date_time}</span>
                </div>
              </>
            ) : (
              <div className="rp-line rp-sub" style={{ marginTop: 8 }}>
                <span>
                  {resi
                    ? "Belum ada update dari J&T. Riwayat muncul setelah kurir memindai paket."
                    : "Resi belum tersedia. Kami kabari begitu paket diserahkan ke J&T."}
                </span>
              </div>
            )}
          </div>

          {alamat ? (
            <div className="rp-sec" style={{ borderTop: "1px solid #F2F3F4" }}>
              <span className="rp-h">Alamat Pengiriman</span>
              <div className="rp-line" style={{ marginTop: 9 }}>
                <Pin />
                <span className="rp-strong">
                  {order.customer_name || "Penerima"}
                  {order.customer_whatsapp ? ` · ${order.customer_whatsapp}` : ""}
                </span>
              </div>
              <div className="rp-line" style={{ marginTop: 6 }}>
                <span className={`rp-addr${showAlamat ? " is-open" : ""}`}>{alamat}</span>
                <button type="button" className="rp-lihat" onClick={() => setShowAlamat((v) => !v)}>
                  {showAlamat ? "Tutup" : "Lihat"}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rp-card">
          {items.map((item, i) => (
            <div key={`${item.product_name}-${i}`} className="rp-it">
              <div className="rp-thumb">
                <img src={item.product_image || FALLBACK_PHOTO} alt={item.product_name} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="rp-nm">{item.product_name}</p>
                <p className="rp-var">{VARIAN_LINE(item)}</p>
                <p className="rp-pr rp-mono">{rupiah(item.price)}</p>
              </div>
            </div>
          ))}

          <details>
            <summary className="rp-sum">
              Total Pesanan: <b className="rp-mono">{rupiah(order.total)}</b>
              <Chevron />
            </summary>
            <div className="rp-sec rp-paysum">
              <div className="rp-row"><span>Subtotal</span><span className="rp-mono">{rupiah(order.subtotal)}</span></div>
              <div className="rp-row"><span>Ongkos Kirim</span><span className="rp-mono">{rupiah(order.shipping_cost)}</span></div>
              {order.discount ? (
                <div className="rp-row"><span>Diskon</span><span className="rp-mono">-{rupiah(order.discount)}</span></div>
              ) : null}
              <div className="rp-sep" />
              <div className="rp-row"><span className="rp-strong">Total</span><span className="rp-strong rp-mono">{rupiah(order.total)}</span></div>
              {paymentName ? (
                <div className="rp-row"><span>Metode Pembayaran</span><span>{paymentName}</span></div>
              ) : null}
              {order.shipping_method ? (
                <div className="rp-row"><span>Pengiriman</span><span>{order.shipping_method}</span></div>
              ) : null}
              {resi ? (
                <div className="rp-row"><span>Nomor Resi</span><span>{resi}</span></div>
              ) : null}
            </div>
          </details>
        </section>

        <details className="rp-card">
          <summary className="rp-sum">
            Status Pesanan <Chevron />
          </summary>
          <div className="rp-sec">
            <div className="rp-steps">
              {steps.map((step, i) => (
                <div key={step.label} className={`rp-step is-${step.state}`}>
                  <div className="rp-rail">
                    <span className="rp-node" />
                    {i < steps.length - 1 ? <span className="rp-rail-line" /> : null}
                  </div>
                  <div className="rp-txt">
                    <b>{step.label}</b>
                    <i>{step.sub}</i>
                  </div>
                </div>
              ))}
            </div>
            {sc.tone === "wait" ? (
              <p className="rp-hint">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                Pesanan ini belum dibayar. Selesaikan pembayaran supaya pesanan segera kami proses.
              </p>
            ) : null}
          </div>
        </details>

        <section className="rp-card">
          <div className="rp-sec" style={{ paddingBottom: 4 }}>
            <span className="rp-h">Butuh Bantuan?</span>
          </div>
          <ul className="rp-list">
            <li>
              <Link href={to("/garansi-retur")} className="rp-link">
                <svg className="rp-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
                Garansi &amp; Pengembalian
                <Chevron />
              </Link>
            </li>
            <li>
              <Link href={to("/akun/bantuan")} className="rp-link">
                <svg className="rp-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 1 1-3.2-6.4" /><path d="M8 11h8M8 15h5" /></svg>
                Hubungi Admin
                <Chevron />
              </Link>
            </li>
            <li>
              <Link href={to("/akun/panduan-ukuran")} className="rp-link">
                <svg className="rp-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14 14 3l7 7L10 21z" /><path d="M7.5 12.5 9 14M10.5 9.5 12 11" /></svg>
                Panduan Ukuran
                <Chevron />
              </Link>
            </li>
          </ul>
        </section>

        <p className="rp-ft md:hidden">&copy; 2026 SAMAQU. All rights reserved.</p>

        <div className="rp-act">
          {resi ? (
            <Link href={to(`/akun/pesanan/${order.order_number}/lacak`)} className="rp-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
              Lacak Pesanan
            </Link>
          ) : (
            <div className="rp-note">Nomor resi belum tersedia. Kami kabari begitu paket diserahkan ke J&amp;T.</div>
          )}
        </div>
      </div>
    </div>
  );
}
