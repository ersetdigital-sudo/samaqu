"use client";

/**
 * Header mobile untuk halaman auth /akun (login & register): tombol kembali + judul.
 *
 * Halaman login/register dirender di luar AkunShell (lihat AkunShell.tsx), jadi sebelum ini
 * pengguna yang menekan "Akun" di nav bawah mendarat langsung di form tanpa penanda posisi
 * maupun jalan kembali. Tampil di bawah breakpoint `lg` — sama dengan panel kiri gaya desktop
 * yang hilang di sana.
 */

import { useRouter } from "next/navigation";
import { useSafeLocale } from "@/lib/safe-i18n";

export default function AuthHeader({ title }: { title: string }) {
  const router = useRouter();
  const locale = useSafeLocale();

  // history.length 1 = tab baru tanpa riwayat (URL dibuka langsung), jadi jangan tinggalkan app.
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(`/${locale}`);
  }

  return (
    <div className="lg:hidden absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-6 pt-4">
      <button
        type="button"
        onClick={goBack}
        aria-label="Kembali"
        className="w-10 h-10 -ml-1 grid place-items-center rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,.12)] active:scale-95 transition"
        style={{ color: "var(--espresso)" }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <span className="text-[15px] font-semibold" style={{ color: "var(--espresso)" }}>{title}</span>
    </div>
  );
}
