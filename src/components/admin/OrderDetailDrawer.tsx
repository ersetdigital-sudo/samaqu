"use client";

/**
 * Detail pesanan admin sebagai drawer yang meluncur dari kanan — pola yang sama dengan
 * `ProductDetailDrawer`, supaya kedua panel admin (detail produk & detail pesanan) seragam.
 *
 * Header (nomor pesanan + tanggal + tombol tutup) hidup di sini sekali, jadi kedua dashboard
 * admin (`/admin` dan `/[locale]/admin`) tidak menyalin markup modal-nya lagi. Nomor pesanan
 * memakai font UI admin (bukan serif) supaya seragam dengan isi struk di bawahnya; tanggalnya
 * mengikuti format panjang `id-ID` yang dulu ada di header modal.
 *
 * Isinya tetap `OrderDetailContent` — susunan & gaya struk yang sama dengan halaman detail
 * pesanan customer. Di bawah 768px drawer memakai lebar penuh; di atasnya 640px, sehingga
 * lembar struk 600px-nya tetap terpusat di dalam drawer.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import OrderDetailContent, { AdminDetailOrder } from "@/components/admin/OrderDetailContent";

export default function OrderDetailDrawer({
  order,
  onClose,
  onStatusChange,
  onCancelJnt,
  onDelete,
}: {
  order: AdminDetailOrder | null;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onCancelJnt?: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order, onClose]);

  return (
    <AnimatePresence>
      {order && (
        <motion.div
          key="order-detail-drawer"
          className="odr-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="odr-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="odr-head">
              <div className="odr-head-txt">
                <h2 className="odr-title">{order.order_number}</h2>
                <p className="odr-date">
                  {new Date(order.created_at).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button onClick={onClose} className="odr-x" aria-label="Tutup">
                <X size={18} />
              </button>
            </header>

            <div className="odr-body">
              <OrderDetailContent
                order={order}
                onStatusChange={onStatusChange}
                onCancelJnt={onCancelJnt}
                onDelete={onDelete}
              />
            </div>

            {/* Gaya drawer ditulis sebagai <style> biasa (pola sama dengan PD_CSS/RINCIAN_CSS):
                `style jsx global` dengan isi variabel tidak punya id statis, jadi styled-jsx
                membuang CSS ini dan drawer-nya tampil tanpa gaya.
                z-index 50 (bukan 60): ConfirmModal (Hapus Pesanan / Batalkan J&T) memakai
                z-50 dan dirender setelah drawer, jadi konfirmasinya tetap muncul di atas. */}
            <style>{ODR_CSS}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ODR_CSS = `
.odr-overlay{position:fixed;inset:0;z-index:50;display:flex;justify-content:flex-end;background:rgba(42,33,27,.4)}
.odr-panel{width:640px;max-width:100%;height:100%;display:flex;flex-direction:column;background:var(--cream,#f8f5f1);box-shadow:-24px 0 60px -24px rgba(42,33,27,.35)}
.odr-head{flex:none;display:flex;align-items:flex-start;gap:12px;padding:18px 20px;border-bottom:1px solid var(--bd,#f1f1f3)}
.odr-head-txt{min-width:0}
/* Nomor pesanan memakai font UI admin yang sama dengan isi struk (dulu serif Cormorant) supaya seragam. */
.odr-title{margin:0;font-size:1.05rem;font-weight:800;letter-spacing:-.01em;color:var(--espresso,#1c1c1c);font-family:var(--font-inter),system-ui,sans-serif;overflow-wrap:anywhere}
.odr-date{margin:4px 0 0;font-size:.75rem;font-weight:500;color:var(--text-muted,#9a9a98)}
.odr-x{margin-left:auto;flex:none;padding:6px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--text-muted,#9a9a98);cursor:pointer}
.odr-x:hover{background:var(--sub,#f4f4f5);color:var(--espresso,#1c1c1c)}
.odr-body{flex:1;min-height:0;overflow-y:auto}

/* Mobile: drawer memakai lebar penuh dan header lebih rapat. */
@media (max-width:767.98px){
 .odr-panel{width:100%}
 .odr-head{padding:14px 16px}
}
`;
