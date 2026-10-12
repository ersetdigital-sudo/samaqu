"use client";

import { useRouter } from "next/navigation";

/**
 * Shim kecil supaya halaman yang di-port dari app Base44 (yang pakai react-router)
 * bisa jalan di Next.js App Router tanpa mengubah kodenya.
 */

/** Peta nama halaman Base44 → route /ops */
const PAGE_ROUTES: Record<string, string> = {
  Dashboard: "/ops",
  Transaksi: "/ops/transaksi",
  TambahTransaksi: "/ops/transaksi/tambah",
  Return: "/ops/retur",
  AnalisisRetur: "/ops/analisis-retur",
  Leads: "/ops/leads",
  LaporanLeads: "/ops/leads/laporan",
  MasterProduk: "/ops/master-produk",
  TambahProduk: "/ops/master-produk/tambah",
  RekapPembelian: "/ops/rekap-pembelian",
  TambahBarangMasuk: "/ops/barang-masuk",
  Pengeluaran: "/ops/pengeluaran",
  TambahPengeluaranOperasional: "/ops/pengeluaran/operasional",
  TambahPengeluaranPacking: "/ops/pengeluaran/packing",
  TargetPenjualan: "/ops/target-penjualan",
  Laporan: "/ops/laporan",
  LaporanPrint: "/ops/laporan/print",
};

export function createPageUrl(page: string): string {
  return PAGE_ROUTES[page] || `/ops/${String(page).toLowerCase()}`;
}

/** useNavigate() ala react-router → router.push() Next */
export function useNavigate() {
  const router = useRouter();
  return (to: string | number) => {
    if (typeof to === "number") {
      if (to < 0) router.back();
      return;
    }
    router.push(to);
  };
}

export function useLocation() {
  return { pathname: typeof window === "undefined" ? "" : window.location.pathname };
}
