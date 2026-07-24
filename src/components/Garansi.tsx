"use client";

const guarantees = [
  {
    title: "Kualitas Terjamin",
    desc: "Setiap produk melewati pengecekan jahitan dan bahan sebelum dikirim.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Pengiriman Aman",
    desc: "Dikemas rapi dan terlindungi agar sampai dalam kondisi sempurna.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8l9-5 9 5-9 5-9-5Z" />
        <path d="M3 8v8l9 5 9-5V8" />
      </svg>
    ),
  },
  {
    title: "Layanan Ramah",
    desc: "Admin siap membantu dari pemilihan size hingga setelah pembelian.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-3.6-7.2" />
        <path d="M21 4v4h-4" />
      </svg>
    ),
  },
];

export default function Garansi() {
  return (
    <section
      className="py-20 sm:py-28 lg:py-32"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-16 fade-up">
          <p
            className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 font-ui"
            style={{ color: "var(--gold)" }}
          >
            Ketenangan Berbelanja
          </p>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-5 leading-tight"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            Jaminan SAMAQU
          </h2>
          <p
            className="text-sm sm:text-base leading-[1.75] font-ui"
            style={{ color: "var(--coffee)" }}
          >
            Kami menjaga kepercayaanmu di setiap pesanan — dari kualitas
            hingga pelayanan.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {guarantees.map((g) => (
            <div
              key={g.title}
              className="fade-up group relative bg-white rounded-sm p-6 sm:p-8 text-center transition-all duration-500 hover:-translate-y-1"
              style={{
                boxShadow: "0 4px 24px -8px rgba(43,38,32,.08)",
              }}
            >
              {/* Icon container */}
              <div
                className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                style={{
                  background: "var(--sand-2)",
                  border: "1px solid rgba(201,183,156,.25)",
                }}
              >
                {g.icon}
              </div>

              <h3
                className="text-[13px] sm:text-base font-medium mb-3 tracking-[0.18em] uppercase font-ui"
                style={{ color: "var(--espresso)" }}
              >
                {g.title}
              </h3>

              <p
                className="text-[13px] sm:text-sm leading-[1.75] font-ui"
                style={{ color: "var(--coffee)" }}
              >
                {g.desc}
              </p>

              {/* Bottom accent line */}
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] transition-all duration-500 group-hover:w-10"
                style={{ background: "var(--gold)" }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
