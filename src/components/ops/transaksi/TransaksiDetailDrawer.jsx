"use client";

/**
 * Detail transaksi (panel samping) untuk menu Transaksi.
 *
 * Isinya sengaja hanya data yang benar-benar tercatat: info pelanggan, daftar item,
 * ongkir/diskon, total, sumber, status, dan waktu dicatat. HPP/keuntungan TIDAK
 * ditampilkan (datanya belum ada).
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Ban, Check, Pencil, Receipt, Truck, X } from "lucide-react";
import { base44 } from "@/lib/ops-api";
import { NEUTRAL_ITEM_PHOTO } from "@/lib/order-photo";
import { formatWeightExact } from "@/lib/shipping-weight";
import { formatTrackingTime, sortHistoryDesc, trackingRow } from "@/lib/jnt/track-status";
import { SOURCE_STYLES, STATUS_STYLES, formatRupiah, formatTanggalJamID } from "@/components/ops/transaksi/transaksi-format";

/** Label status kirim yang dipakai layar (nilainya dari `orders.shipping_status`). */
const SHIPPING_STATUS_LABEL = { menunggu_pickup: "Menunggu pickup", dikirim: "Dikirim", selesai: "Selesai" };

/** Pesan khusus dari route createJnt: resi sudah terbit di J&T tapi gagal dicatat di sistem. */
const RESI_ISSUED_NOT_SAVED = "Resi J&T terbit tapi gagal disimpan";

