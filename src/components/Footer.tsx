import { getWhatsAppLink } from "@/lib/store-settings";

const navLinks = [
  { href: "/katalog", label: "Katalog" },
  { href: "/testimoni", label: "Testimoni" },
  { href: "/tentang-kami", label: "Tentang Kami" },
];

const helpLinks = [
  { href: "/#cara-pesan", label: "Cara Pesan" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#size", label: "Panduan Ukuran" },
];

export default function Footer() {
  return (
    <footer className="relative pt-12 sm:pt-20 pb-20 sm:pb-14 overflow-hidden" style={{ background: "#1a120f" }}>
      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
        aria-hidden="true"
      />

      {/* Gold accent border top */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(184,145,70,.25) 30%, rgba(184,145,70,.35) 50%, rgba(184,145,70,.25) 70%, transparent 95%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* Multi-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 pb-8 sm:pb-10 border-b" style={{ borderColor: "rgba(201,183,156,.12)" }}>
          {/* Column 1: Logo + Tagline */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <img
              src="/logo.svg"
              alt="SAMAQU"
              className="h-8 sm:h-10 w-auto mb-3 sm:mb-4"
              style={{ filter: "invert(1) brightness(0.9)" }}
            />
            <p
              className="text-xs sm:text-sm max-w-xs leading-[1.75] font-ui"
              style={{ color: "var(--sand)" }}
            >
              Untuk orang biasa yang sedang bertumbuh. Kualitas terbaik dengan harga yang lebih mudah dijangkau.
            </p>
          </div>

          {/* Column 2: Navigasi */}
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase font-ui font-semibold mb-3 sm:mb-4" style={{ color: "var(--gold)" }}>
              Navigasi
            </p>
            <nav aria-label="Navigasi footer" className="flex flex-col gap-2 sm:gap-2.5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[12px] sm:text-[13px] tracking-[0.12em] uppercase font-ui transition-colors duration-300 hover:text-gold"
                  style={{ color: "rgba(248,246,242,.7)" }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Column 3: Bantuan */}
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase font-ui font-semibold mb-3 sm:mb-4" style={{ color: "var(--gold)" }}>
              Bantuan
            </p>
            <nav aria-label="Bantuan footer" className="flex flex-col gap-2 sm:gap-2.5">
              {helpLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[12px] sm:text-[13px] tracking-[0.12em] uppercase font-ui transition-colors duration-300 hover:text-gold"
                  style={{ color: "rgba(248,246,242,.7)" }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Column 4: Terhubung */}
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase font-ui font-semibold mb-3 sm:mb-4" style={{ color: "var(--gold)" }}>
              Terhubung
            </p>
            <nav aria-label="Terhubung footer" className="flex flex-col gap-2 sm:gap-2.5">
              <a
                href="https://instagram.com/samaqu.id"
                target="_blank"
                rel="noopener"
                className="text-[12px] sm:text-[13px] tracking-[0.12em] uppercase font-ui transition-colors duration-300 hover:text-gold"
                style={{ color: "rgba(248,246,242,.7)" }}
              >
                Instagram
              </a>
              <a
                href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
                target="_blank"
                rel="noopener"
                className="text-[12px] sm:text-[13px] tracking-[0.12em] uppercase font-ui transition-colors duration-300 hover:text-gold"
                style={{ color: "rgba(248,246,242,.7)" }}
              >
                WhatsApp
              </a>
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div
          className="pt-5 sm:pt-8 text-[11px] sm:text-xs font-ui text-center"
          style={{ color: "rgba(216,196,168,.5)" }}
        >
          <p>&copy; 2026 SAMAQU. Semua hak cipta dilindungi. Dibuat dengan kepedulian &amp; rasa bangga.</p>
        </div>
      </div>
    </footer>
  );
}
