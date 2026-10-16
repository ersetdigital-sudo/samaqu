/**
 * Form Barang Masuk di panel admin (`/panel-admin/produk/barang-masuk`).
 *
 * Memakai halaman yang sama dengan ops (`/ops/barang-masuk`). Stok dinaikkan di SERVER lewat
 * RPC (`POST /api/ops/stock-in`), bukan ditulis ulang dari klien.
 */
import "@/app/ops/ops.css";
import TambahBarangMasuk from "@/app/ops/barang-masuk/page";

export default function PanelBarangMasukPage() {
  return (
    <div className="ops-root">
      <TambahBarangMasuk />
    </div>
  );
}