export default function TransaksiDetailDrawer({ open, order, onClose, onEdit, onCancel, onResiCreated }) {
  const status = order ? STATUS_STYLES[order.status] : null;
  const source = order ? SOURCE_STYLES[order.source] : null;

  /** Pra-cek + dialog "Buat Resi": hasil pemeriksaan, proses, dan pesan hasil. */
  const [resiCheck, setResiCheck] = useState(null);
  const [resiChecking, setResiChecking] = useState(false);
  const [resiBusy, setResiBusy] = useState(false);
  const [resiError, setResiError] = useState("");
  const [resiIssuedWarning, setResiIssuedWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Kunci proses per transaksi: klik beruntun / Enter berulang tidak mengirim dua panggilan. */
  const resiLock = useRef(false);

  const awb = order?.awb_no || "";
  const cancelled = order?.status === "dibatalkan";
  // Data lama `order` bisa berubah setelah resi dibuat; reset dialog saat drawer dibuka/ditutup.
  useEffect(() => {
    if (open) return undefined;
    setResiCheck(null);
    setResiChecking(false);
    setResiBusy(false);
    setResiError("");
    setResiIssuedWarning(false);
    setCopied(false);
    setTrack({ status: "idle", history: [], error: "" });
    setTrackOpen(false);
    setTrackBusy(false);
    resiLock.current = false;
    return undefined;
  }, [open]);

  /** Langkah 1: pra-cek baca-saja (server memeriksa alamat, nomor, kode area J&T, berat). */
  const openResiConfirm = async () => {
    if (resiLock.current || resiChecking) return;
    resiLock.current = true;
    setResiChecking(true);
    setResiError("");
    setResiIssuedWarning(false);
    setResiCheck(null);
    try {
      const result = await base44.entities.Resi.check(order.order_number);
      setResiCheck(result);
    } catch (error) {
      setResiError(error instanceof Error ? error.message : "Gagal memeriksa data resi. Coba lagi.");
    } finally {
      setResiChecking(false);
      resiLock.current = false;
    }
  };

  const closeResiConfirm = () => {
    if (resiBusy) return;
    setResiCheck(null);
    setResiError("");
  };

  /** Langkah 2: panggil pembuatan resi (aksi sungguhan ke J&T). Tidak ada retry otomatis. */
  const submitResi = async () => {
    if (resiLock.current || resiBusy) return;
    resiLock.current = true;
    setResiBusy(true);
    setResiError("");
    try {
      const result = await base44.entities.Transaction.createResi(order.order_number);
      setResiBusy(false);
      setResiCheck(null);
      resiLock.current = false;
      onResiCreated?.({ awb_no: result?.awbNo || "", shipping_status: result?.shippingStatus || "menunggu_pickup" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat resi. Coba lagi.";
      setResiBusy(false);
      resiLock.current = false;
      // Kondisi khusus: resi sudah terbit di J&T tapi gagal dicatat → JANGAN tawarkan coba lagi.
      if (message.includes(RESI_ISSUED_NOT_SAVED)) {
        setResiCheck(null);
        setResiIssuedWarning(true);
        // Muat ulang data transaksi dari server (tanpa tawaran coba lagi).
        onResiCreated?.(null, true);
        return;
      }
      setResiError(message);
    }
  };

  const copyAwb = async () => {
    if (!awb) return;
    try {
      await navigator.clipboard.writeText(awb);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const openLabel = (size) => {
    window.open(`/admin/label/${order.order_number}?size=${size}`, "_blank", "noopener,noreferrer");
  };

  /** Riwayat pengiriman (Lacak Resi): hasil baca dari endpoint tracking publik — read-only. */
  const [track, setTrack] = useState({ status: "idle", history: [], error: "" });
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackBusy, setTrackBusy] = useState(false);
  const trackRows = trackOpen ? sortHistoryDesc(track.history).map(trackingRow) : [];

  /** Ambil riwayat dari J&T. `force` = lewati cache 5 menit di endpoint. Tanpa tulis DB. */
  const loadTrack = async (force = false) => {
    if (!awb || trackBusy) return;
    setTrackBusy(true);
    setTrack((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const res = await fetch(`/api/jnt/track?awb=${encodeURIComponent(awb)}${force ? "&refresh=1" : ""}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Gagal mengambil riwayat dari J&T.");
      setTrack({
        status: "done",
        history: Array.isArray(json.data?.history) ? json.data.history : [],
        error: "",
      });
    } catch (error) {
      setTrack({
        status: "error",
        history: [],
        error: error instanceof Error ? error.message : "Gagal mengambil riwayat dari J&T.",
      });
    } finally {
      setTrackBusy(false);
    }
  };

  const toggleTrack = () => {
    const next = !trackOpen;
    setTrackOpen(next);
    if (next && track.status === "idle") loadTrack(false);
  };

  /**
   * "Perbarui": sinkronkan riwayat ke sistem memakai mekanisme yang sama dengan tombol
   * "Lacak Paket" di dashboard admin (status pesanan ikut mengikuti hasil scan J&T),
   * lalu riwayatnya dibaca ulang.
   */
  const syncTrack = async () => {
    if (!awb || trackBusy) return;
    setTrackBusy(true);
    try {
      await base44.entities.Transaction.syncTracking(order.order_number);
      onResiCreated?.(null, true);
      setTrackBusy(false);
      await loadTrack(true);
    } catch (error) {
      setTrack((current) => ({
        ...current,
        status: "error",
        error: error instanceof Error ? error.message : "Gagal memperbarui riwayat.",
      }));
    } finally {
      setTrackBusy(false);
    }
  };

  // Scroll halaman dikunci selama drawer terbuka supaya scrollbar halaman tidak menimpa
  // tepi kanan drawer.
  useEffect(() => {
    if (!open) return undefined;
    const { body, documentElement } = document;
    const gap = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && order && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            className="fixed inset-y-0 right-0 z-[9999] w-full sm:max-w-md bg-white dark:bg-[#1a1d28] shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Detail transaksi"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Receipt size={19} className="text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white">Detail Transaksi</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{order.order_number}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Tutup"
              >
                <X size={18} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="transaksi-body flex-1 overflow-y-auto px-5 py-4 space-y-3.5" style={{ scrollbarWidth: "none" }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${status?.badge || ""}`}>
                  {status?.icon ? <status.icon size={12} /> : null}
                  {order.status_label}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${source?.badge || ""}`}>
                  {source?.icon ? <source.icon size={14} /> : null}
                  {order.source_label}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                <Row label="Pelanggan" value={order.customer_name} />
                <Row label="Nomor HP" value={order.customer_whatsapp || "-"} />
                <Row label="Waktu dicatat" value={formatTanggalJamID(order.created_at)} />
                <Row label="No. Order" value={order.order_number} mono />
                {order.notes ? <Row label="Catatan" value={order.notes} /> : null}
              </div>

              {order.shipping_address ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Alamat Pengiriman
                  </p>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">{order.shipping_address}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {[order.shipping_kecamatan, order.kota, order.shipping_province, order.shipping_postal_code]
                        .filter(Boolean)
                        .join(", ") || "Kelengkapan alamat belum terisi"}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Pengiriman & resi J&T (murni tampilan + aksi resi) */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Pengiriman J&T
                </p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-3 space-y-2.5">
                  {awb ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nomor Resi</p>
                          <p className="text-sm font-black font-mono text-slate-900 dark:text-white truncate">{awb}</p>
                        </div>
                        <button
                          type="button"
                          onClick={copyAwb}
                          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Check size={13} /> {copied ? "Tersalin" : "Salin"}
                        </button>
                      </div>

                      {/* Pesanan yang sudah dibatalkan: `shipping_status` lama masih
                          "menunggu_pickup" (jalur pembatalan tidak mengubah kolom itu), jadi
                          status kirimnya ditampilkan sebagai "Dibatalkan" supaya tidak menyesatkan. */}
                      {cancelled ? (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Status kirim: <b className="text-red-600 dark:text-red-400">Dibatalkan</b>
                        </p>
                      ) : order.shipping_status ? (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Status kirim:{" "}
                          <b className="text-slate-700 dark:text-slate-200">
                            {SHIPPING_STATUS_LABEL[order.shipping_status] || order.shipping_status}
                          </b>
                        </p>
                      ) : null}

                      {/* Tombol cetak disembunyikan untuk pesanan yang sudah dibatalkan. */}
                      {!cancelled ? (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => openLabel("100x150")}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cetak 100 × 150 mm
                          </button>
                          <button
                            type="button"
                            onClick={() => openLabel("78x100")}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cetak 78 × 100 mm
                          </button>
                        </div>
                      ) : null}

                      {/* Lacak Resi: riwayat asli J&T (teks & catatan apa adanya, tanpa parafrase) */}
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={toggleTrack}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Truck size={13} /> {trackOpen ? "Tutup riwayat" : "Lacak Resi"}
                        </button>

                        {trackOpen ? (
                          <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                            {track.status === "loading" ? (
                              <p className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Memuat riwayat dari J&T…
                              </p>
                            ) : track.status === "error" ? (
                              <p className="px-3 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400">{track.error}</p>
                            ) : trackRows.length === 0 ? (
                              <p className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Belum ada riwayat dari J&T.
                              </p>
                            ) : (
                              <ul className="max-h-[196px] overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                                {trackRows.map((row, index) => (
                                  <li key={`${row.dateTime}-${index}`} className="px-3 py-2">
                                    <p
                                      className={`text-xs font-bold ${
                                        row.warning ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-100"
                                      }`}
                                    >
                                      {row.status}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {[row.location, formatTrackingTime(row.dateTime)].filter(Boolean).join(" • ")}
                                    </p>
                                    {row.note ? (
                                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                        Catatan: {row.note}
                                      </p>
                                    ) : null}
                                    {row.driver ? (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Kurir: {row.driver}</p>
                                    ) : null}
                                    {/* Nama penerima dari J&T apa adanya — mis. siapa yang menerima paket. */}
                                    {row.receiver ? (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Penerima: {row.receiver}</p>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {trackRows.length > 0 ? `${trackRows.length} riwayat` : "Riwayat J&T"}
                              </span>
                              <button
                                type="button"
                                onClick={syncTrack}
                                disabled={trackBusy}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
                              >
                                {trackBusy ? "Memperbarui…" : "Perbarui"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : cancelled ? (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Pesanan ini sudah dibatalkan, jadi resi tidak dibuat dari sini.
                    </p>
                  ) : order.status === "diproses" ? (
                    <>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Belum ada resi J&T. Nomor resi dibuat di J&T dan kurir akan menjemput paket.
                      </p>
                      <button
                        type="button"
                        onClick={openResiConfirm}
                        disabled={resiChecking}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-sm hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60 transition-all"
                      >
                        <Truck size={15} /> {resiChecking ? "Memeriksa data…" : "Buat Resi"}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Resi untuk pesanan ini dibuat lewat alur pesanan, bukan dari menu Transaksi.
                    </p>
                  )}

                  {resiError && !resiCheck ? (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">{resiError}</p>
                  ) : null}

                  {resiIssuedWarning ? (
                    <div className="rounded-lg border-2 border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
                      <p className="text-xs font-black text-amber-800 dark:text-amber-200">
                        Resi sudah terbit di J&T tetapi belum tercatat di sistem.
                      </p>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mt-1">
                        JANGAN klik Buat Resi lagi. Muat ulang halaman untuk melihat apakah resi sudah tercatat, dan hubungi
                        admin sistem bila belum.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Produk ({order.items?.length || 0} item)
                </p>
                <div className="space-y-1.5">
                  {(order.items || []).map((item, index) => (
                    <div
                      key={`${item.product_id}-${item.color}-${item.size}-${index}`}
                      className="flex gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5"
                    >
                      <div className="w-12 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={item.product_image || NEUTRAL_ITEM_PHOTO}
                          alt={item.product_name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.product_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {[
                            item.kain ? `Kain ${item.kain}` : null,
                            item.series,
                            item.color && item.color !== "default" ? item.color : null,
                            item.size,
                          ]
                            .filter(Boolean)
                            .join(" · ")}{" "}
                          × {item.quantity}
                        </p>
                        {item.weight ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Berat:{" "}
                            <b className="text-slate-700 dark:text-slate-200">
                              {item.weight.source === "missing" ? "-" : formatWeightExact(item.weight.grams)}
                            </b>
                            {item.weight.source !== "variant" ? (
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                {" "}
                                ·{" "}
                                {item.weight.source === "product"
                                  ? "berat memakai fallback produk"
                                  : "berat per ukuran belum diisi"}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          Rp {formatRupiah(item.price * item.quantity)}
                        </p>
                        {item.customer_price && item.minimum_price ? (
                          <p className="text-xs font-semibold" style={{ color: "#B4552F" }}>
                            Min: Rp {formatRupiah(item.minimum_price)} · Dipilih: Rp {formatRupiah(item.customer_price)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {(order.items || []).length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada produk tercatat.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                <Row label="Subtotal produk" value={`Rp ${formatRupiah(order.subtotal)}`} />
                <Row label="Ongkir" value={`Rp ${formatRupiah(order.shipping_cost)}`} />
                {order.discount > 0 ? <Row label="Diskon" value={`- Rp ${formatRupiah(order.discount)}`} /> : null}
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
                  <span className="text-base font-black font-heading text-slate-900 dark:text-white whitespace-nowrap">
                    Rp {formatRupiah(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {(order.can_edit || order.can_cancel) && (
              <div className="shrink-0 flex gap-2 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800">
                {order.can_edit && (
                  <button
                    onClick={() => onEdit(order)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
                  >
                    <Pencil size={16} /> Ubah
                  </button>
                )}
                {order.can_cancel && (
                  <button
                    onClick={() => onCancel(order)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <Ban size={16} /> Batalkan
                  </button>
                )}
              </div>
            )}
            {/* Konfirmasi "Buat Resi": hasil pra-cek + peringatan sebelum memanggil J&T */}
            <AnimatePresence>
              {resiCheck && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-white/85 dark:bg-[#1a1d28]/85 backdrop-blur-sm flex items-center justify-center p-5"
                  onClick={closeResiConfirm}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="w-full max-w-md max-h-full overflow-y-auto no-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d28] p-5 shadow-xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h4 className="font-heading font-bold text-slate-900 dark:text-white">Buat resi J&T?</h4>

                    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      <div className="px-3.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Penerima</p>
                        <p className="font-bold text-slate-900 dark:text-white">{resiCheck.receiver?.name || "-"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{resiCheck.receiver?.phone || "-"}</p>
                      </div>
                      <div className="px-3.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Alamat</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                          {resiCheck.receiver?.address || "-"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {[resiCheck.receiver?.kecamatan, resiCheck.receiver?.city, resiCheck.receiver?.postal_code]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="px-3.5 py-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Berat estimasi</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatWeightExact(resiCheck.weight_grams)}</p>
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1.5">
                      {(resiCheck.checks || []).map((check) => (
                        <li key={check.key} className="flex items-start gap-2 text-xs">
                          <span className={check.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                            {check.ok ? "✓" : "!"}
                          </span>
                          <span className="min-w-0">
                            <span className={`font-bold ${check.ok ? "text-slate-700 dark:text-slate-200" : "text-amber-700 dark:text-amber-300"}`}>
                              {check.label}
                            </span>
                            {!check.ok && check.detail ? (
                              <span className="block font-semibold text-amber-700 dark:text-amber-300">{check.detail}</span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-3 flex items-start gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <AlertCircle size={14} className="mt-px shrink-0" />
                      <span>
                        Ini membuat order sungguhan di J&T dan kurir akan menjemput. Pastikan alamat dan ongkir sudah benar.
                      </span>
                    </p>

                    {resiError ? <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{resiError}</p> : null}

                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={closeResiConfirm}
                        disabled={resiBusy}
                        className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-all"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={submitResi}
                        disabled={resiBusy || !resiCheck.ok}
                        className="flex-1 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60 transition-all"
                      >
                        {resiBusy ? "Membuat resi…" : "Buat Resi"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 dark:text-white text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
