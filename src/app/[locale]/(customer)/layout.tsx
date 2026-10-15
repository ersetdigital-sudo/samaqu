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
  const bare = barePathname(pathname);
  const isProductDetail = PRODUCT_DETAIL_RE.test(bare);
  // Detail produk: sembunyikan navbar atas hanya di mobile; desktop tetap.
  const hideNavbarOnMobile = !hideNavbar && isProductDetail;
  // Checkout: halaman fokus — nav bawah mobile TIDAK dirender sama sekali (route-gated, semua
  // locale) supaya tidak bertumpuk dengan bar "Buat Pesanan". Tinggi nav di-nol-kan lewat class
  // `checkout-mobile` (lihat globals.css). Desktop ≥1024 tidak berubah.
  const isCheckout = bare === "/checkout";
  // Detail produk & Open Order: nav bawah disembunyikan di mobile (halaman fokus, punya
  // navigasi sendiri) — lihat class `pd-mobile` di globals.css. Desktop tidak terpengaruh.
  const focusMobile = isProductDetail || bare === "/open-order";

  return (
    // Detail produk & Open Order (mobile) tampil tanpa nav bawah: lewat class `pd-mobile`,
    // nav bawah disembunyikan dan --mobile-nav-h di-nol-kan (lihat globals.css).
    // Semua hanya berlaku < md, jadi tablet & desktop tak berubah.
    <div className={focusMobile ? "pd-mobile" : isCheckout ? "checkout-mobile" : undefined}>
      {!hideNavbar && (
        // `hidden md:block` → hilang < md (mobile), tampil ≥ md (desktop, tak diubah).
        <div className={hideNavbarOnMobile ? "hidden md:block" : undefined}>
          <Navbar />
        </div>
      )}
      {/* Ruang bawah untuk nav mobile (0 di desktop, lihat --mobile-nav-h). */}
      <div style={{ paddingBottom: "var(--mobile-nav-h)" }}>{children}</div>
      {/* Nav bawah mobile: dirender di semua halaman toko KECUALI checkout (route-gated → tak
          bisa bocor ke halaman lain). Di checkout, bar "Buat Pesanan" mengambil alih dasar layar. */}
      {!isCheckout && <MobileBottomNav />}
      {!hideNavbar && (
        // Checkout (mobile/tablet < lg): tombol chat melayang disembunyikan supaya tidak menutupi
        // bar "Buat Pesanan" maupun field form. Desktop ≥1024 tetap seperti semula.
        isCheckout ? (
          <div className="hidden lg:block">
            <ChatWidget />
          </div>
        ) : (
          <ChatWidget />
        )
      )}
    </div>
  );
}
