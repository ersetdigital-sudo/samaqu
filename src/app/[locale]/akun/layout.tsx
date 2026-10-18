"use client";

import { ReactNode } from "react";
import { AkunProvider } from "@/components/akun/AkunContext";
import AkunShell from "@/components/akun/AkunShell";
import "@/app/panel-admin/panel-transaksi.css";
import "@/app/panel-admin/panel-mono.css";

export default function AkunLayout({ children }: { children: ReactNode }) {
  return (
    <AkunProvider>
      <AkunShell>{children}</AkunShell>
    </AkunProvider>
  );
}
