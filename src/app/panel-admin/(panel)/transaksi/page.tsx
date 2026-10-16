/**
 * Halaman Transaksi panel admin.
 *
 * Sengaja MEMAKAI halaman yang sama dengan dashboard ops (`/ops/transaksi`) — bukan disalin —
 * supaya form, logika, validasi, alur resi, dan tampilannya identik dan tidak pernah drift.
 *
 * Dibungkus `.ops-root` + `ops.css` karena halaman ops memakai token & font tema ops
 * (Inter + token shadcn), sedangkan shell panel admin memakai tema mockup sendiri.
 */
import "@/app/ops/ops.css";
import OpsTransaksi from "@/app/ops/transaksi/page";

export default function PanelTransaksiPage() {
  return (
    <div className="ops-root">
      <OpsTransaksi />
    </div>
  );
}
