"use client";

/**
 * Detail satu kota (panel samping) untuk menu Database Kota.
 *
 * Isinya: ringkasan kota, tren pesanan per bulan, produk terlaris (jenis kain & series),
 * daftar pelanggan di kota itu (bisa diklik menuju profilnya di menu Pelanggan), dan
 * sebaran sumber pesanannya.
 */

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronRight, MapPin, Users, X } from "lucide-react";
import { formatRupiah } from "@/components/ops/transaksi/transaksi-format";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const monthLabel = (key) => {
  const [year, month] = String(key || "").split("-");
  return `${MONTHS_SHORT[Number(month) - 1] || month} ${year}`;
};

export default function KotaDetailDrawer({ open, city, onClose }) {
  return (
    <AnimatePresence>
      {open && city && (
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
            aria-label={`Detail kota ${city.city}`}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <MapPin size={19} className="text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white">{city.city}</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {city.province || "Provinsi belum terisi"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup">
                <X size={18} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Ringkasan */}
              <div className="grid grid-cols-3 gap-2">
                <Summary label="Pesanan" value={city.orders} />
                <Summary label="Pelanggan" value={city.uniqueCustomers} />
                <Summary label="Omset" value={`Rp ${formatRupiah(city.revenue)}`} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3">
                Rata-rata <b className="text-slate-700 dark:text-slate-200">Rp {formatRupiah(city.avgOrder)}</b> per pesanan berbayar
              </p>

              {/* Tren per bulan */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Tren Pesanan per Bulan
                </h4>
                <div className="h-40 rounded-2xl border border-slate-200 dark:border-slate-800 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(city.monthly || []).map((row) => ({ ...row, label: monthLabel(row.key) }))}>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: "rgba(24,24,27,0.05)" }}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                        formatter={(value) => [`${value} pesanan`, ""]}
                      />
                      <Bar dataKey="orders" fill="#18181b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Produk terlaris */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Produk Terlaris (Jenis Kain &amp; Series)
                </h4>
                {(city.tops || []).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada produk tercatat di kota ini.</p>
                ) : (
                  <div className="space-y-2">
                    {city.tops.map((top) => {
                      const max = city.tops[0]?.qty || 1;
                      return (
                        <div key={top.label} className="relative rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 overflow-hidden">
                          <span
                            className="absolute inset-y-0 left-0 bg-slate-100 dark:bg-slate-800"
                            style={{ width: `${Math.max(6, Math.round((top.qty / max) * 100))}%` }}
                          />
                          <div className="relative flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{top.label}</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{top.qty} pcs</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Pelanggan di kota ini */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Pelanggan di Kota Ini ({city.people?.length || 0})
                </h4>
                {(city.people || []).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada pelanggan.</p>
                ) : (
                  <div className="space-y-2">
                    {city.people.map((person) => (
                      <Link
                        key={`${person.name}-${person.whatsapp}`}
                        href={`/ops/pelanggan?q=${encodeURIComponent(person.whatsapp || person.name)}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{person.name || "Tanpa nama"}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{person.whatsapp || "Tanpa nomor"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">Rp {formatRupiah(person.spend)}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{person.orders} pesanan</p>
                        </div>
                        <ChevronRight size={15} className="shrink-0 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Sebaran sumber */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Sumber Pesanan
                </h4>
                <div className="space-y-2">
                  {(city.sources || []).map((source) => (
                    <div key={source.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{source.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {source.orders} pesanan · Rp {formatRupiah(source.revenue)}
                      </span>
                    </div>
                  ))}
                  {(city.sources || []).length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada sumber tercatat.</p>
                  ) : null}
                </div>
              </section>

              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Users size={13} /> Klik pelanggan untuk membuka profilnya di menu Pelanggan.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-black font-heading text-slate-900 dark:text-white mt-0.5 whitespace-nowrap">{value}</p>
    </div>
  );
}
