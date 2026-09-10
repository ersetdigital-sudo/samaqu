"use client";

import AkunShell, { AkunHeader } from "@/components/akun/AkunShell";
import { useStoreSettings, getWhatsAppLink } from "@/lib/store-settings";

export default function BantuanPage() {
  const settings = useStoreSettings();
  const link = getWhatsAppLink("Halo Admin SAMAQU, saya butuh bantuan.");

  return (
    <AkunShell>
      <AkunHeader title="Hubungi Admin" back="/akun" />

      <div className="md:flex md:justify-center">
        <div className="akun-card p-8 md:p-10 text-center md:max-w-[480px] w-full">
          <div className="mx-auto w-20 h-20 md:w-24 md:h-24 rounded-full grid place-items-center" style={{ background: "#e7f7ee" }}>
            <svg viewBox="0 0 32 32" className="w-11 h-11 md:w-12 md:h-12" fill="#25D366"><path d="M16 3a13 13 0 0 0-11.1 19.8L3 29l6.4-1.8A13 13 0 1 0 16 3Zm7.2 18.1c-.3.9-1.8 1.7-2.5 1.8-.7.1-1.5.1-2.6-.3-3.2-1.1-5.4-4.2-6.4-6-.7-1.2-1.2-2.6-1.1-3.8.1-1 .6-1.9 1.2-2.4.3-.3.7-.4 1.1-.4h.5c.4 0 .6.1.8.6l1 2.3c.1.3.1.5 0 .7l-.6.9c-.2.2-.2.4-.1.6.5 1 1.2 1.9 2 2.6.6.5 1.2.9 1.9 1.2.3.1.5.1.7-.1l.9-1c.2-.2.4-.2.7-.1l2.3 1.1c.4.2.5.4.5.7 0 .2 0 .5-.1.8Z" /></svg>
          </div>
          <h2 className="mt-5 text-xl md:text-2xl font-extrabold" style={{ color: "#0f3d33" }}>Butuh Bantuan?</h2>
          <p className="text-sm md:text-base text-[#6c7a75] mt-1.5">{settings.store_name} siap membantu kebutuhanmu.</p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-7 py-4 rounded-full font-extrabold text-sm md:text-base text-white flex items-center justify-center gap-2"
            style={{ background: "#25D366" }}
          >
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="#fff"><path d="M16 3a13 13 0 0 0-11.1 19.8L3 29l6.4-1.8A13 13 0 1 0 16 3Zm7.2 18.1c-.3.9-1.8 1.7-2.5 1.8-.7.1-1.5.1-2.6-.3-3.2-1.1-5.4-4.2-6.4-6-.7-1.2-1.2-2.6-1.1-3.8.1-1 .6-1.9 1.2-2.4.3-.3.7-.4 1.1-.4h.5c.4 0 .6.1.8.6l1 2.3c.1.3.1.5 0 .7l-.6.9c-.2.2-.2.4-.1.6.5 1 1.2 1.9 2 2.6.6.5 1.2.9 1.9 1.2.3.1.5.1.7-.1l.9-1c.2-.2.4-.2.7-.1l2.3 1.1c.4.2.5.4.5.7 0 .2 0 .5-.1.8Z" /></svg>
            Chat via WhatsApp
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
          </a>
          <p className="text-[11px] text-[#9aa5a1] mt-4">Jam operasional 09.00 – 21.00 WIB</p>
        </div>
      </div>
    </AkunShell>
  );
}