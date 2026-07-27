const links = [
  { href: "/katalog", label: "Katalog" },
  { href: "#cara-pesan", label: "Cara Pesan" },
  { href: "#tentang", label: "Tentang" },
  { href: "#faq", label: "FAQ" },
  {
    href: "https://instagram.com/samaqu.id",
    label: "Instagram",
    external: true,
  },
];

export default function Footer() {
  return (
    <footer className="relative pt-12 sm:pt-20 pb-8 sm:pb-14 overflow-hidden" style={{ background: "#1a120f" }}>
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
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 sm:gap-8 pb-6 sm:pb-10 border-b"
          style={{ borderColor: "rgba(201,183,156,.12)" }}
        >
          <div className="text-center md:text-left">
            <img
              src="/logo.svg"
              alt="SAMAQU"
              className="h-8 sm:h-12 w-auto mb-3 sm:mb-4 mx-auto md:mx-0"
              style={{ filter: "invert(1) brightness(0.9)" }}
            />
            <p
              className="text-xs sm:text-sm max-w-xs leading-[1.75] font-ui mx-auto md:mx-0"
              style={{ color: "var(--sand)" }}
            >
              Untuk orang biasa yang sedang bertumbuh. Kualitas terbaik dengan harga yang lebih mudah dijangkau.
            </p>
          </div>
          <nav
            aria-label="Menu footer"
            className="flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-2 sm:gap-x-10 sm:gap-y-3 text-[12px] sm:text-[13px] tracking-[0.18em] uppercase font-ui"
            style={{ color: "rgba(248,246,242,.7)" }}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener" : undefined}
                className="transition-colors duration-300 hover:text-gold"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
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
