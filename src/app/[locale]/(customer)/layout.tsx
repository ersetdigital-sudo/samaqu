"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";

/** Halaman yang tampil fokus tanpa navbar (mis. form Open Order). */
const NAVBAR_HIDDEN_SUFFIXES = ["/open-order"];

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = NAVBAR_HIDDEN_SUFFIXES.some((suffix) => pathname?.endsWith(suffix));

  return (
    <>
      {!hideNavbar && <Navbar />}
      {/* Ruang bawah untuk nav mobile (0 di desktop, lihat --mobile-nav-h). */}
      <div style={{ paddingBottom: "var(--mobile-nav-h)" }}>{children}</div>
      <MobileBottomNav />
    </>
  );
}
