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
  Pelanggan: "/ops/pelanggan",
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

/**
 * `state` navigasi ala react-router (react-router menyimpannya di history).
 * Disimpan di memori supaya halaman port Base44 (mis. form Edit Produk) tetap
 * menerimanya pada render pertama setelah navigasi klien. Konsekuensinya sama
 * seperti state di memori: hilang kalau halaman di-refresh/dibuka langsung.
 */
let navState: { path: string; state: any } | null = null;

/** useNavigate() ala react-router → router.push() Next */
export function useNavigate() {
  const router = useRouter();
  return (to: string | number, options?: { state?: any }) => {
    if (typeof to === "number") {
      if (to < 0) router.back();
      return;
    }
    // Selalu ditimpa — termasuk saat navigasi tanpa state — supaya state lama
    // tidak nyangkut dipakai halaman berikutnya.
    navState = { path: to, state: options?.state };
    router.push(to);
  };
}

export function useLocation(): { pathname: string; state: any } {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  // Sengaja TIDAK dicocokkan dengan pathname: saat transisi, komponen halaman
  // tujuan sudah render sebelum `window.location` ikut berpindah. Kalau digantungkan
  // ke pathname, render pertama selalu kehilangan state — form Edit Produk jadi kosong.
  // State selalu ditimpa di setiap useNavigate(), jadi tidak nyangkut ke halaman lain.
  return { pathname, state: navState?.state };
}
