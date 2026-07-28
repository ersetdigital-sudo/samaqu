import { getWhatsAppLink } from "@/lib/store-settings";

const navLinks = [
  { href: "/katalog", label: "Katalog" },
  { href: "/testimoni", label: "Testimoni" },
  { href: "/tentang-kami", label: "Tentang Kami" },
];

const helpLinks = [
  { href: "/cara-pesan", label: "CARA PESAN" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#size", label: "PANDUAN UKURAN" },
  { href: "/create-your-price", label: "CREATE YOUR PRICE" },
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
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/samaqu.id"
                target="_blank"
                rel="noopener"
                aria-label="Instagram @samaqu.id"
                className="flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300 hover:text-gold"
                style={{ color: "rgba(248,246,242,.7)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
                target="_blank"
                rel="noopener"
                aria-label="WhatsApp Admin SAMAQU"
                className="flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300 hover:text-gold"
                style={{ color: "rgba(248,246,242,.7)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                  <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1zm0 0a5 5 0 0 0 5 5m0 0a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1h1z" />
                </svg>
              </a>
            </div>
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
