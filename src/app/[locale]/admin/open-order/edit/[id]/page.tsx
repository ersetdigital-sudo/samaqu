"use client";

import { use } from "react";
import ProductForm from "@/components/admin/ProductForm";

/**
 * Versi ber-bahasa-locale dari /admin/open-order/edit/<id> (/id/admin/open-order/edit/<id>).
 * Merender komponen yang SAMA supaya tidak pernah cuma masuk ke satu sisi.
 */
export default function OpenOrderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProductForm editProductId={id} priceTarget="openOrder" />;
}
