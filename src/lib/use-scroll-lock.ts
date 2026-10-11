"use client";

import { useEffect } from "react";

/**
 * Mengunci scroll halaman selama panel meluncur (drawer) admin terbuka.
 *
 * Tanpa ini drawer punya scrollbar sendiri sementara halaman di belakangnya masih bisa
 * di-scroll, jadi terlihat dua scrollbar sekaligus (permintaan pemilik: "kok scroll nya
 * jadi ada 2 sih di detail pesanan"). Lebar scrollbar yang hilang dikompensasi lewat
 * `padding-right` supaya tata letak halaman tidak bergeser saat panel dibuka.
 *
 * Penghitung (counter) dipakai supaya panel yang terbuka bersamaan (mis. drawer pesanan +
 * ConfirmModal) hanya mengunci sekali, dan halaman tetap terkunci sampai panel terakhir
 * ditutup. Dipakai `OrderDetailDrawer`, `ProductDetailDrawer`, dan `CustomerDetailDrawer`.
 */
let locked = 0;

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locked += 1;
    const root = document.documentElement;
    const body = document.body;
    let restore: (() => void) | null = null;

    if (locked === 1) {
      const prevRoot = root.style.overflow;
      const prevBody = body.style.overflow;
      const prevPad = body.style.paddingRight;
      const gap = window.innerWidth - root.clientWidth;
      root.style.overflow = "hidden";
      body.style.overflow = "hidden";
      if (gap > 0) body.style.paddingRight = `${gap}px`;
      restore = () => {
        root.style.overflow = prevRoot;
        body.style.overflow = prevBody;
        body.style.paddingRight = prevPad;
      };
    }

    return () => {
      locked -= 1;
      if (locked === 0) restore?.();
    };
  }, [active]);
}
