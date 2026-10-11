"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { getProducts } from "@/lib/db";
import { itemsWithCatalogPhotos } from "@/lib/order-photo";
import { useSafeLocale } from "@/lib/safe-i18n";
import RincianPesanan, {
  RincianHeader,
  RINCIAN_CSS,
  type RincianOrder,
  type RincianOrderItem,
} from "@/components/akun/RincianPesanan";

export default function DetailPesananPage() {
  const params = useParams();
  const orderNo = decodeURIComponent(String(params.orderNo));
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;
  const [order, setOrder] = useState<RincianOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function init() {
      const customer = await getCurrentCustomer();
      if (!customer) return;

      // Katalog diambil bersamaan dengan pesanan: fotonya dipakai untuk mengisi item
      // yang `product_image`-nya kosong (lihat src/lib/order-photo.ts).
      const [orders, catalog] = await Promise.all([getCustomerOrders(customer.id), getProducts()]);
      const found = (orders as RincianOrder[]).find((o) => o.order_number === orderNo);

      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrder({
        ...found,
        order_items: itemsWithCatalogPhotos<RincianOrderItem>(found.order_items || [], catalog),
      });
      setLoading(false);
    }
    init();
  }, [orderNo]);

  if (loading) {
    return (
      <div className="rp-root -mx-4 -mt-4 md:mx-0 md:mt-0">
        <style>{RINCIAN_CSS}</style>
        <RincianHeader title="Detail Pesanan" back="/akun/pesanan" />
        <div className="rp-wrap">
          <div className="rp-card animate-pulse" style={{ height: 208 }} />
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="rp-root -mx-4 -mt-4 md:mx-0 md:mt-0">
        <style>{RINCIAN_CSS}</style>
        <RincianHeader title="Detail Pesanan" back="/akun/pesanan" />
        <div className="rp-wrap">
          <div className="rp-card" style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontWeight: 800 }}>Pesanan tidak ditemukan</p>
            <p style={{ fontSize: 13, color: "#757575", marginTop: 6 }}>
              Pesanan ini tidak ada di akun Anda.
            </p>
            <Link href={to("/akun/pesanan")} className="rp-btn" style={{ marginTop: 16 }}>
              Kembali ke Pesanan Saya
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <RincianPesanan order={order} />;
}
