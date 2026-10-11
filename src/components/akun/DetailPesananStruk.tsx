"use client";

import Link from "next/link";
import { useSafeLocale } from "@/lib/safe-i18n";
import { strukStatus, strukSteps, tglJamID, rupiah } from "@/lib/akun-format";
import { usePaymentMethodName } from "@/lib/use-payment-methods";
import { STRUK_CSS, StrukHeader, StrukTitle } from "./StrukShell";

export interface StrukOrderItem {
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  product_image?: string;
  kain?: string | null;
  series?: string | null;
}

export interface StrukOrder {
  order_number: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  status: string;
  created_at: string;
  awb_no?: string | null;
  updated_at?: string;
  payment_method?: string | null;
  shipping_method?: string | null;
  order_items: StrukOrderItem[];
}

/** Foto cadangan kalau baris pesanan tidak punya gambar dan katalog tidak ketemu. */
const FALLBACK_PHOTO =
  "https://media.base44.com/images/public/6ac9c2148b24683dd1215a67/1c559b304_generated_5f8be940.jpg";

const VARIAN_LINE = (item: StrukOrderItem) =>
  [item.color && `Varian: ${item.color}`, item.size && `Size ${item.size}`, `Qty ${item.quantity}`]
    .filter(Boolean)
    .join(" • ");

export default function DetailPesananStruk({ order }: { order: StrukOrder }) {
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;

  const { name: paymentName } = usePaymentMethodName(order.payment_method);
  const sc = strukStatus(order.status);
  const steps = strukSteps(order);
  const items = order.order_items || [];
  const heroItem = items[0];
  const heroPhoto = heroItem?.product_image || FALLBACK_PHOTO;

  return (
    <div className="sk-root -mx-4 -mt-4 md:mx-0 md:mt-0">
      <style>{STRUK_CSS}</style>
      <StrukHeader title="Detail Pesanan" back="/akun/pesanan" />

      <div className="sk-wrap sk-body">
        <StrukTitle title="Detail Pesanan" back={to("/akun/pesanan")} backLabel="Pesanan Saya" />

        <div className="sk-cols">
          <section className="sk-hero sk-up sk-d2">
            <div className="sk-shot">
              <img src={heroPhoto} alt={heroItem?.product_name || `Pesanan ${order.order_number}`} />
              <span className={`sk-chip sk-t-${sc.tone}`}>
                <span className="sk-dot" />
                {sc.label}
              </span>
            </div>
            <div className="sk-meta">
              <div>
                <p className="sk-eyebrow">Nomor Pesanan</p>
                <p className="sk-no">#{order.order_number}</p>
                <p className="sk-dt">{tglJamID(order.created_at)}</p>
              </div>
              <div className="sk-mini">
                <p className="sk-eyebrow">Total</p>
                <b>{rupiah(order.total)}</b>
              </div>
            </div>
          </section>

          <section className="sk-card sk-tl sk-up sk-d3">
            <h3>Status Pesanan</h3>
            <div className="sk-steps">
              {steps.map((step, i) => (
                <div key={step.label} className={`sk-step is-${step.state}`}>
                  <div className="sk-rail">
                    <span className="sk-node" />
                    {i < steps.length - 1 ? <span className="sk-line" /> : null}
                  </div>
                  <div className="sk-txt">
                    <b>{step.label}</b>
                    <i>{step.sub}</i>
                  </div>
                </div>
              ))}
            </div>
            {sc.tone === "wait" ? (
              <p className="sk-hint">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                Pesanan ini belum dibayar. Selesaikan pembayaran supaya pesanan segera kami proses.
              </p>
            ) : null}
          </section>

          <section className="sk-card sk-pay sk-up sk-d4">
            <h3>Ringkasan Pembayaran</h3>
            <div className="sk-row"><span>Subtotal</span><span>{rupiah(order.subtotal)}</span></div>
            <div className="sk-row"><span>Ongkos Kirim</span><span>{rupiah(order.shipping_cost)}</span></div>
            {order.discount ? (
              <div className="sk-row"><span>Diskon</span><span>-{rupiah(order.discount)}</span></div>
            ) : null}
            <div className="sk-sep" />
            <div className="sk-total"><span>Total</span><b>{rupiah(order.total)}</b></div>
            <div className="sk-sep" />
            {paymentName ? (
              <div className="sk-row"><span>Metode Pembayaran</span><span>{paymentName}</span></div>
            ) : null}
            {order.shipping_method ? (
              <div className="sk-row"><span>Pengiriman</span><span>{order.shipping_method}</span></div>
            ) : null}
            {order.awb_no ? (
              <div className="sk-row"><span>Nomor Resi</span><span>{order.awb_no}</span></div>
            ) : null}
          </section>

          <details className="sk-info sk-up sk-d5" open>
            <summary>
              Informasi Produk ({items.length})
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8a8473" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            {items.map((item, i) => (
              <div key={`${item.product_name}-${i}`} className="sk-it">
                <div className="sk-thumb">
                  <img src={item.product_image || FALLBACK_PHOTO} alt={item.product_name} />
                </div>
                <div>
                  <p className="sk-nm">{item.product_name}</p>
                  <p>{VARIAN_LINE(item)}</p>
                  <p className="sk-pr">{rupiah(item.price)}</p>
                </div>
              </div>
            ))}
          </details>

          <p className="sk-ft sk-up sk-d6 md:hidden">&copy; 2026 SAMAQU. All rights reserved.</p>

          <div className="sk-act sk-up sk-d6">
            {order.awb_no ? (
              <Link href={to(`/akun/pesanan/${order.order_number}/lacak`)} className="sk-btn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg>
                Lacak Pesanan
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
              </Link>
            ) : (
              <div className="sk-note">Nomor resi belum tersedia. Kami kabari begitu paket diserahkan ke J&amp;T.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
