"use client";

import { ReactNode } from "react";
import { AkunProvider } from "@/components/akun/AkunContext";
import AkunShell from "@/components/akun/AkunShell";

export default function AkunLayout({ children }: { children: ReactNode }) {
  return (
    <AkunProvider>
      <AkunShell>{children}</AkunShell>
    </AkunProvider>
  );
}
