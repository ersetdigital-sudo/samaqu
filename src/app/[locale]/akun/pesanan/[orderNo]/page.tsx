"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { useSafeLocale } from "@/lib/safe-i18n";
import DetailPesananStruk, { StrukHeader, type StrukOrder } from "@/components/akun/DetailPesananStruk";

export default function DetailPesananPage() {
  const params = useParams();
  const orderNo = decodeURIComponent(String(params.orderNo));
  const locale = useSafeLocale();
  const to = (href: string) => `/${locale}${href}`;
  const [order, setOrder] = useState<StrukOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function init() {
      const c = await getCurrentCustomer();
      if (!c) return;
      const all = (await getCustomerOrders(c.id)) as StrukOrder[];
      const found = all.find((o) => o.order_number === orderNo);
      if (found) setOrder(found);
      else setNotFound(true);
      setLoading(false);
    }
    init();
  }, [orderNo]);

  if (loading) {
    return (
      <>
        <StrukHeader title="Detail Pesanan" back="/akun/pesanan" />
        <div className="akun-card h-52 animate-pulse" />
      </>
    );
  }

  if (notFound || !order) {
    return (
      <>
        <StrukHeader title="Detail Pesanan" back="/akun/pesanan" />
        <div className="akun-card p-10 text-center">
          <p className="font-extrabold" style={{ color: "#0f3d33" }}>Pesanan tidak ditemukan</p>
          <Link href={to("/akun/pesanan")} className="inline-block mt-4 akun-btn-green px-6 py-3 rounded-full text-sm font-extrabold">Kembali</Link>
        </div>
      </>
    );
  }

  return <DetailPesananStruk order={order} />;
}
