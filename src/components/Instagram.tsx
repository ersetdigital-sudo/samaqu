import Image from "next/image";

const images = [
  { src: "/images/2b03290e-7707-46b7-b307-454c09644396.png", alt: "Instagram SAMAQU" },
  { src: "/images/e3214c06-ccf4-4342-aba7-849bf95da85a.png", alt: "Instagram SAMAQU" },
  { src: "/images/515c6ce5-1ac8-48d7-9832-450cbcd4cac9.png", alt: "Instagram SAMAQU" },
  { src: "/images/6aec5227-932a-4ff1-86e2-2a3bb34943e9.png", alt: "Instagram SAMAQU" },
];

export default function Instagram() {
  return (
    <section className="py-14 sm:py-24 lg:py-32" style={{ background: "var(--sand-2)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-14 fade-up">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-3 sm:mb-4" style={{ color: "var(--gold)" }}>
            Ikuti Perjalanan Kami
          </p>
          <h2
            className="text-3xl sm:text-5xl font-medium mb-3 sm:mb-4"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
          >
            @samaqu.id
          </h2>
          <p className="leading-[1.75] text-sm sm:text-base truncate sm:line-clamp-none px-4 sm:px-0" style={{ color: "var(--coffee)" }}>
            Tentang produk, orang biasa, perjuangan, dan cerita-cerita kecil dari mereka yang terus bertumbuh.
          </p>
        </div>

        {/* Mobile: horizontal scroll | Desktop: 4-column grid */}
        <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-4 fade-up overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-5 px-5 sm:mx-0 sm:px-0 snap-x snap-mandatory">
          {images.map((img) => (
            <a
              key={img.src}
              href="https://instagram.com/samaqu.id"
              target="_blank"
              rel="noopener"
              className="group relative overflow-hidden rounded-[2px] aspect-square shrink-0 w-[42vw] sm:w-auto snap-start"
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={400}
                height={400}
                className="card-img w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                style={{ background: "rgba(43,38,32,.5)" }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.4">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        <div className="text-center mt-6 sm:mt-10 fade-up">
          <a
            href="https://instagram.com/samaqu.id"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full px-6 sm:px-7 py-3 sm:py-4 text-[11px] sm:text-[12px] tracking-[0.18em] uppercase border transition hover:bg-white"
            style={{ borderColor: "var(--clay)", color: "var(--coffee)" }}
          >
            Ikuti @samaqu.id
          </a>
        </div>
      </div>
    </section>
  );
}
