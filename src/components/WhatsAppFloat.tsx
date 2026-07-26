"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsAppLink } from "@/lib/store-settings";

export default function WhatsAppFloat() {
  return (
    <a
      href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
      target="_blank"
      rel="noopener"
      aria-label="Butuh bantuan? Chat Admin SAMAQU via WhatsApp"
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 inline-flex items-center gap-2 sm:gap-2.5 rounded-full px-3.5 py-3 sm:px-5 sm:py-3.5 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg group"
      style={{
        background: "var(--espresso)",
        border: "1px solid rgba(184,145,70,.3)",
        boxShadow: "0 8px 24px -8px rgba(45,33,27,.3)",
      }}
    >
      <MessageCircle
        size={18}
        strokeWidth={1.5}
        className="transition-transform duration-300 group-hover:scale-110"
        style={{ color: "var(--gold)" }}
      />
      <span
        className="hidden sm:inline text-[11px] tracking-[0.16em] uppercase font-ui font-medium"
        style={{ color: "var(--cream)" }}
      >
        Butuh Bantuan?
      </span>
    </a>
  );
}
