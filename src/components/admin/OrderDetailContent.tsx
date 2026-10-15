"use client";

import { useState, useEffect, useMemo } from "react";
import { strukStatus, strukSteps, tglJamID, rupiah } from "@/lib/akun-format";
import type { TrackHistoryItem } from "@/lib/jnt/types";
import {
  censorReceiverPII,
  formatTrackingTime,
  sortHistoryDesc,
  trackingRow,
  trackingSummary,
} from "@/lib/jnt/track-status";
import { shippingStatusOf, SHIPPING_STATUS_LABEL } from "@/lib/order-flow";
import { useSafeTranslations } from "@/lib/safe-i18n";
import { PaymentMethodValue } from "@/components/admin/PaymentMethodsManager";
import { RINCIAN_CSS, FALLBACK_PHOTO } from "@/components/akun/RincianPesanan";
import { waNumber, waLink, pesanPembayaran } from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase";
import {
  formatWeightExact,
  productWeightMapFromRows,
  resolveLineWeight,
  variantWeightMapFromRows,
  type ResolvedLineWeight,
} from "@/lib/shipping-weight";
import { OPEN_ORDER_ADDON, resolveAddonWeight } from "@/lib/open-order-config";
import { useStoreSettings } from "@/lib/store-settings";

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
  product_id?: string | null;
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
  /** Berat kirim pesanan (gram) — kolom `orders.weight`. */
  weight?: number | null;
  /** Status pengiriman terpisah dari status pesanan (menunggu_pickup | dikirim | selesai). */
  shipping_status?: string | null;
  tracking_status_text?: string | null;
  /** Kode pemindaian terakhir — dipakai mendeteksi status tertunda (badge "Tertunda"). */
  tracking_status_code?: number | null;
  tracking_city?: string | null;
  tracking_updated_at?: string | null;
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

const WHATSAPP_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.885 3.488";

