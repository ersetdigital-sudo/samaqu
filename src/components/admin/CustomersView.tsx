"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Cake, ChevronRight, Loader2, Phone, Search, ShoppingBag, User, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CustomerDetailDrawer, { type AdminCustomer } from "@/components/admin/CustomerDetailDrawer";

/**
 * Panel "Pelanggan" dashboard admin — kartu ringkas per pelanggan; detail lengkap
 * (alamat + riwayat belanja) dibuka lewat `CustomerDetailDrawer`.
 *
 * Datanya dari `/api/admin/customers` (service role) karena tabel `customers`
 * dibatasi RLS "read own" — anon client admin tidak bisa membaca pelanggan lain.
 */

const BULAN_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

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

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5" style={{ background: "var(--sub)", color: "var(--fg2)" }}>{icon}</div>
      <p className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-lg font-extrabold mt-0.5" style={{ color: "var(--fg)" }}>{value}</p>
    </div>
  );
}

function CustomerRow({ c, currentMonth, onDetail }: { c: AdminCustomer; currentMonth: number; onDetail: () => void }) {
  const initials = c.name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
  const b = c.birthDate ? parseBirth(c.birthDate) : null;
  const isBirthdayMonth = !!b && b.m === currentMonth;
  const isBirthdayToday = !!b && b.m === currentMonth && b.d === new Date().getDate();

  return (
    <article className="card p-4 lg:p-5">
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 lg:w-12 lg:h-12 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold text-white" style={{ background: "var(--fg)" }}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm lg:text-base font-bold truncate" style={{ color: "var(--fg)" }}>{c.name}</h3>
                {!c.registered && <span className="badge" style={{ background: "var(--sub)", color: "var(--fg3)" }}>Belum daftar</span>}
              </div>
              <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: "var(--text-muted)" }}>
                <Phone size={12} strokeWidth={1.9} /> {c.whatsapp || "Tanpa nomor"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm lg:text-base font-extrabold" style={{ color: "var(--fg)" }}>{money(c.totalSpend)}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{c.ordersCount} pesanan</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="badge inline-flex items-center gap-1.5" style={{ background: isBirthdayMonth ? "#fef3c7" : "var(--sub)", color: isBirthdayMonth ? "#b45309" : "var(--fg2)" }}>
              <Cake size={12} strokeWidth={2} />
              {b ? `${b.d} ${BULAN_SHORT[b.m - 1]} ${b.y}` : "Ulang tahun belum diisi"}
              {isBirthdayToday && " · hari ini 🎉"}
            </span>
            {c.lastOrderAt && (
              <span className="badge" style={{ background: "var(--sub)", color: "var(--fg2)" }}>
                Belanja terakhir {formatDate(c.lastOrderAt)}
              </span>
            )}
          </div>

          <button
            onClick={onDetail}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-2.5 py-1.5 -ml-2.5"
            style={{ color: "var(--fg)", border: "1px solid var(--bd)" }}
          >
            <ShoppingBag size={13} strokeWidth={2} />
            Riwayat Belanja &amp; Alamat ({c.orders.length})
            <ChevronRight size={14} strokeWidth={2} style={{ color: "var(--gold)" }} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CustomersView() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "birthday">("all");
  const [selected, setSelected] = useState<AdminCustomer | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/customers", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setCustomers(json.customers || []);
      } catch (e) {
        console.error("[ADMIN] Gagal memuat pelanggan:", e);
        if (mounted) setError("Gagal memuat data pelanggan. Coba muat ulang halaman.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const currentMonth = new Date().getMonth() + 1;

  const stats = useMemo(() => {
    const birthdayThisMonth = customers.filter((c) => {
      const b = c.birthDate ? parseBirth(c.birthDate) : null;
      return !!b && b.m === currentMonth;
    }).length;
    return {
      total: customers.length,
      registered: customers.filter((c) => c.registered).length,
      birthdayThisMonth,
      revenue: customers.reduce((sum, c) => sum + c.totalSpend, 0),
    };
  }, [customers, currentMonth]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => {
        if (filter === "birthday") {
          const b = c.birthDate ? parseBirth(c.birthDate) : null;
          if (!b || b.m !== currentMonth) return false;
        }
        if (!q) return true;
        return c.name.toLowerCase().includes(q) || (c.whatsapp || "").includes(q);
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [customers, query, filter, currentMonth]);

  if (loading) {
    return <div className="card p-10 flex items-center justify-center"><Loader2 size={22} className="animate-spin" style={{ color: "var(--gold)" }} /></div>;
  }

  return (
    <div className="space-y-5">
      {error && <div className="card p-4 text-sm" style={{ color: "#b91c1c" }}>{error}</div>}

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users size={16} strokeWidth={1.9} />} label="Total Pelanggan" value={String(stats.total)} />
        <StatCard icon={<ShoppingBag size={16} strokeWidth={1.9} />} label="Total Belanja" value={money(stats.revenue)} />
        <StatCard icon={<Cake size={16} strokeWidth={1.9} />} label="Ulang Tahun Bulan Ini" value={String(stats.birthdayThisMonth)} />
        <StatCard icon={<User size={16} strokeWidth={1.9} />} label="Punya Akun" value={`${stats.registered} / ${stats.total}`} />
      </div>

      {/* Cari + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} strokeWidth={1.9} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--fg3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau WhatsApp…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none"
            style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--fg)" }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--fg3)" }}>
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {([{ id: "all", label: "Semua" }, { id: "birthday", label: "Ulang Tahun Bulan Ini" }] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className="text-xs font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap"
              style={{
                background: filter === t.id ? "var(--fg)" : "transparent",
                color: filter === t.id ? "#fff" : "var(--fg2)",
                border: `1px solid ${filter === t.id ? "var(--fg)" : "var(--bd)"}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {customers.length === 0 ? "Belum ada pelanggan" : "Tidak ada pelanggan yang cocok"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => <CustomerRow key={c.key} c={c} currentMonth={currentMonth} onDetail={() => setSelected(c)} />)}
        </div>
      )}

      <CustomerDetailDrawer customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
