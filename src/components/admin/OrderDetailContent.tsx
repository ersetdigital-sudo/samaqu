"use client";

import { useState } from "react";
import { strukStatus, strukSteps, tglJamID, rupiah } from "@/lib/akun-format";
import type { TrackHistoryItem } from "@/lib/jnt/types";
import { isDelivered } from "@/lib/jnt/track-status";
import { PaymentMethodValue } from "@/components/admin/PaymentMethodsManager";
import { RINCIAN_CSS, FALLBACK_PHOTO } from "@/components/akun/RincianPesanan";
import { waNumber, waLink, pesanPembayaran } from "@/lib/whatsapp";

/**
 * Isi detail pesanan untuk dashboard admin — memakai susunan & gaya yang sama dengan
 * halaman detail pesanan customer (`RincianPesanan`), supaya yang dilihat admin seragam
 * dengan yang dilihat customer:
 *   banner status → Info Pengiriman → Alamat Pengiriman → produk + Total Pesanan →
 *   Status Pesanan (linimasa) → aksi.
 * Kelas `rp-` beserta CSS-nya diimpor dari komponen customer (satu sumber gaya); kontrol
 * khusus admin (ubah status, WhatsApp, cetak label, batalkan J&T, hapus) memakai kelas `od-`
 * yang didefinisikan di OD_CSS. Dipakai kedua dashboard admin (`/admin` dan `/[locale]/admin`).
 */

export interface AdminDetailItem {
  product_name: string;
  color: string;
  size: string;
  kain?: string | null;
  series?: string | null;
  quantity: number;
  price: number;
  customer_price: number | null;
  minimum_price: number | null;
  product_image?: string | null;
}

export interface AdminDetailOrder {
  order_number: string;
  status: string;
  created_at: string;
  /** Jam pembatalan yang akurat (kolom `orders.cancelled_at`), dibaca `strukSteps`. */
  cancelled_at?: string | null;
  /** Jam perubahan terakhir; cadangan jam pembatalan kalau `cancelled_at` masih kosong. */
  updated_at?: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  shipping_method?: string | null;
  payment_method?: string | null;
  awb_no?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_whatsapp?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_postal_code?: string | null;
  shipping_notes?: string | null;
  order_items?: AdminDetailItem[];
}

const OD_CSS = `
/* Tombol/aksi admin, ditempel di area aksi lembar struk. */
.od-root .rp-root{min-height:0;padding-bottom:0}
.od-root .rp-act{position:static;background:none;padding:16px}
.od-title{font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;color:#757575;margin-bottom:10px}
.od-chips{display:flex;flex-wrap:wrap;gap:8px}
.od-chip{font-size:12.5px;font-weight:700;padding:8px 14px;border-radius:10px;border:1px solid #E1E3E5;background:#fff;color:#5A6067;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.od-chip:hover{background:#F5F6F7}
.od-chip.is-on{background:#B4552F;border-color:#B4552F;color:#fff}
.od-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #F2F3F4}
.od-a{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;padding:10px 14px;border-radius:10px;border:1px solid #E1E3E5;background:#fff;color:#5A6067;text-decoration:none;cursor:pointer;transition:background .2s}
.od-a:hover{background:#F5F6F7}
.od-a.is-on{background:#FBF1EA;border-color:#E5C3B1;color:#B4552F}
/* Aksi utama drawer: pembuatan resi J&T ("Atur Pesanan"). */
.od-a-primary{background:#B4552F;border-color:#B4552F;color:#fff}
.od-a-primary:hover{background:#9E4826;border-color:#9E4826}
.od-a-primary:disabled{opacity:.6;cursor:default}
.od-a-primary:disabled:hover{background:#B4552F;border-color:#B4552F}
.od-a-danger{border-color:#EBC7C0;color:#B4392A}
.od-a-danger:hover{background:#FCF0EA}
.od-email{display:block;font-size:12.5px;color:#8D9297;font-weight:500;margin-top:2px}
/* Pelacakan J&T di dalam drawer (tombol "Lacak Paket"). */
.od-track{margin-top:14px;padding-top:14px;border-top:1px solid #F2F3F4}
.od-tnote{margin:0;font-size:12.5px;font-weight:600;color:#8D9297}
.od-ups{display:flex;flex-direction:column;gap:12px}
.od-up{display:flex;gap:10px}
.od-up-dot{width:10px;height:10px;border-radius:50%;background:#D9DCE0;flex:none;margin-top:4px}
.od-up.is-first .od-up-dot{background:#B4552F;box-shadow:0 0 0 3px rgba(180,85,47,.14)}
.od-up b{display:block;font-size:12.5px;font-weight:700;color:#3F454B}
.od-up i{display:block;font-size:11.5px;font-style:normal;color:#8D9297;margin-top:2px}
/* Mobile: drawer admin bukan halaman customer — latar abu (dan ruangnya) dibuang supaya
   isi struk duduk langsung di kertas drawer, dan banner status menempel rapi di bawah
   header drawer (tanpa celah + sudut). Kartu putih di bawahnya jadi sama seperti kartu
   dashboard admin. */
@media (max-width:767.98px){
 .od-root .rp-root{background:transparent;padding-bottom:0}
 .od-root .rp-banner{margin-top:0;border-radius:0;padding:15px 16px}
 /* Panel aksi: chip status rata 2×2 dan tombol selebar kartu — di layar sempit
    baris tombol ala flex-wrap jadi pincang (3 chip + 1, tombol lebarnya beda-beda). */
 .od-chips{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 .od-chip{padding:11px 10px}
 .od-acts{flex-direction:column;align-items:stretch;gap:8px}
 .od-a{justify-content:center;padding:12px 14px}
}
@media (min-width:768px){
 .od-root .rp-root{background:transparent}
 /* Drawer = kertasnya sendiri. Dulu struk di sini masih jadi "lembar 600px terpusat" dengan
    sisa ruang krem di kiri-kanannya — di dalam drawer itu bikin panel terasa lebar & tampak
    bertumpuk. Sekarang isi struk mengisi lebar drawer; pemisah putus-putusnya tetap memberi
    rasa struk. */
 .od-root .rp-wrap{max-width:none}
 .od-root .rp-sheet{background:transparent;border:0;border-radius:0;box-shadow:none}
 .od-root .rp-act{padding:16px 20px 20px}
 .od-acts{border-top-color:rgba(42,33,27,.09)}
}
`;

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