export default function OrderDetailContent({
  order,
  onStatusChange,
  onCancelJnt,
  onDelete,
  onArrangeOrder,
  onSynced,
}: {
  order: AdminDetailOrder;
  onStatusChange: (status: string) => void;
  onCancelJnt?: () => void;
  onDelete: () => void;
  /** "Atur Pesanan": buat resi J&T setelah pembayaran diverifikasi (ala Shopee). */
  onArrangeOrder?: () => Promise<void> | void;
  /** Dipanggil setelah "Lacak Paket" menyinkronkan status dari J&T (server). */
  onSynced?: (patch: { status?: string; shipping_status?: string | null }) => void;
}) {
  const sc = strukStatus(order.status);
  const steps = strukSteps(order);
  const items = order.order_items || [];
  const resi = order.awb_no || "";
  const wa = waNumber(order.customer_whatsapp);
  // Pesan chat sudah terisi (satu teks standar untuk semua pesanan) supaya admin tinggal
  // kirim — teksnya di `pesanPembayaran`, hanya nama panggilan pelanggan dan nomor
  // pesanan yang berubah.
  const waPesan = pesanPembayaran(order.customer_name, order.order_number);
  const alamat = [order.shipping_address, order.shipping_city, order.shipping_postal_code].filter(Boolean).join(", ");

  const [showAlamat, setShowAlamat] = useState(false);

  // Rincian berat (internal admin): pesanan Open Order bisa memuat add-on "Extra Cover & Hanger"
  // — satu baris `order_items` ber-id "addon-cover-hanger". Berat add-on mengikuti setting admin
  // (`store_settings.open_order_addon_weight`), dipakai memisah berat produk vs berat add-on.
  const settings = useStoreSettings();
  const addonWeight = resolveAddonWeight(settings.open_order_addon_weight);
  const hasAddon = items.some((it) => it.product_id === OPEN_ORDER_ADDON.id);

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
  /** Respons J&T apa adanya (untuk tombol "Lihat data mentah"). */
  const [trackRaw, setTrackRaw] = useState<unknown>(null);
  /** Kapan data diambil dari J&T. */
  const [trackFetchedAt, setTrackFetchedAt] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const t = useSafeTranslations("tracking");

  // Berat per ITEM (gram) — dihitung dari `product_variants.weight` (per produk + warna + ukuran);
  // `products.weight` hanya cadangan. `order_items` tidak menyimpan berat, jadi dihitung saat dibuka.
  const [itemWeights, setItemWeights] = useState<Record<string, ResolvedLineWeight>>({});
  useEffect(() => {
    const items = order.order_items || [];
    const ids = Array.from(new Set(items.map((it) => it.product_id).filter((x): x is string => !!x)));
    if (ids.length === 0) return;
    let active = true;
    Promise.all([
      supabase.from("products").select("id, weight").in("id", ids),
      supabase.from("product_variants").select("product_id, color, size, weight").in("product_id", ids),
    ]).then(([pRes, vRes]) => {
      if (!active) return;
      const productWeights = productWeightMapFromRows(pRes.data);
      const variantWeights = variantWeightMapFromRows(vRes.data);
      const map: Record<string, ResolvedLineWeight> = {};
      for (const it of items) {
        const resolved = resolveLineWeight(
          { productId: it.product_id, color: it.color, size: it.size },
          productWeights,
          variantWeights
        );
        map[`${it.product_id}|${it.color}|${it.size}`] = resolved;
        // Fallback TIDAK boleh diam-diam: catat di log supaya ketahuan.
        if (resolved.source !== "variant") {
          console.warn("[BERAT] berat per ukuran tidak ditemukan → fallback:", {
            order: order.order_number,
            product: it.product_id,
            color: it.color,
            size: it.size,
            source: resolved.source,
          });
        }
      }
      setItemWeights(map);
    });
    return () => { active = false; };
  }, [order.order_items, order.order_number]);

  /**
   * Total berat pesanan. Pesanan yang BELUM punya resi J&T dihitung ulang dari berat per ukuran
   * (data terbaru); pesanan yang sudah punya resi memakai berat tersimpan (jangan diubah).
   */
  const totalWeight = useMemo(() => {
    const items = order.order_items || [];
    const stored = order.weight && order.weight > 0 ? Number(order.weight) : null;
    if (order.awb_no || items.length === 0) return { grams: stored, fallback: false, recomputed: false };

    let grams = 0;
    let fallback = false;
    let incomplete = false;
    for (const it of items) {
      const w = itemWeights[`${it.product_id}|${it.color}|${it.size}`];
      const qty = Number(it.quantity) || 1;
      if (!w || w.source === "missing") { incomplete = true; continue; }
      if (w.source === "product") fallback = true;
      grams += w.grams * qty;
    }
    // Kalau ada item yang beratnya belum diketahui, jangan menebak — pakai berat tersimpan.
    if (incomplete || grams <= 0) return { grams: stored, fallback, recomputed: false };
    return { grams, fallback, recomputed: true };
  }, [itemWeights, order]);

  async function openTrack(force = false) {
    if (showTrack && !force) {
      setShowTrack(false);
      return;
    }
    setShowTrack(true);
    if (!force && (trackHistory || !resi)) return;

    setTracking(true);
    setTrackError(null);
    try {
      // Server yang menyinkronkan status (ambil tracking + transisi maju-saja, lihat
      // src/lib/jnt/tracking-sync.ts) supaya logikanya satu tempat dengan cron. Klien tidak
      // lagi menulis status sendiri.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ orderNumber: order.order_number, action: "syncTracking" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTrackError(json?.error || "Data pelacakan J&T belum bisa diambil.");
        return;
      }
      const data = json?.track as { history?: TrackHistoryItem[] } | null;
      setTrackHistory(data?.history ?? []);
      setTrackRaw(data ?? null);
      setTrackFetchedAt(new Date().toISOString());
      if (!data && json?.trackError) setTrackError(json.trackError);
      // Kalau server menaikkan status, beri tahu induk supaya daftar & drawer ikut segar.
      if (json?.changed) onSynced?.({ status: json.status, shipping_status: json.shippingStatus ?? null });
    } catch {
      setTrackError("Tidak bisa menghubungi layanan J&T. Coba lagi sebentar lagi.");
    } finally {
      setTracking(false);
    }
  }

  // Riwayat terbaru di atas — diurut dari waktu asli J&T (bukan urutan array).
  const trackUpdates = sortHistoryDesc(trackHistory);
  const trackSummary = trackingSummary(trackHistory);

  // "Dikirim" dibaca dari kolom database (`orders.shipping_status`, cadangan `orders.status`),
  // bukan dari teks label: paket sudah diserahkan ke kurir dan perjalanannya dikabarkan otomatis
  // oleh sinkronisasi tracking J&T. Pada tahap itu area aksi hanya menyisakan dua aksi pelacakan.
  const shipped = shippingStatusOf(order) === "dikirim" || order.status === "dikirim";

  // Tombol aksi admin dipecah jadi variabel supaya bisa disusun ulang per kondisi (dua aksi saat
  // paket dikirim, aksi lengkap sebelum dikirim) tanpa menyalin markahnya.
  const arrangeAction = canArrange ? (
    <button type="button" className="od-a od-a-primary" onClick={handleArrange} disabled={arranging}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
        <path d="m3 8 9 5 9-5" />
        <path d="M12 13v8" />
      </svg>
      {arranging ? "Memproses…" : "Atur Pesanan"}
    </button>
  ) : null;

  const whatsappAction = wa ? (
    <a href={waLink(order.customer_whatsapp, waPesan)} target="_blank" rel="noopener noreferrer" className="od-a">
      <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d={WHATSAPP_PATH} /></svg>
      Hubungi via WhatsApp
    </a>
  ) : null;

  const lacakAction = resi ? (
    <button type="button" className={`od-a${showTrack ? " is-on" : ""}`} onClick={() => openTrack()}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
      {showTrack ? "Tutup Lacak" : "Lacak Paket"}
    </button>
  ) : null;

  const cancelJntAction = resi && order.status !== "dibatalkan" && onCancelJnt ? (
    <button type="button" className="od-a od-a-danger" onClick={onCancelJnt}>
      Batalkan J&amp;T
    </button>
  ) : null;

  const labelAction = resi ? (
    <a href={`/admin/label/${order.order_number}`} target="_blank" rel="noopener noreferrer" className="od-a">
      Cetak Label
    </a>
  ) : null;

  const deleteAction = (
    <button type="button" className="od-a od-a-danger" onClick={onDelete}>
      Hapus Pesanan
    </button>
  );

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
                {totalWeight.grams && totalWeight.grams > 0 ? (
                  <div className="rp-line" style={{ marginTop: 8 }}>
                    <span className="rp-sub">Berat</span>
                    <span className="rp-strong rp-mono" style={{ marginLeft: "auto" }}>
                      {formatWeightExact(totalWeight.grams)}
                      {totalWeight.fallback ? <span style={{ color: "#b45309" }}> &middot; fallback produk</span> : null}
                    </span>
                  </div>
                ) : null}
                {totalWeight.grams && totalWeight.grams > 0 && hasAddon ? (
                  <>
                    <div className="rp-line" style={{ marginTop: 6 }}>
                      <span className="rp-sub">Berat produk</span>
                      <span className="rp-mono" style={{ marginLeft: "auto" }}>{formatWeightExact(Math.max(0, totalWeight.grams - addonWeight))}</span>
                    </div>
                    <div className="rp-line" style={{ marginTop: 6 }}>
                      <span className="rp-sub">Extra Cover &amp; Hanger</span>
                      <span className="rp-mono" style={{ marginLeft: "auto" }}>+{formatWeightExact(addonWeight)}</span>
                    </div>
                  </>
                ) : null}
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

                {/* Status pengiriman terpisah dari status pesanan + pemindaian terakhir J&T.
                    Resi terbit = "Menunggu Pickup"; naik ke "Dikirim" setelah J&T memindai. */}
                {resi ? (() => {
                  const ss = shippingStatusOf(order);
                  return ss ? (
                    <div className="rp-line" style={{ marginTop: 8 }}>
                      <span className="rp-sub">Status pengiriman</span>
                      <span className="rp-strong" style={{ marginLeft: "auto" }}>{SHIPPING_STATUS_LABEL[ss]}</span>
                    </div>
                  ) : null;
                })() : null}
                {resi && order.tracking_status_text ? (
                  <div className="rp-line" style={{ marginTop: 8 }}>
                    <span className="rp-sub">Tracking terakhir</span>
                    <span className="rp-strong" style={{ marginLeft: "auto", textAlign: "right" }}>
                      {trackingRow({ status: order.tracking_status_text, status_code: order.tracking_status_code }).status}
                      {order.tracking_city ? ` · ${order.tracking_city}` : ""}
                    </span>
                  </div>
                ) : null}
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
                      {item.product_id && itemWeights[`${item.product_id}|${item.color}|${item.size}`] ? (() => {
                        const w = itemWeights[`${item.product_id}|${item.color}|${item.size}`];
                        return (
                          <p className="rp-var">
                            Berat: <b>{w.source === "missing" ? "-" : formatWeightExact(w.grams)}</b>
                            {w.source !== "variant" ? (
                              <span style={{ color: "#b45309", fontWeight: 700 }}>
                                {" "}&middot; {w.source === "product" ? "berat memakai fallback produk" : "berat per ukuran belum diisi"}
                              </span>
                            ) : null}
                          </p>
                        );
                      })() : null}
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
                  {totalWeight.grams && totalWeight.grams > 0 ? (
                    <div className="rp-row"><span>Berat</span><span className="rp-mono">{formatWeightExact(totalWeight.grams)}</span></div>
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
              {/* Pesanan yang paketnya sudah dikirim ("Dikirim") tidak lagi menampilkan kontrol
                  ubah status manual: pada tahap itu status pesanan dikabarkan otomatis oleh
                  sinkronisasi tracking J&T, jadi chip manual bisa bertentangan dengannya. */}
              {!shipped ? (
                <>
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
                </>
              ) : null}

              <div className="od-acts">
                {/* Paket sudah dikirim → hanya dua aksi utama (Lacak Paket + Hubungi via
                    WhatsApp). Pembatalan J&T, cetak label, dan hapus pesanan dikeluarkan dari
                    area aksi utama; kemampuan backend-nya tetap ada di /api/admin/orders &
                    /admin/label untuk kondisi khusus yang lolos validasi status. */}
                {shipped ? (
                  <>
                    {lacakAction}
                    {whatsappAction}
                  </>
                ) : (
                  <>
                    {arrangeAction}
                    {whatsappAction}
                    {lacakAction}
                    {cancelJntAction}
                    {labelAction}
                    {deleteAction}
                  </>
                )}
              </div>

              {/* Pelacakan J&T: riwayat perjalanan paket. Begitu J&T melaporkan paket
                  diterima (status_code 200), status pesanan otomatis diubah ke selesai. */}
              {showTrack ? (
                <div className="od-track">
                  <div className="flex items-center gap-2">
                    <p className="od-title" style={{ margin: 0 }}>{t("history")}</p>
                    <button
                      type="button"
                      onClick={() => openTrack(true)}
                      disabled={tracking}
                      className="ml-auto text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                      style={{ border: "1px solid #d4d4d8", color: "#475569" }}
                    >
                      {tracking ? t("loading") : t("refresh")}
                    </button>
                    {trackRaw ? (
                      <button
                        type="button"
                        onClick={() => setShowRaw((v) => !v)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                        style={{ border: "1px solid #d4d4d8", color: "#475569" }}
                      >
                        {t("rawData")}
                      </button>
                    ) : null}
                  </div>

                  {/* Ringkasan — nilai-nilainya diambil langsung dari event J&T terbaru. */}
                  {trackSummary ? (
                    <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
                      <p className="text-[12.5px]" style={{ margin: 0 }}>
                        <span style={{ color: "#8D9297" }}>{t("statusNow")}: </span>
                        <b style={{ color: "#1c1c1c" }}>{trackSummary.status}</b>
                      </p>
                      {trackSummary.note ? (
                        <p className="text-[12.5px]" style={{ margin: 0, color: "#8D9297" }}>
                          {t("note")}: <span style={{ color: "#1c1c1c" }}>{trackSummary.note}</span>
                        </p>
                      ) : null}
                      <p className="text-[12.5px]" style={{ margin: 0, color: "#8D9297" }}>
                        {t("updatedAt")}: <span style={{ color: "#1c1c1c" }}>{formatTrackingTime(trackSummary.updatedAt)}</span>
                      </p>
                      {trackSummary.elapsedLabel ? (
                        <p className="text-[12.5px]" style={{ margin: 0, color: "#8D9297" }}>
                          {t("duration")}: <span style={{ color: "#1c1c1c" }}>{trackSummary.elapsedLabel}</span>
                        </p>
                      ) : null}
                      {trackFetchedAt ? (
                        <p className="text-[12.5px]" style={{ margin: 0, color: "#8D9297" }}>
                          {t("fetchedAt")}: <span style={{ color: "#1c1c1c" }}>{formatTrackingTime(trackFetchedAt)}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {tracking ? (
                    <p className="od-tnote">{t("loading")}</p>
                  ) : trackError ? (
                    <p className="od-tnote">{trackError}</p>
                  ) : trackUpdates.length > 0 ? (
                    <div className="od-ups">
                      {trackUpdates.map((u, i) => {
                        // Teks status & catatan J&T ditampilkan APA ADANYA. Admin juga melihat nama kurir.
                        const row = trackingRow(u);
                        return (
                          <div key={`${row.dateTime}-${i}`} className={`od-up${i === 0 ? " is-first" : ""}`}>
                            <span className="od-up-dot" style={row.warning ? { background: "#d97706" } : undefined} />
                            <div>
                              <b style={row.warning ? { color: "#b45309" } : undefined}>{row.status}</b>
                              <i>{[row.location, formatTrackingTime(row.dateTime)].filter(Boolean).join(" • ")}</i>
                              {row.note ? (
                                <i style={{ display: "block", marginTop: 2 }}>{t("note")}: {row.note}</i>
                              ) : null}
                              {row.driver ? (
                                <i style={{ display: "block", marginTop: 2 }}>{t("driver")}: {row.driver}</i>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="od-tnote">{t("noUpdate")}</p>
                  )}

                  {/* Respons J&T apa adanya (data pribadi penerima disembunyikan). */}
                  {showRaw && trackRaw ? (
                    <pre
                      style={{
                        marginTop: 10, padding: 12, borderRadius: 10, background: "#f7f7f8",
                        border: "1px solid #E1E3E5", fontSize: 11, lineHeight: 1.5,
                        maxHeight: 320, overflow: "auto",
                      }}
                    >
{JSON.stringify(censorReceiverPII(trackRaw), null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
