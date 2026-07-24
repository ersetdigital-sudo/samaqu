"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/* ── Agent data ── */
const agents = [
  {
    name: "Rian",
    role: "Layanan Pelanggan & Order",
    phone: "628xxxxxxxxxx",
    message: "Halo Admin Rian SAMAQU, saya ingin bertanya tentang produk...",
    initial: "R",
  },
  {
    name: "Dina",
    role: "Konsultasi Size & Bahan",
    phone: "628xxxxxxxxxx",
    message: "Halo Admin Dina SAMAQU, saya ingin konsultasi ukuran sebelum memesan...",
    initial: "D",
  },
  {
    name: "Sarah",
    role: "Kemitraan & Reseller",
    phone: "628xxxxxxxxxx",
    message: "Halo Admin Sarah SAMAQU, saya tertarik untuk menjadi mitra/reseller...",
    initial: "S",
  },
];

function waLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/* ── WhatsApp Icon (SAMAQU colors) ── */
function WhatsAppIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function FloatingWhatsApp() {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  /* ── Click outside to close ── */
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  /* ── Escape to close ── */
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-[999]"
    >
      {/* ── Popover Card ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-16 right-0 w-[90vw] sm:w-[360px] rounded-lg overflow-hidden"
            style={{
              border: "1px solid rgba(216,196,168,.3)",
              boxShadow: "0 25px 60px -15px rgba(42,33,27,.25)",
            }}
            role="dialog"
            aria-label="Pilih admin WhatsApp"
          >
            {/* Header */}
            <div
              className="px-5 py-5 flex items-start justify-between"
              style={{ background: "var(--espresso)" }}
            >
              <div className="flex items-start gap-3">
                <WhatsAppIcon size={24} color="var(--gold)" />
                <div>
                  <h3
                    className="text-lg font-medium leading-tight"
                    style={{
                      fontFamily: "var(--font-cormorant), Georgia, serif",
                      color: "var(--ivory)",
                    }}
                  >
                    Halo
                  </h3>
                  <p
                    className="text-[13px] mt-0.5 font-ui"
                    style={{ color: "var(--ivory)" }}
                  >
                    Kami siap membantu Anda
                  </p>
                  <p
                    className="text-[11px] mt-1.5 font-ui"
                    style={{ color: "var(--sand)" }}
                  >
                    Tim kami biasanya membalas dalam beberapa menit.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 transition-opacity hover:opacity-70"
                style={{ color: "var(--sand)" }}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Agent list */}
            <div style={{ background: "var(--ivory)" }}>
              {agents.map((agent, i) => (
                <a
                  key={agent.name}
                  href={waLink(agent.phone, agent.message)}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-3.5 px-5 py-4 transition-all duration-200 group"
                  style={{
                    borderBottom:
                      i < agents.length - 1
                        ? "1px solid rgba(201,183,156,.12)"
                        : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--sand-2)";
                    e.currentTarget.style.borderLeft = "3px solid var(--gold)";
                    e.currentTarget.style.paddingLeft = "17px";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderLeft = "none";
                    e.currentTarget.style.paddingLeft = "20px";
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
                    style={{
                      background: "var(--sand-2)",
                      border: "1px solid rgba(201,183,156,.25)",
                      fontFamily: "var(--font-cormorant), Georgia, serif",
                      color: "var(--espresso)",
                    }}
                  >
                    {agent.initial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-medium font-ui truncate"
                      style={{ color: "var(--espresso)" }}
                    >
                      {agent.name}
                    </p>
                    <p
                      className="text-[12px] font-ui truncate"
                      style={{ color: "var(--sand)" }}
                    >
                      {agent.role}
                    </p>
                  </div>

                  {/* WA icon */}
                  <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                    <WhatsAppIcon size={20} color="var(--gold)" />
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB Button ── */}
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full px-4 sm:px-5 py-3 sm:py-3.5 transition-all duration-300 hover:scale-105"
        style={{
          background: "var(--espresso)",
          border: "1px solid var(--gold)",
          boxShadow: "0 8px 24px -6px rgba(42,33,27,.35)",
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Tutup menu WhatsApp" : "Buka menu WhatsApp"}
        animate={{ rotate: isOpen ? 0 : 0 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={20} style={{ color: "var(--ivory)" }} />
            </motion.span>
          ) : (
            <motion.span
              key="wa"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <WhatsAppIcon size={20} color="var(--ivory)" />
            </motion.span>
          )}
        </AnimatePresence>
        <span
          className="hidden sm:inline text-[11px] tracking-[0.14em] uppercase font-ui font-medium"
          style={{ color: "var(--ivory)" }}
        >
          {isOpen ? "Tutup" : "Butuh Bantuan?"}
        </span>
      </motion.button>
    </div>
  );
}