/** J&T mengirim "YYYY-MM-DD HH:mm:ss"; jadikan ISO supaya stabil di semua browser. */
function waktu(value?: string) {
  if (!value) return "";
  const stamp = tglJamID(value.includes("T") ? value : value.replace(" ", "T"));
  return stamp === "-" ? value : stamp;
}

const WHATSAPP_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.885 3.488";

export default function OrderDetailContent({
  order,
  onStatusChange,
  onCancelJnt,
  onDelete,
  onArrangeOrder,
}: {
  order: AdminDetailOrder;
  onStatusChange: (status: string) => void;
  onCancelJnt?: () => void;
  onDelete: () => void;
  /** "Atur Pesanan": buat resi J&T setelah pembayaran diverifikasi (ala Shopee). */
  onArrangeOrder?: () => Promise<void> | void;
}) {
  const sc = strukStatus(order.status);
  const steps = strukSteps(order);
  const items = order.order_items || [];
  const resi = order.awb_no || "";
  const wa = waNumber(order.customer_whatsapp);
  // Pesan chat sudah terisi (satu teks standar untuk semua pesanan) supaya admin tinggal
  // kirim — teksnya di `pesanPembayaran`, hanya nama panggilan pelanggan yang berubah.
  const waPesan = pesanPembayaran(order.customer_name);
  const alamat = [order.shipping_address, order.shipping_city, order.shipping_postal_code].filter(Boolean).join(", ");

  const [showAlamat, setShowAlamat] = useState(false);

  // "Atur Pesanan" — pembuatan resi J&T manual, dan hanya untuk pesanan yang sudah diproses
  // admin (chip status → Diproses, ala Shopee): pesanan yang masih menunggu pembayaran belum
  // boleh menerbitkan resi. Selama proses, tombolnya dikunci supaya admin tidak menekan dua
  // kali (dua kali klik = dua pesanan J&T).
  const [arranging, setArranging] = useState(false);
  const canArrange = !resi && !!onArrangeOrder && order.status === "diproses";

  async function handleArrange() {
    if (!onArrangeOrder || arranging) return;
    setArranging(true);
    try {
      await onArrangeOrder();
    } finally {
      setArranging(false);
    }
  }

  // Pelacakan J&T — dibuka dari tombol "Lacak Paket". Data diambil sekali per drawer.
  const [showTrack, setShowTrack] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [trackHistory, setTrackHistory] = useState<TrackHistoryItem[] | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  async function openTrack() {
    if (showTrack) {
      setShowTrack(false);
      return;
    }
    setShowTrack(true);
    if (trackHistory || !resi) return;

    setTracking(true);
    setTrackError(null);
    try {
      const res = await fetch(`/api/jnt/track?awb=${encodeURIComponent(resi)}`);
      const json = await res.json();
      if (json?.success && json?.data) {
        const data = json.data as { history?: TrackHistoryItem[] };
        setTrackHistory(data.history || []);
        // Otomatis: paket sudah diterima penerima (status_code 200) → status pesanan jadi selesai.
        if (isDelivered(data) && ["pending", "diproses", "dikirim"].includes(order.status)) {
          onStatusChange("selesai");
        }
      } else {
        setTrackError(json?.error || "Data pelacakan J&T belum bisa diambil.");
      }
    } catch {
      setTrackError("Tidak bisa menghubungi layanan J&T. Coba lagi sebentar lagi.");
    } finally {
      setTracking(false);
    }
  }

  // J&T mengirim riwayat dari kejadian terlama; yang terbaru tampil di atas.
  const trackUpdates = trackHistory ? [...trackHistory].reverse() : [];

  return (
    <div className="od-root">
      <style>{RINCIAN_CSS}</style>
      <style>{OD_CSS}</style>

      <div className="rp-root">
        <div className="rp-wrap">
          <div className="rp-sheet">
            <section className={`rp-banner t-${sc.tone}`}>
              <span className="rp-bico">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
              </span>
              <div>
                <b>{sc.label}</b>
                <small>Dibuat {tglJamID(order.created_at)}</small>
              </div>
            </section>

            <section className="rp-card">
              <div className="rp-sec">
                <span className="rp-h">Info Pengiriman</span>
                <div className="rp-line" style={{ marginTop: 8 }}>
                  <span className="rp-sub">{order.shipping_method || "Pengiriman"}</span>
                </div>
                {/* Nomor resi J&T tampil sebagai baris tersendiri (dulu cuma ditempel di belakang
                    nama kurir, jadi terlihat seperti hilang). Resi tidak lagi terbit saat
                    checkout: admin menerbitkannya lewat tombol "Atur Pesanan" di bawah. */}
                {resi ? (
                  <div className="rp-line" style={{ marginTop: 8 }}>
                    <span className="rp-sub">Nomor Resi J&amp;T</span>
                    <span className="rp-strong rp-mono" style={{ marginLeft: "auto" }}>{resi}</span>
                  </div>
                ) : (
                  <div className="rp-line rp-sub" style={{ marginTop: 8 }}>
                    {/* Tombol "Atur Pesanan" hanya ada saat status Diproses, jadi petunjuknya ikut
                        menyesuaikan supaya tidak menyuruh klik tombol yang belum tampil. */}
                    <span>
                      {canArrange
                        ? <>Nomor resi belum dibuat. Klik &ldquo;Atur Pesanan&rdquo; untuk menerbitkan resi J&amp;T.</>
                        : <>Nomor resi diterbitkan setelah pesanan diproses (ubah status ke Diproses).</>}
                    </span>
                  </div>
                )}
              </div>

              {/* Metode pembayaran selalu terlihat (dulu hanya ada di dalam ringkasan "Total
                  Pesanan" yang terlipat), supaya admin tahu pembayarannya sebelum memproses. */}
              {order.payment_method ? (
                <div className="rp-sec" style={{ borderTop: "1px solid #F2F3F4" }}>
                  <span className="rp-h">Metode Pembayaran</span>
                  <div className="rp-line" style={{ marginTop: 8 }}>
                    <span className="rp-strong"><PaymentMethodValue value={order.payment_method} /></span>
                  </div>
                </div>
              ) : null}

              {alamat ? (
                <div className="rp-sec" style={{ borderTop: "1px solid #F2F3F4" }}>
                  <span className="rp-h">Alamat Pengiriman</span>
                  <div className="rp-line" style={{ marginTop: 9 }}>
                    <Pin />
                    <span className="rp-strong">
                      {order.customer_name || "Penerima"}
                      {order.customer_whatsapp ? ` · ${order.customer_whatsapp}` : ""}
                      {order.customer_email ? <span className="od-email">{order.customer_email}</span> : null}
                    </span>
                  </div>
                  <div className="rp-line" style={{ marginTop: 6 }}>
                    <span className={`rp-addr${showAlamat ? " is-open" : ""}`}>{alamat}</span>
                    <button type="button" className="rp-lihat" onClick={() => setShowAlamat((v) => !v)}>
                      {showAlamat ? "Tutup" : "Lihat"}
                    </button>
                  </div>
                  {order.shipping_notes ? (
                    <div className="rp-line" style={{ marginTop: 8 }}>
                      <span className="rp-sub">
                        Catatan: <span className="rp-strong">{order.shipping_notes}</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rp-card">
              {items.length > 0 ? (
                items.map((item, i) => (
                  <div key={`${item.product_name}-${i}`} className="rp-it">
                    <div className="rp-thumb">
                      <img src={item.product_image || FALLBACK_PHOTO} alt={item.product_name} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="rp-nm">{item.product_name}</p>
                      <p className="rp-var">
                        {[item.kain ? `Kain ${item.kain}` : null, item.series, item.color && item.color !== "default" ? item.color : null, item.size].filter(Boolean).join(" · ")} &times; {item.quantity}
                      </p>
                      <p className="rp-pr rp-mono">{rupiah(item.price * item.quantity)}</p>
                      {item.customer_price && item.minimum_price ? (
                        <p className="rp-var" style={{ color: "#B4552F", fontWeight: 600 }}>
                          Min: {rupiah(item.minimum_price)} &middot; Dipilih: {rupiah(item.customer_price)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rp-it">
                  <span className="rp-sub">Detail item tidak tersedia</span>
                </div>
              )}

              <details>
                <summary className="rp-sum">
                  Total Pesanan: <b className="rp-mono">{rupiah(order.total)}</b>
                  <Chevron />
                </summary>
                <div className="rp-sec rp-paysum">
                  {order.subtotal > 0 ? <div className="rp-row"><span>Subtotal</span><span className="rp-mono">{rupiah(order.subtotal)}</span></div> : null}
                  {order.shipping_cost > 0 ? <div className="rp-row"><span>Ongkos Kirim</span><span className="rp-mono">{rupiah(order.shipping_cost)}</span></div> : null}
                  {order.discount > 0 ? <div className="rp-row"><span>Diskon</span><span className="rp-mono">-{rupiah(order.discount)}</span></div> : null}
                  <div className="rp-sep" />
                  <div className="rp-row"><span className="rp-strong">Total</span><span className="rp-strong rp-mono">{rupiah(order.total)}</span></div>
                  {order.payment_method ? (
                    <div className="rp-row"><span>Metode Pembayaran</span><PaymentMethodValue value={order.payment_method} /></div>
                  ) : null}
                  {order.shipping_method ? (
                    <div className="rp-row"><span>Pengiriman</span><span>{order.shipping_method}</span></div>
                  ) : null}
                  {resi ? <div className="rp-row"><span>Nomor Resi</span><span>{resi}</span></div> : null}
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
              </div>
            </details>

            {/* Kontrol admin — bagian yang tidak ada di halaman customer. */}
            <div className="rp-act">
              <p className="od-title">Ubah Status</p>
              <div className="od-chips">
                {["pending", "diproses", "selesai", "dibatalkan"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`od-chip${order.status === s ? " is-on" : ""}`}
                    onClick={() => onStatusChange(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              <div className="od-acts">
                {canArrange ? (
                  <button type="button" className="od-a od-a-primary" onClick={handleArrange} disabled={arranging}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
                      <path d="m3 8 9 5 9-5" />
                      <path d="M12 13v8" />
                    </svg>
                    {arranging ? "Memproses…" : "Atur Pesanan"}
                  </button>
                ) : null}
                {wa ? (
                  <a href={waLink(order.customer_whatsapp, waPesan)} target="_blank" rel="noopener noreferrer" className="od-a">
                    <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d={WHATSAPP_PATH} /></svg>
                    Hubungi via WhatsApp
                  </a>
                ) : null}
                {resi ? (
                  <button type="button" className={`od-a${showTrack ? " is-on" : ""}`} onClick={openTrack}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
                    {showTrack ? "Tutup Lacak" : "Lacak Paket"}
                  </button>
                ) : null}
                {resi && order.status !== "dibatalkan" && onCancelJnt ? (
                  <button type="button" className="od-a od-a-danger" onClick={onCancelJnt}>
                    Batalkan J&amp;T
                  </button>
                ) : null}
                {resi ? (
                  <a href={`/admin/label/${order.order_number}`} target="_blank" rel="noopener noreferrer" className="od-a">
                    Cetak Label
                  </a>
                ) : null}
                <button type="button" className="od-a od-a-danger" onClick={onDelete}>
                  Hapus Pesanan
                </button>
              </div>

              {/* Pelacakan J&T: riwayat perjalanan paket. Begitu J&T melaporkan paket
                  diterima (status_code 200), status pesanan otomatis diubah ke selesai. */}
              {showTrack ? (
                <div className="od-track">
                  <p className="od-title">Riwayat Pengiriman</p>
                  {tracking ? (
                    <p className="od-tnote">Memuat pelacakan J&amp;T…</p>
                  ) : trackError ? (
                    <p className="od-tnote">{trackError}</p>
                  ) : trackUpdates.length > 0 ? (
                    <div className="od-ups">
                      {trackUpdates.map((u, i) => (
                        <div key={`${u.date_time}-${i}`} className={`od-up${i === 0 ? " is-first" : ""}`}>
                          <span className="od-up-dot" />
                          <div>
                            <b>{u.status || "Update pengiriman"}</b>
                            <i>{[u.city_name, waktu(u.date_time)].filter(Boolean).join(" • ")}</i>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="od-tnote">Belum ada update dari J&amp;T. Riwayat muncul setelah kurir memindai paket.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
