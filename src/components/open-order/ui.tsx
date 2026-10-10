/**
 * Komponen kecil alur Open Order — gaya monokrom (hitam/putih) sesuai desain referensi.
 * Semua langkah wizard memakai primitif di sini supaya tampilannya konsisten.
 */

import type { CSSProperties, ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

export const INK = "#000000";
export const MUTED = "#808080";
export const LINE = "#e5e5e5";
export const FIELD_BG = "#f0f0f0";
export const DANGER = "#c0392b";
export const BADGE_BG = "#fff3cc";
export const BADGE_INK = "#8a6d1b";

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
      className="w-full rounded-xl px-6 py-4 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-white transition-opacity duration-200 disabled:opacity-40 enabled:hover:opacity-85"
      style={{ background: INK }}
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
      className="w-full rounded-xl px-6 py-3.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 disabled:opacity-40 hover:bg-black/[.04]"
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
  "w-full rounded-xl px-4 py-3 text-[13.5px] outline-none transition-shadow duration-200 focus:ring-2 focus:ring-black/10";

export const inputStyle: CSSProperties = {
  background: FIELD_BG,
  color: INK,
  border: "1px solid transparent",
};

export function TextInput(props: React.ComponentPropsWithoutRef<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} style={{ ...inputStyle, ...props.style }} />;
}

export function TextArea(props: React.ComponentPropsWithoutRef<"textarea">) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} style={{ ...inputStyle, ...props.style }} />;
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors duration-200"
      style={
        active
          ? { background: INK, color: "white", border: `1px solid ${INK}` }
          : { background: "white", color: INK, border: `1px solid ${LINE}` }
      }
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: MUTED }}>
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
    <div className="inline-flex items-center gap-1 rounded-xl p-1" style={{ background: FIELD_BG }}>
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
