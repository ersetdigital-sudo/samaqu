import type { LucideIcon } from "lucide-react";

/**
 * Kartu statistik panel ops — SATU komponen yang dipakai semua layar ops
 * (Dashboard, Transaksi, dst) supaya bentuk dan iramanya tidak berbeda antar halaman.
 *
 * Irama kartu dikunci: baris label (ikon + teks, tidak wrap) → nilai (selalu 1 baris) →
 * caption yang ditempel ke dasar kartu. Jadi semua kartu dalam satu baris selalu sejajar,
 * berapa pun panjang nominalnya.
 */
export default function GlassCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption: string;
  /** Warna nilai: negatif (retur), positif (hanya bila valid), atau redup (data belum tersedia). */
  tone?: "default" | "positive" | "negative" | "muted";
}) {
  const valueTone =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : tone === "muted"
          ? "text-slate-400"
          : "text-slate-900";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
      <div className="flex items-center gap-2 text-slate-500 min-h-[20px]">
        <Icon size={16} className="shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className={`font-black mt-3 whitespace-nowrap leading-tight text-[clamp(1.05rem,1.5vw,1.75rem)] ${valueTone}`}>{value}</p>
      <p className="text-slate-500 text-xs mt-auto pt-1.5">{caption}</p>
    </div>
  );
}
