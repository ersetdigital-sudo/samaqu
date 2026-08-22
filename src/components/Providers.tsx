"use client";

import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/components/Toast";
import { LocaleProvider } from "@/lib/locale-context";
import MetaPixelProvider from "@/components/MetaPixelProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <CartProvider>
        <MetaPixelProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </MetaPixelProvider>
      </CartProvider>
    </LocaleProvider>
  );
}
