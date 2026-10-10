import OpenOrderWizard from "@/components/open-order/OpenOrderWizard";

/**
 * Open Order Samaqu — alur 6 langkah (daftar produk → detail → keranjang → data pemesan →
 * review → pesanan berhasil). Tampil tanpa navbar (lihat (customer)/layout.tsx).
 */
export default function OpenOrderPage() {
  return <OpenOrderWizard />;
}
