import Image from "next/image";

const images = [
  { src: "/images/c8a0800b-b9bb-4b53-bd5e-00f26a500219.png", alt: "SAMAQU thobe" },
  { src: "/images/6dc8bbe4-ca21-49a6-83a6-c2435d4b14db.png", alt: "SAMAQU thobe" },
  { src: "/images/4419a3a6-0e9a-46bc-97c1-657808a84044.png", alt: "SAMAQU tunik" },
  { src: "/images/dd7c9baf-e018-41d2-aa90-fde6d68a96f7.png", alt: "SAMAQU thobe" },
  { src: "/images/000ee3e5-1e1a-439e-a35e-4448fe95a3f6.png", alt: "SAMAQU thobe" },
  { src: "/images/6c9fafc8-b3b8-46ac-ace5-693bd7911905.png", alt: "SAMAQU vest" },
];

function InstagramIcon() {
  return (
    <svg
      className="absolute top-2.5 right-2.5 w-[22px] h-[22px] text-white"
      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.5))" }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Instagram() {
  return (
    <section className="py-14 sm:py-20" style={{ background: "var(--sand-2)" }}>
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Header */}
        <div className="text-center">
          <span
            className="inline-block h-px w-10 mb-5"
            style={{ background: "var(--gold)" }}
          />
          <p
            className="font-semibold font-ui"
            style={{
              letterSpacing: "0.24em",
              fontSize: "11px",
              color: "var(--gold)",
            }}
          >
            IKUTI PERJALANAN KAMI DI INSTAGRAM
          </p>
          <h2
            className="mt-3 text-[30px] sm:text-[40px] font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            @samaqu.id
          </h2>
        </div>

        {/* 3×2 Grid */}
        <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
          {images.map((img) => (
            <a
              key={img.src}
              href="https://instagram.com/samaqu.id"
              target="_blank"
              rel="noopener"
              className="group relative overflow-hidden rounded-[6px] aspect-square"
              style={{ background: "#e7e2da" }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={400}
                height={400}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <InstagramIcon />
            </a>
          ))}
        </div>

        {/* CTA */}
        <a
          href="https://instagram.com/samaqu.id"
          target="_blank"
          rel="noopener"
          className="mt-8 sm:mt-10 grid place-items-center rounded-md text-[13px] sm:text-[14px] font-bold tracking-[.12em] py-4 transition-colors duration-200"
          style={{
            background: "var(--gold-bright, #d3ab72)",
            color: "#1b1b1b",
          }}
        >
          LIHAT INSTAGRAM
        </a>
      </div>
    </section>
  );
}
