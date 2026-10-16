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
  return (
    <>
      {/* Font sama seperti mockup (Inter + Plus Jakarta Sans) — dimuat lewat tag link supaya
          tidak menambah ketergantungan saat build. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
        rel="stylesheet"
      />
      <PanelShell>{children}</PanelShell>
    </>
  );
}
