"use client";

const reviews = [
  {
    initial: "A",
    name: "Ahmad R.",
    city: "Jakarta",
    quote:
      "Bahannya adem dan jahitannya rapi banget. Dipakai untuk shalat Jumat maupun acara terasa berkelas. Adminnya juga fast response.",
    rating: 5,
  },
  {
    initial: "F",
    name: "Fauzan H.",
    city: "Bandung",
    quote:
      "Pesan Thobe untuk keluarga, semuanya puas. Kualitas sesuai harga premiumnya. Packaging rapi dan pengiriman cepat.",
    rating: 5,
  },
  {
    initial: "I",
    name: "Irfan S.",
    city: "Surabaya",
    quote:
      "Proses order gampang, tinggal chat admin dan dibimbing pilih size. Hasilnya pas dan nyaman. Pasti langganan.",
    rating: 5,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 mb-5" aria-label={`${count} dari 5 bintang`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < count ? "var(--gold)" : "none"}
          stroke="var(--gold)"
          strokeWidth="1.5"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimoni() {
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
            Kata Mereka
          </p>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-5 leading-tight"
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              color: "var(--espresso)",
            }}
          >
            Dipercaya Pelanggan
          </h2>
          <p
            className="text-sm sm:text-base leading-[1.75] font-ui"
            style={{ color: "var(--coffee)" }}
          >
            Cerita nyata dari mereka yang telah merasakan kualitas dan
            pelayanan SAMAQU.
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {reviews.map((r) => (
            <figure
              key={r.name}
              className="fade-up group relative bg-white rounded-sm p-6 sm:p-8 transition-all duration-500 hover:-translate-y-1"
              style={{
                boxShadow: "0 4px 24px -8px rgba(43,38,32,.08)",
              }}
            >
              {/* Gold accent bar top */}
              <span
                className="absolute top-0 left-6 sm:left-8 w-8 h-[2px] transition-all duration-500 group-hover:w-12"
                style={{ background: "var(--gold)" }}
              />

              <StarRating count={r.rating} />

              <blockquote
                className="text-[14px] sm:text-[15px] leading-[1.75] mb-6 font-ui"
                style={{ color: "var(--coffee)" }}
              >
                &ldquo;{r.quote}&rdquo;
              </blockquote>

              <figcaption className="flex items-center gap-3 pt-5 border-t" style={{ borderColor: "rgba(201,183,156,.2)" }}>
                <span
                  className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    background: "var(--sand-2)",
                    color: "var(--espresso)",
                    border: "1px solid rgba(201,183,156,.3)",
                  }}
                >
                  {r.initial}
                </span>
                <div>
                  <p
                    className="text-sm font-medium font-ui"
                    style={{ color: "var(--espresso)" }}
                  >
                    {r.name}
                  </p>
                  <p
                    className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase font-ui"
                    style={{ color: "var(--stone)" }}
                  >
                    {r.city}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
