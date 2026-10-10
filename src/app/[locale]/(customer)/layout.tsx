"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

/** Halaman yang tampil fokus tanpa navbar (mis. form Open Order). */
const NAVBAR_HIDDEN_SUFFIXES = ["/open-order"];

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = NAVBAR_HIDDEN_SUFFIXES.some((suffix) => pathname?.endsWith(suffix));

  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
    </>
  );
}
