"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";

/**
 * True kalau sesi aktif milik customer (punya baris `customers`).
 * Dipakai link Beranda/logo: customer yang sudah login diarahkan ke
 * dashboard /akun, bukan homepage.
 */
export function useIsCustomerLoggedIn() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    getCurrentCustomer()
      .then((customer) => {
        if (alive) setLoggedIn(!!customer);
      })
      .catch(() => {
        if (alive) setLoggedIn(false);
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  return loggedIn;
}
