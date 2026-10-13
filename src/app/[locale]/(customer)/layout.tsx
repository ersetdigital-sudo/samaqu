"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import ChatWidget from "@/components/ChatWidget";

/** Halaman yang tampil fokus tanpa navbar (mis. form Open Order). */
const NAVBAR_HIDDEN_SUFFIXES = ["/open-order"];

/**
 * Halaman detail produk: `/katalog/<id>` (daftar `/katalog` tidak termasuk).
 * Dipakai untuk menyembunyikan navbar atas HANYA di mobile (< md) — desktop
 * tetap menampilkan navbar seperti biasa. Halaman detail produk di mobile
 * sudah punya bilah aksi sendiri di bawah, jadi cukup pakai nav bawah.
 */
const PRODUCT_DETAIL_RE = /^\/katalog\/[^/]+\/?$/;

/** Path tanpa prefix locale (/id, /en) supaya pencocokan tidak bergantung bahasa. */
function barePathname(pathname: string | null): string {
  return (pathname ?? "/").replace(/^\/(id|en)(?=\/|$)/, "") || "/";
}

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = NAVBAR_HIDDEN_SUFFIXES.some((suffix) => pathname?.endsWith(suffix));
  const isProductDetail = PRODUCT_DETAIL_RE.test(barePathname(pathname));
  // Detail produk: sembunyikan navbar atas hanya di mobile; desktop tetap.
  const hideNavbarOnMobile = !hideNavbar && isProductDetail;

  return (
    // Detail produk (mobile) punya bar aksi sendiri di dasar layar: lewat class `pd-mobile`,
    // nav bawah disembunyikan, --mobile-nav-h di-nol-kan, dan tombol chat diangkat tepat di atas
    // bar harga (lihat globals.css). Semua hanya berlaku < md, jadi tablet & desktop tak berubah.
    <div className={isProductDetail ? "pd-mobile" : undefined}>
      {!hideNavbar && (
        // `hidden md:block` → hilang < md (mobile), tampil ≥ md (desktop, tak diubah).
        <div className={hideNavbarOnMobile ? "hidden md:block" : undefined}>
          <Navbar />
        </div>
      )}
      {/* Ruang bawah untuk nav mobile (0 di desktop, lihat --mobile-nav-h). */}
      <div style={{ paddingBottom: "var(--mobile-nav-h)" }}>{children}</div>
      <MobileBottomNav />
      {!hideNavbar && <ChatWidget />}
    </div>
  );
}
