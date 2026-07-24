const links = [
  { href: "#produk", label: "Produk" },
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
    <footer className="relative pt-20 sm:pt-24 pb-14 sm:pb-16 overflow-hidden" style={{ background: "#1a120f" }}>
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
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 pb-10 border-b"
          style={{ borderColor: "rgba(201,183,156,.12)" }}
        >
          <div>
            <img
              src="/logo.svg"
              alt="SAMAQU"
              className="h-10 sm:h-12 w-auto mb-4"
              style={{ filter: "invert(1) brightness(0.9)" }}
            />
            <p
              className="text-sm max-w-xs leading-[1.75] font-ui"
              style={{ color: "var(--sand)" }}
            >
              Busana muslim pria premium — anggun dalam kesederhanaan.
            </p>
          </div>
          <nav
            aria-label="Menu footer"
            className="flex flex-wrap gap-x-10 gap-y-3 text-[13px] tracking-[0.18em] uppercase font-ui"
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
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-8 text-xs font-ui"
          style={{ color: "rgba(216,196,168,.5)" }}
        >
          <p>&copy; 2024 SAMAQU. Semua hak cipta dilindungi.</p>
          <p>Dibuat dengan ketelitian &amp; hati.</p>
        </div>
      </div>
    </footer>
  );
}
