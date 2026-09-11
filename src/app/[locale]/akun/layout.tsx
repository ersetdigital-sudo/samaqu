"use client";

import { ReactNode } from "react";
import { AkunProvider } from "@/components/akun/AkunContext";
import AkunDesktopShell from "@/components/akun/AkunDesktopShell";
import AkunMobileShell from "@/components/akun/AkunMobileShell";

export default function AkunLayout({ children }: { children: ReactNode }) {
  return (
    <AkunProvider>
      <AkunDesktopShell>{children}</AkunDesktopShell>
      <AkunMobileShell>{children}</AkunMobileShell>
    </AkunProvider>
  );
}
