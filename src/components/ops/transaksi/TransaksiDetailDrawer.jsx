"use client";

/**
 * Detail transaksi (panel samping) untuk menu Transaksi.
 *
 * Isinya sengaja hanya data yang benar-benar tercatat: info pelanggan, daftar item,
 * ongkir/diskon, total, sumber, status, dan waktu dicatat. HPP/keuntungan TIDAK
 * ditampilkan (datanya belum ada).
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, Pencil, Receipt, Truck, X } from "lucide-react";
import { NEUTRAL_ITEM_PHOTO } from "@/lib/order-photo";
import { formatTrackingTime, sortHistoryDesc, trackingRow } from "@/lib/jnt/track-status";
import { SOURCE_STYLES, STATUS_STYLES, formatRupiah, formatTanggalJamID } from "@/components/ops/transaksi/transaksi-format";
import TransaksiResiPanel from "@/components/ops/transaksi/TransaksiResiPanel";

export default function TransaksiDetailDrawer({ open, order, onClose, onEdit, onCancel, onResiCreated }) {
  const status = order ? STATUS_STYLES[order.status] : null;
  const source = order ? SOURCE_STYLES[order.source] : null;

  const awb = order?.awb_no || "";

  // Data lama `order` bisa berubah setelah resi dibuat; panel resi di-reset saat drawer ditutup.
  useEffect(() => {
    if (open) return undefined;
    setTrack({ status: "idle", history: [], error: "" });
    setTrackOpen(false);
    setTrackBusy(false);
    return undefined;
  }, [open]);

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

  /**
   * Buka/tutup panel riwayat. SETIAP kali dibuka, riwayat diambil langsung dari J&T
   * (`refresh=1` → lewati cache 5 menit), jadi yang tampil selalu data terbaru.
   * Ini murni baca — tidak menulis database dan tidak mengubah status pesanan.
   */
  const toggleTrack = () => {
    const next = !trackOpen;
    setTrackOpen(next);
    if (next) loadTrack(true);
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
                  {/* Nomor resi + tombol cetak + tombol Buat Resi — komponen bersama dengan
                      panel "Transaksi tercatat" setelah menyimpan transaksi baru. */}
                  <TransaksiResiPanel order={order} onResiCreated={onResiCreated} />

                  {/* Lacak Resi cuma relevan kalau resinya sudah ada */}
                  {awb ? (
                    <>

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
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Diterima oleh: {row.receiver}</p>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {trackRows.length > 0 ? `${trackRows.length} riwayat` : "Riwayat J&T"}
                              </span>
                              {trackBusy ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  Memuat…
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </>
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
