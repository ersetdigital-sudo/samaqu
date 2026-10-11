"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSafeLocale } from "@/lib/safe-i18n";
import { statusInfo, tglJamID, rupiah } from "@/lib/akun-format";

export interface StrukOrderItem {
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  product_image?: string;
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
  order_items: StrukOrderItem[];
}

/** Foto bawaan untuk item pesanan yang tidak menyimpan gambar produknya. */
const FALLBACK_PHOTO =
  "https://media.base44.com/images/public/6ac9c2148b24683dd1215a67/1c559b304_generated_5f8be940.jpg";

/* Gaya "Struk Hangat" — hanya dipakai halaman ini. Semua nilai mengikuti
   mockup yang disetujui; kelas diberi awalan `sk-` supaya tidak bertabrakan. */
const STRUK_CSS = `
.sk-root{position:relative;background:#F7F2E8;color:#1B1A17;font-weight:500;letter-spacing:-.01em}
@keyframes sk-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes sk-drift{from{transform:scale(1.04)}to{transform:scale(1)}}
.sk-up{opacity:0;animation:sk-up .7s cubic-bezier(.2,.7,.2,1) forwards}
.sk-d1{animation-delay:.05s}.sk-d2{animation-delay:.2s}.sk-d3{animation-delay:.35s}
.sk-d4{animation-delay:.5s}.sk-d5{animation-delay:.65s}.sk-d6{animation-delay:.8s}
.sk-top{display:flex;align-items:center;gap:12px;padding:14px 16px 12px;background:#F7F2E8;border-bottom:1px dashed #cfc3a8}
.sk-bk{width:38px;height:38px;border-radius:12px;background:#fff;border:1px solid #e3dac6;display:grid;place-items:center;cursor:pointer;transition:background .2s,box-shadow .2s}
.sk-bk:hover{background:#efe7d6}
.sk-bk:active{box-shadow:inset 0 2px 4px rgba(27,26,23,.15)}
.sk-bk:focus-visible{outline:2px solid #B4552F;outline-offset:2px}
.sk-top h1{font-size:17px;font-weight:600}
.sk-hero{position:relative;background:#ece3d0;padding:16px 16px 40px;overflow:hidden}
.sk-hero img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;background:#efe6d3;border-radius:14px;animation:sk-drift 1.4s ease-out both}
.sk-hero .sk-meta{position:relative;margin-top:14px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
.sk-no{font-size:22px;font-weight:600;letter-spacing:.03em;line-height:1.1}
.sk-dt{font-size:12px;color:#6b665a;margin-top:4px}
.sk-pill{background:#B4552F;color:#F7F2E8;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;white-space:nowrap}
.sk-tear{position:absolute;left:0;right:0;bottom:-1px;height:12px;background:radial-gradient(circle at 8px 12px,#F7F2E8 6px,transparent 6.5px) 0 0/16px 12px repeat-x}
.sk-sec{padding:20px 16px 4px}
.sk-sec h3{font-size:15px;font-weight:600;margin-bottom:14px}
.sk-bar{position:relative;display:flex;justify-content:space-between;gap:2px}
.sk-bar:before{content:"";position:absolute;left:8%;right:8%;top:8px;border-top:2px dashed #cfc3a8}
.sk-st{position:relative;width:20%;text-align:center}
.sk-dot{width:18px;height:18px;border-radius:50%;margin:0 auto 8px;position:relative;border:2px solid #cfc3a8;background:#F7F2E8}
.sk-dn .sk-dot{background:#6E7358;border-color:#6E7358}
.sk-dn .sk-dot:after{content:"";position:absolute;left:4px;top:1px;width:4px;height:8px;border:solid #F7F2E8;border-width:0 2px 2px 0;transform:rotate(45deg)}
.sk-ac .sk-dot{border-color:#B4552F;background:#F7F2E8}
.sk-ac .sk-dot:after{content:"";position:absolute;inset:3px;border-radius:50%;background:#B4552F}
.sk-st b{display:block;font-size:10.5px;font-weight:600;line-height:1.25;text-transform:lowercase}
.sk-st i{display:block;font-style:normal;font-size:9.5px;color:#6b665a;margin-top:3px;line-height:1.25;word-break:break-word}
.sk-td b{color:#9a9486}
.sk-rc{margin:20px 16px 0;background:#fffdf7;border:1px solid #e3dac6;border-radius:6px;padding:18px 16px 20px;box-shadow:0 8px 20px rgba(27,26,23,.07)}
.sk-rc h3{font-size:15px;font-weight:600;margin-bottom:12px}
.sk-row{display:flex;justify-content:space-between;font-size:14px;padding:6px 0}
.sk-row span:first-child{color:#6b665a}
.sk-row span:last-child{text-align:right;font-variant-numeric:tabular-nums}
.sk-ln{border-top:1px dashed #b9ad92;margin:10px 0}
.sk-tot{font-size:18px;font-weight:600}
.sk-tot span:first-child{color:#1B1A17}
.sk-tot span:last-child{color:#B4552F}
.sk-root details{margin:14px 16px 0;background:#fffdf7;border:1px solid #e3dac6;border-radius:12px}
.sk-root details summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:16px;font-size:15px;font-weight:600;transition:background .2s;border-radius:12px}
.sk-root details summary::-webkit-details-marker{display:none}
.sk-root details summary:hover{background:#f3ecdb}
.sk-root details summary:focus-visible{outline:2px solid #B4552F;outline-offset:2px}
.sk-root details summary svg{transition:transform .25s}
.sk-root details[open] summary svg{transform:rotate(180deg)}
.sk-it{display:flex;gap:12px;padding:0 16px 18px}
.sk-thumb{width:84px;height:84px;flex:none;border-radius:10px;background:#ece3d0;padding:4px}
.sk-thumb img{width:100%;height:100%;object-fit:contain;display:block}
.sk-it p{font-size:13px;color:#6b665a;line-height:1.45}
.sk-it .sk-nm{font-size:15px;font-weight:600;color:#1B1A17;margin-bottom:3px;line-height:1.3}
.sk-it .sk-pr{font-size:15px;font-weight:600;color:#B4552F;margin-top:6px}
.sk-ft{text-align:center;font-size:11px;color:#8a8473;padding:22px 16px 0}
.sk-act{position:sticky;bottom:62px;z-index:20;padding:12px 16px;background:#F7F2E8;border-top:1px dashed #b9ad92}
.sk-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;border-radius:999px;background:#1B1A17;color:#F7F2E8;font-size:14px;font-weight:600;text-decoration:none;cursor:pointer;transition:background .2s,box-shadow .2s}
.sk-btn:hover{background:#B4552F}
.sk-btn:active{box-shadow:inset 0 3px 6px rgba(0,0,0,.3)}
.sk-btn:focus-visible{outline:2px solid #B4552F;outline-offset:2px}
.sk-nr{margin-top:10px;text-align:center;font-size:12px;color:#6E7358;border:1px dashed #b9ad92;border-radius:10px;padding:8px}
@media (min-width:768px){.sk-act{position:static}}
`;

