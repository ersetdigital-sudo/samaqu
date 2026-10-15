"use client";

import { useMemo, useState } from "react";
import { Cake, ChevronRight, Download, Loader2, Phone, Search, ShoppingBag, X } from "lucide-react";
import CustomerDetailDrawer from "@/components/admin/CustomerDetailDrawer";
import { customersToCsv } from "@/lib/customer-csv";
import {
  ACCOUNT_FILTERS,
  CUSTOMER_SORTS,
  PERIOD_FILTERS,
  distinctCities,
  filterCustomers,
  sortCustomers,
  withAddress,
  type AccountFilter,
  type CustomerSort,
  type DirectoryCustomer,
  type PeriodFilter,
} from "@/lib/customer-directory";

/**
 * Daftar pelanggan (presentational) — dipakai panel admin (`/admin` → Pelanggan) **dan**
 * dashboard ops (`/ops/pelanggan`), supaya datanya benar-benar satu pusat.
 *
 * Gaya sengaja pakai kelas Tailwind netral (slate) + `dark:` — bukan variabel tema admin —
 * supaya tampil benar di dua tema sekaligus. Detail (alamat + riwayat belanja) dibuka lewat
 * `CustomerDetailDrawer` (drawer itu mandiri, tak bergantung tema).
 */

const BULAN_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const SELECT_CLASS =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function money(n: number) {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

function parseBirth(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function exportCsv(rows: DirectoryCustomer[]) {
  const blob = new Blob([customersToCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pelanggan-samaqu-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CustomerCard({ c, currentMonth, onDetail }: { c: DirectoryCustomer; currentMonth: number; onDetail: () => void }) {
  const initials = c.name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
  const b = c.birthDate ? parseBirth(c.birthDate) : null;
  const isBirthdayMonth = !!b && b.m === currentMonth;
  const isBirthdayToday = !!b && b.m === currentMonth && b.d === new Date().getDate();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a1d28] lg:p-5">
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 lg:w-12 lg:h-12 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold text-white bg-slate-900 dark:bg-slate-700">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm lg:text-base font-bold truncate text-slate-900 dark:text-white">{c.name}</h3>
                {!c.registered && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Belum daftar
                  </span>
                )}
              </div>
              <p className="text-xs flex items-center gap-1.5 mt-0.5 text-slate-500 dark:text-slate-400">
                <Phone size={12} strokeWidth={1.9} /> {c.whatsapp || "Tanpa nomor"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm lg:text-base font-extrabold text-slate-900 dark:text-white">{money(c.totalSpend)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.ordersCount} pesanan</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                isBirthdayMonth ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <Cake size={12} strokeWidth={2} />
              {b ? `${b.d} ${BULAN_SHORT[b.m - 1]} ${b.y}` : "Ulang tahun belum diisi"}
              {isBirthdayToday && " · hari ini 🎉"}
            </span>
            {c.lastOrderAt && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Belanja terakhir {formatDate(c.lastOrderAt)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onDetail}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-200 text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ShoppingBag size={13} strokeWidth={2} />
            Riwayat Belanja &amp; Alamat ({c.orders.length})
            <ChevronRight size={14} strokeWidth={2} className="text-blue-600" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CustomerDirectoryView({
  customers,
  loading = false,
  showExport = false,
  emptyText = "Belum ada pelanggan",
  initialQuery = "",
}: {
  customers: DirectoryCustomer[];
  loading?: boolean;
  /** Tampilkan tombol Export CSV (dipakai panel admin). */
  showExport?: boolean;
  emptyText?: string;
  /** Pencarian awal — dipakai tautan dari menu lain (mis. Database Kota → profil pelanggan). */
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [account, setAccount] = useState<AccountFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [city, setCity] = useState("all");
  const [birthday, setBirthday] = useState(false);
  const [sort, setSort] = useState<CustomerSort>("newest");
  const [selected, setSelected] = useState<DirectoryCustomer | null>(null);

  const currentMonth = new Date().getMonth() + 1;

  // Yang ditampilkan hanya pelanggan yang sudah punya alamat pengiriman (lihat `withAddress`).
  const withAddressList = useMemo(() => withAddress(customers), [customers]);
  const hiddenCount = customers.length - withAddressList.length;
  const cities = useMemo(() => distinctCities(withAddressList), [withAddressList]);

  const visible = useMemo(
    () => sortCustomers(filterCustomers(withAddressList, { query, account, period, city, birthdayThisMonth: birthday }), sort),
    [withAddressList, query, account, period, city, birthday, sort]
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center dark:border-slate-800 dark:bg-[#1a1d28]">
        <Loader2 size={22} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cari + filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a1d28]">
        <div className="relative">
          <Search size={16} strokeWidth={1.9} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau WhatsApp…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Bersihkan">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <select value={account} onChange={(e) => setAccount(e.target.value as AccountFilter)} className={SELECT_CLASS} aria-label="Filter akun">
            {ACCOUNT_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodFilter)} className={SELECT_CLASS} aria-label="Filter belanja terakhir">
            {PERIOD_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} className={SELECT_CLASS} aria-label="Filter kota">
            <option value="all">Semua kota</option>
            {cities.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setBirthday((v) => !v)}
            className={`text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors ${
              birthday
                ? "bg-amber-100 border-amber-300 text-amber-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
            }`}
          >
            🎂 Ulang tahun bulan ini
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value as CustomerSort)} className={`${SELECT_CLASS} ml-auto`} aria-label="Urutkan">
            {CUSTOMER_SORTS.map((s) => <option key={s.key} value={s.key}>Urut: {s.label}</option>)}
          </select>
          {showExport && (
            <button
              type="button"
              onClick={() => exportCsv(visible)}
              disabled={visible.length === 0}
              className="text-sm font-semibold px-3.5 py-2.5 rounded-xl inline-flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              title="Unduh daftar pelanggan (Nama, No WA, Tanggal Lahir)"
            >
              <Download size={14} strokeWidth={2} /> Export
            </button>
          )}
        </div>

        <p className="text-xs mt-3 text-slate-500 dark:text-slate-400">
          Menampilkan <b className="text-slate-700 dark:text-slate-200">{visible.length}</b> dari {withAddressList.length} pelanggan
          {hiddenCount > 0 ? (
            <span className="text-slate-400 dark:text-slate-500"> · {hiddenCount} pelanggan tanpa alamat disembunyikan</span>
          ) : null}
        </p>
      </div>

      {/* Daftar */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-[#1a1d28] dark:text-slate-400">
          {withAddressList.length === 0 ? emptyText : "Tidak ada pelanggan yang cocok"}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => (
            <CustomerCard key={c.key} c={c} currentMonth={currentMonth} onDetail={() => setSelected(c)} />
          ))}
        </div>
      )}

      <CustomerDetailDrawer customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
