import type { ReactNode } from "react";
import PanelShell from "./PanelShell";

/**
 * Layout panel admin (`admin.samaqu.id` → /panel-admin/*).
 *
 * Tahap 1: kerangka + tema sesuai mockup dashboard admin. Belum ada halaman lama yang dipindah
 * dan halaman ops/admin yang sudah jalan tidak disentuh sama sekali.
 */
export const metadata = {
  title: "SAMAQU · Panel Admin",
};

export default function PanelAdminLayout({ children }: { children: ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}
