import type { Metadata } from "next";
import CekResiClient from "@/components/public/CekResiClient";

export const metadata: Metadata = {
  title: "Cek Resi J&T",
  description:
    "Lacak paket SAMAQU lewat nomor resi J&T Express. Lihat status dan riwayat pengiriman.",
};

export default function CekResiPage() {
  return <CekResiClient />;
}
