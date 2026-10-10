/**
 * Komponen kecil & token warna alur Open Order.
 * Palet mengikuti halaman katalog SAMAQU (cream / espresso / gold) supaya tampilannya sama.
 * Semua langkah wizard memakai primitif di sini supaya tetap konsisten.
 */

import type { CSSProperties, ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

export const INK = "var(--espresso)";
export const MUTED = "var(--stone)";
export const GOLD = "var(--gold)";
export const LINE = "rgba(201,183,156,.35)";
export const FIELD_BG = "var(--cream-bright)";
export const DANGER = "#c0392b";
export const BADGE_BG = "rgba(181,140,74,.12)";
export const BADGE_INK = "var(--gold-deep)";

export function PrimaryButton({
  children,
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg px-6 py-3.5 text-[12px] font-medium uppercase tracking-[0.14em] transition-all duration-200 disabled:opacity-40 enabled:hover:opacity-90"
      style={{ background: INK, color: "var(--cream)" }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg px-6 py-3.5 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 disabled:opacity-40 hover:bg-[rgba(181,140,74,.09)]"
      style={{ border: `1px solid ${LINE}`, color: INK }}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium" style={{ color: MUTED }}>
        {label} {required && <span style={{ color: INK }}>*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] leading-relaxed" style={{ color: MUTED }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg px-4 py-3 text-[13.5px] outline-none transition-shadow duration-200 focus:ring-2 focus:ring-[rgba(181,140,74,.25)]";

export const inputStyle: CSSProperties = {
  background: FIELD_BG,
  color: INK,
  border: `1px solid ${LINE}`,
};

export function TextInput(props: React.ComponentPropsWithoutRef<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} style={{ ...inputStyle, ...props.style }} />;
}

export function TextArea(props: React.ComponentPropsWithoutRef<"textarea">) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} style={{ ...inputStyle, ...props.style }} />;
}

export function Chip({
  active,
  onClick,
  children,
  shape = "pill",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  shape?: "pill" | "square";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${shape === "pill" ? "rounded-full" : "rounded-lg"} px-4 py-2 text-[12.5px] transition-all duration-200`}
      style={
        active
          ? { background: INK, color: "var(--cream)", border: `1px solid ${INK}` }
          : { background: FIELD_BG, color: "var(--coffee)", border: `1px solid ${LINE}` }
      }
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: INK }}>
      {children}
    </p>
  );
}

export function Counter({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));

  return (
    <div className="inline-flex items-center gap-1 rounded-lg p-1" style={{ background: FIELD_BG, border: `1px solid ${LINE}` }}>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= min}
        aria-label="Kurangi jumlah"
        className="grid h-9 w-9 place-items-center rounded-lg transition-colors duration-200 disabled:opacity-30 enabled:hover:bg-white"
      >
        <Minus size={15} />
      </button>
      <span className="w-10 text-center text-[14px] font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={value >= max}
        aria-label="Tambah jumlah"
        className="grid h-9 w-9 place-items-center rounded-lg transition-colors duration-200 disabled:opacity-30 enabled:hover:bg-white"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

export function SummaryRow({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? "text-[15px]" : "text-[13px]"}`}>
      <span style={{ color: strong ? INK : MUTED }} className={strong ? "font-semibold" : ""}>
        {label}
      </span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""}`} style={{ color: INK }}>
        {value}
      </span>
    </div>
  );
}
