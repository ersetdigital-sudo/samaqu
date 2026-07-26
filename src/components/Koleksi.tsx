import Image from "next/image";

const products = [
  {
    name: "Thobe",
    desc: "Potongan panjang klasik, adem, dan berwibawa.",
    src: "/images/57f4aded-cd60-412d-95b6-1085b51b97be.png",
    alt: "Thobe SAMAQU",
    isFeature: true,
    badge: "Signature",
  },
  {
    name: "Kandora",
    desc: "",
    src: "/images/e3214c06-ccf4-4342-aba7-849bf95da85a.png",
    alt: "Kandora SAMAQU",
    isFeature: false,
  },
  {
    name: "Koko",
    desc: "",
    src: "/images/515c6ce5-1ac8-48d7-9832-450cbcd4cac9.png",
    alt: "Baju Koko SAMAQU",
    isFeature: false,
  },
  {
    name: "Vest",
    desc: "",
    src: "/images/3b981a31-de0d-4aa5-9890-330ffe3f261d.png",
    alt: "Vest SAMAQU",
    isFeature: false,
  },
  {
    name: "Kabak",
    desc: "",
    src: "/images/b32f8726-78f1-455c-aff9-59ab8b1a1310.png",
    alt: "Kabak SAMAQU",
    isFeature: false,
  },
  {
    name: "Cover Hanger",
    desc: "",
    src: "/images/6aec5227-932a-4ff1-86e2-2a3bb34943e9.png",
    alt: "Cover Hanger SAMAQU",
    isFeature: false,
  },
];

import { getWhatsAppLink } from "@/lib/store-settings";

export default function Koleksi() {
  return (
    <section
      id="produk"
      className="py-24 sm:py-32"
      style={{ background: "var(--sand-2)" }}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 fade-up">
          <div className="max-w-xl">
            <p
              className="text-[12px] tracking-[0.32em] uppercase mb-4 font-ui"
              style={{ color: "var(--gold)" }}
            >
              Katalog SAMAQU
            </p>
            <h2
              className="text-4xl sm:text-5xl font-medium"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                color: "var(--espresso)",
              }}
            >
              Koleksi Pilihan
            </h2>
          </div>
          <p
            className="leading-[1.75] max-w-sm text-sm font-ui"
            style={{ color: "var(--coffee)" }}
          >
            Enam kategori inti yang dirancang untuk melengkapi setiap momen —
            ibadah, keseharian, hingga acara istimewa.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {products.map((product) =>
            product.isFeature ? (
              /* ── Feature card (large) ── */
              <a
                key={product.name}
                href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
                target="_blank"
                rel="noopener"
                className="group relative col-span-2 lg:col-span-2 lg:row-span-2 overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-500 hover:shadow-xl"
                style={{ borderColor: "rgba(216,196,168,.25)" }}
              >
                <Image
                  src={product.src}
                  alt={product.alt}
                  width={800}
                  height={600}
                  className="card-img w-full h-64 sm:h-80 lg:h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 transition-all duration-500 group-hover:bg-[rgba(43,38,32,.1)]"
                  style={{
                    background:
                      "linear-gradient(180deg,rgba(43,38,32,0) 40%,rgba(43,38,32,.75))",
                  }}
                />
                <div className="absolute bottom-0 left-0 p-5 sm:p-7">
                  <p
                    className="text-[10px] sm:text-[11px] tracking-[0.32em] uppercase mb-1 font-ui"
                    style={{ color: "var(--sand)" }}
                  >
                    {product.badge}
                  </p>
                  <h3
                    className="text-2xl sm:text-3xl text-white mb-1"
                    style={{
                      fontFamily: "var(--font-cormorant), Georgia, serif",
                    }}
                  >
                    {product.name}
                  </h3>
                  <p
                    className="text-[13px] sm:text-sm font-ui"
                    style={{ color: "rgba(216,196,168,.9)" }}
                  >
                    {product.desc}
                  </p>
                </div>
              </a>
            ) : (
              /* ── Regular card ── */
              <a
                key={product.name}
                href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
                target="_blank"
                rel="noopener"
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-500 hover:shadow-lg"
                style={{ borderColor: "rgba(216,196,168,.25)" }}
              >
                <Image
                  src={product.src}
                  alt={product.alt}
                  width={400}
                  height={300}
                  className="card-img w-full h-44 sm:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 transition-all duration-500 group-hover:bg-[rgba(43,38,32,.08)]"
                  style={{
                    background:
                      "linear-gradient(180deg,rgba(43,38,32,0) 45%,rgba(43,38,32,.7))",
                  }}
                />
                <div className="absolute bottom-0 left-0 p-4 sm:p-5">
                  <h3
                    className="text-xl sm:text-2xl text-white"
                    style={{
                      fontFamily: "var(--font-cormorant), Georgia, serif",
                    }}
                  >
                    {product.name}
                  </h3>
                </div>
              </a>
            )
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 fade-up">
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[12px] tracking-[0.18em] uppercase font-ui text-white transition-all duration-300 hover:opacity-90 hover:shadow-lg"
            style={{ background: "var(--espresso)" }}
          >
            Tanya Katalog Lengkap via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