/** Header halaman detail pesanan (mobile). Sekaligus pemuat gaya "Struk Hangat". */
export function StrukHeader({ title, back }: { title: string; back?: string }) {
  const locale = useSafeLocale();
  const router = useRouter();
  const href = back ? `/${locale}${back}` : undefined;
  return (
    <>
      <style>{STRUK_CSS}</style>
      <div className="sk-top sk-up sk-d1 sticky top-0 z-30 md:hidden">
        <button
          type="button"
          onClick={() => (href ? router.push(href) : router.back())}
          className="sk-bk"
          aria-label="Kembali"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1B1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
        </button>
        <h1>{title}</h1>
      </div>
    </>
  );
}

export default function DetailPesananStruk({ order }: { order: StrukOrder }) {
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;

  const sc = statusInfo(order.status);
  const confirmed = order.created_at;
  const items = order.order_items || [];
  const steps: [string, string, string][] = [
    ["done", "Pesanan dikonfirmasi", tglJamID(confirmed)],
    ["done", "Pesanan diproses", tglJamID(order.updated_at || confirmed)],
    [order.status === "dikirim" || order.status === "selesai" ? "done" : "active", "Diserahkan ke kurir", order.awb_no ? `Resi ${order.awb_no}` : "Menunggu"],
    [order.status === "selesai" ? "done" : order.status === "dikirim" ? "active" : "todo", "Dalam perjalanan", order.status === "dikirim" ? "Sedang dikirim" : "-"],
    [order.status === "selesai" ? "done" : "todo", "Pesanan diterima", order.status === "selesai" ? "Selesai" : "Estimasi menyusul"],
  ];
  const heroItem = items[0];

  return (
    <div className="sk-root -mx-4 -mt-4 md:mx-auto md:mt-0 md:max-w-[560px]">
      <StrukHeader title="Detail Pesanan" back="/akun/pesanan" />

      <div className="sk-hero sk-up sk-d2">
        <img src={heroItem?.product_image || FALLBACK_PHOTO} alt={heroItem?.product_name || `Pesanan ${order.order_number}`} />
        <div className="sk-meta">
          <div>
            <div className="sk-no">#{order.order_number}</div>
            <div className="sk-dt">{tglJamID(order.created_at)}</div>
          </div>
          <span className="sk-pill">{sc.label}</span>
        </div>
        <div className="sk-tear" />
      </div>

      <div className="sk-sec sk-up sk-d3">
        <h3>Status Pesanan</h3>
        <div className="sk-bar">
          {steps.map(([state, label, sub], i) => (
            <div key={i} className={`sk-st ${state === "done" ? "sk-dn" : state === "active" ? "sk-ac" : "sk-td"}`}>
              <div className="sk-dot" />
              <b>{label}</b>
              <i>{sub}</i>
            </div>
          ))}
        </div>
      </div>

      <div className="sk-rc sk-up sk-d4">
        <h3>Ringkasan Pembayaran</h3>
        <div className="sk-row"><span>Subtotal</span><span>{rupiah(order.subtotal)}</span></div>
        <div className="sk-row"><span>Ongkos Kirim</span><span>{rupiah(order.shipping_cost)}</span></div>
        {order.discount ? (
          <div className="sk-row"><span>Diskon</span><span>-{rupiah(order.discount)}</span></div>
        ) : null}
        <div className="sk-ln" />
        <div className="sk-row sk-tot"><span>Total</span><span>{rupiah(order.total)}</span></div>
      </div>

      <details open className="sk-up sk-d5">
        <summary>
          Informasi Produk
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        {items.map((it, i) => (
          <div key={i} className="sk-it">
            <div className="sk-thumb">
              <img src={it.product_image || FALLBACK_PHOTO} alt={it.product_name} />
            </div>
            <div>
              <p className="sk-nm">{it.product_name}</p>
              <p>{it.color ? `Varian: ${it.color}` : ""}{it.size ? ` • Size ${it.size}` : ""}</p>
              <p>Qty: {it.quantity}</p>
              <p className="sk-pr">{rupiah(it.price)}</p>
            </div>
          </div>
        ))}
      </details>

      <p className="sk-ft sk-up sk-d6 md:hidden">&copy; 2026 SAMAQU. All rights reserved.</p>

      <div className="sk-act sk-up sk-d6">
        {order.awb_no ? (
          <Link href={to(`/akun/pesanan/${order.order_number}/lacak`)} className="sk-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg>
            Lacak Pesanan
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
          </Link>
        ) : (
          <div className="sk-nr">Nomor resi belum tersedia.</div>
        )}
      </div>
    </div>
  );
}
