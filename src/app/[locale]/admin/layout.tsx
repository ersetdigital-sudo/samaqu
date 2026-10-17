"use client";

import { ReactNode } from "react";
import { ToastProvider } from "@/components/AdminToast";
import "@/app/panel-admin/panel-transaksi.css";
import "@/app/panel-admin/panel-mono.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
