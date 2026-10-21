"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Primitif UI bersama untuk modul Affiliate di dashboard admin.
 * Gaya mengikuti komponen admin yang sudah ada (Tailwind + CSS var tema admin),
 * bukan gaya portal affiliate.
 */

export function money(value: number | null | undefined): string {
  return "Rp " + Math.round(Number(value || 0)).toLocaleString("id-ID");
}

export function num(value: number | null | undefined): string {
  return Math.round(Number(value || 0)).toLocaleString("id-ID");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${fmtDate(iso)}, ${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

export const AFFILIATE_STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu Persetujuan",
  aktif: "Aktif",
  ditolak: "Ditolak",
  nonaktif: "Nonaktif",
};

export const COMMISSION_STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu Validasi",
  disetujui: "Disetujui",
  dibayarkan: "Dibayarkan",
  ditolak: "Tidak Disetujui",
};

export const WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu",
  diproses: "Diproses",
  berhasil: "Berhasil",
  ditolak: "Ditolak",
};

export function StatusBadge({ status, kind }: { status: string; kind: "affiliate" | "commission" | "withdrawal" }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    menunggu: { label: "Menunggu", bg: "#fff7ed", fg: "#c2410c" },
    aktif: { label: "Aktif", bg: "#ecfdf5", fg: "#047857" },
    ditolak: { label: "Ditolak", bg: "#fef2f2", fg: "#b91c1c" },
    nonaktif: { label: "Nonaktif", bg: "#f3f4f6", fg: "#4b5563" },
    disetujui: { label: "Disetujui", bg: "#ecfdf5", fg: "#047857" },
    dibayarkan: { label: "Dibayarkan", bg: "#f3f4f6", fg: "#111827" },
    diproses: { label: "Diproses", bg: "#eff6ff", fg: "#1d4ed8" },
    berhasil: { label: "Berhasil", bg: "#ecfdf5", fg: "#047857" },
  };
  const tone = map[status] || { label: status, bg: "#f3f4f6", fg: "#4b5563" };
  const label =
    kind === "affiliate"
      ? AFFILIATE_STATUS_LABEL[status] || tone.label
      : kind === "commission"
        ? COMMISSION_STATUS_LABEL[status] || tone.label
        : WITHDRAWAL_STATUS_LABEL[status] || tone.label;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: tone.bg, color: tone.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
      {label}
    </span>
  );
}

export function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
          <p className="text-lg font-extrabold mt-1" style={{ color: "var(--fg)" }}>{value}</p>
          {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--fg3)" }}>{sub}</p>}
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--sub)", color: "var(--fg2)" }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
      <div>
        <h1 className="text-xl font-extrabold" style={{ color: "var(--fg)" }}>{title}</h1>
        {sub && <p className="text-sm mt-1" style={{ color: "var(--fg2)" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="text-left text-[11px] font-bold uppercase tracking-wide px-3 py-2.5 whitespace-nowrap"
                style={{ color: "var(--fg3)", background: "var(--sub)", borderBottom: "1px solid var(--bd)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminTh({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`px-3 py-2.5 align-middle ${className}`} style={{ borderBottom: "1px solid var(--bd)" }}>
      {children}
    </td>
  );
}

export function LoadingBlock() {
  return (
    <div className="card p-10 flex items-center justify-center">
      <Loader2 size={22} className="animate-spin" style={{ color: "var(--fg3)" }} />
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="card p-4 text-sm" style={{ color: "#b91c1c" }}>
      {message}
    </div>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="card p-10 text-center text-sm" style={{ color: "var(--fg3)" }}>
      {message}
    </div>
  );
}

/** Ambil sesi admin + helper fetch ke route API admin. */
export async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json?.error) message = json.error;
    } catch {
      /* biarkan pesan default */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
