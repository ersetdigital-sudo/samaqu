import Image from "next/image";

const links = [
  { href: "#produk", label: "Produk" },
  { href: "#cara-pesan", label: "Cara Pesan" },
  { href: "#tentang", label: "Tentang" },
  { href: "#faq", label: "FAQ" },
  { href: "https://instagram.com/samaqu.id", label: "Instagram", external: true },
];

export default function Footer() {
  return (
    <footer className="py-14" style={{ background: "#211d18" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 pb-10 border-b"
          style={{ borderColor: "rgba(201,183,156,.2)" }}
        >
          <div>
            <Image
              src="/images/2191f072-7662-46be-9482-6958f6635adc.png"
              alt="SAMAQU"
              width={120}
              height={48}
              className="h-10 sm:h-12 w-auto mb-4"
            />
            <p className="text-sm max-w-xs leading-[1.75]" style={{ color: "var(--stone)" }}>
              Busana muslim pria premium — anggun dalam kesederhanaan.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-[13px] tracking-[0.18em] uppercase" style={{ color: "var(--sand)" }}>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener" : undefined}
                className="hover:opacity-60 transition"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-8 text-xs" style={{ color: "var(--stone)" }}>
          <p>&copy; 2024 SAMAQU. Semua hak cipta dilindungi.</p>
          <p>Dibuat dengan ketelitian &amp; hati.</p>
        </div>
      </div>
    </footer>
  );
}
