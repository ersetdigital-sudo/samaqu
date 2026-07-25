"use client";

import { ReactNode } from "react";
import { ToastProvider } from "@/components/AdminToast";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
