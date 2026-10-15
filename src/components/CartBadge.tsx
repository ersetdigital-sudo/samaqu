"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/* ── Cart badge with bounce animation ──
   Komponen bersama: dipakai tombol keranjang di header (Navbar) dan ikon keranjang
   di baris atas halaman detail produk (mobile, saat navbar atas disembunyikan).
   Angkanya langsung dari `useCart().totalItems` — sumber data yang sama dengan
   keranjang, tanpa state tambahan, jadi badge ikut berubah tanpa reload.
   Warna bisa diatur: header memakai emas (default), detail produk memakai hitam. */
export function CartBadge({
  background = "var(--gold)",
  color = "white",
}: {
  background?: string;
  color?: string;
}) {
  const { totalItems } = useCart();
  const [bump, setBump] = useState(false);
  const prev = usePrevious(totalItems);

  useEffect(() => {
    if (prev !== undefined && totalItems > prev) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      return () => clearTimeout(t);
    }
  }, [totalItems, prev]);

  if (totalItems === 0) return null;

  return (
    <span
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-ui font-bold"
      style={{
        background,
        color,
        transform: bump ? "scale(1.3)" : "scale(1)",
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {totalItems}
    </span>
  );
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useState<T | undefined>(undefined);
  const current = ref[0];
  ref[0] = value as T;
  return current;
}
