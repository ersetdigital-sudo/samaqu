"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Cake, Loader2, ShoppingBag, User, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CustomerDirectoryView from "@/components/customers/CustomerDirectoryView";
import type { DirectoryCustomer } from "@/lib/customer-directory";

/**
 * Panel "Pelanggan" dashboard admin — stat cards + daftar pelanggan.
 *
 * Datanya dari `/api/admin/customers` (service role) karena tabel `customers` dibatasi RLS
 * "read own". Daftar + filter/sort-nya dipakai bareng dashboard ops lewat
 * `src/components/customers/CustomerDirectoryView` (satu pusat data pelanggan).
 */

function money(n: number) {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

function parseBirth(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
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

export default function CustomersView() {
  const [customers, setCustomers] = useState<DirectoryCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      {/* Daftar pelanggan (komponen bersama admin + ops) */}
      <CustomerDirectoryView customers={customers} showExport />
    </div>
  );
}
