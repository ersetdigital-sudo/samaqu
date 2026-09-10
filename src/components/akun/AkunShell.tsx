"use client";

import { useRouter } from "next/navigation";
import { useSafeLocale } from "@/lib/safe-i18n";

export function AkunHeader({ title, back }: { title: string; back?: string }) {
  const locale = useSafeLocale();
  const router = useRouter();
  const href = back ? `/${locale}${back}` : undefined;
  return (
    <div className="md:hidden sticky top-0 z-30 -mx-4 px-4 bg-[#f5f1ea]/90 backdrop-blur flex items-center gap-3 pt-3 pb-4 border-b border-[#eae3d6]">
      <button
        type="button"
        onClick={() => (href ? router.push(href) : router.back())}
        className="w-10 h-10 -ml-1 grid place-items-center rounded-2xl bg-white shadow-[0_2px_8px_rgba(15,61,51,.08)] active:scale-95 transition"
        aria-label="Kembali"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0f3d33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
      </button>
      <h1 className="text-[17px] font-extrabold" style={{ color: "#0f3d33" }}>{title}</h1>
    </div>
  );
}
