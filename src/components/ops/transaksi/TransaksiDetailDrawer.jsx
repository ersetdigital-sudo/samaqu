"use client";

/**
 * Detail transaksi (panel samping) untuk menu Transaksi.
 *
 * Isinya sengaja hanya data yang benar-benar tercatat: info pelanggan, daftar item,
 * ongkir/diskon, total, sumber, status, dan waktu dicatat. HPP/keuntungan TIDAK
 * ditampilkan (datanya belum ada).
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, Pencil, Receipt, X } from "lucide-react";
import { NEUTRAL_ITEM_PHOTO } from "@/lib/order-photo";
import { formatWeightExact } from "@/lib/shipping-weight";
import { SOURCE_STYLES, STATUS_STYLES, formatRupiah, formatTanggalJamID } from "@/components/ops/transaksi/transaksi-format";

export default function TransaksiDetailDrawer({ open, order, onClose, onEdit, onCancel }) {
  const status = order ? STATUS_STYLES[order.status] : null;
  const source = order ? SOURCE_STYLES[order.source] : null;

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
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${source?.badge || ""}`}>
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
