"use client";

import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/components/Toast";
import { LocaleProvider } from "@/lib/locale-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <CartProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </CartProvider>
    </LocaleProvider>
  );
}
