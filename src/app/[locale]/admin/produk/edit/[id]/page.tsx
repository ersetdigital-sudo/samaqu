"use client";

/**
 * Halaman Edit Produk (dengan prefix locale).
 *
 * Sama seperti versi tanpa locale: SATU komponen bersama `ProductForm` untuk mode Tambah dan
 * Edit (lihat `src/components/admin/ProductForm.tsx`). Salinan terpisah yang lama sudah dihapus
 * karena membuat perilaku form Edit berbeda dari form Tambah (Cover & Hanger tampil sebagai
 * warna + ukuran). Jangan buat salinan baru.
 */

import { useParams } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";

export default function EditProdukPage() {
  const params = useParams<{ id?: string }>();
  const id = params?.id ? String(params.id) : "";
  return <ProductForm editProductId={id} />;
}
