const reviews = [
  {
    initial: "A",
    name: "Ahmad R.",
    city: "Jakarta",
    quote: "Bahannya adem dan jahitannya rapi banget. Dipakai untuk shalat Jumat maupun acara terasa berkelas. Adminnya juga fast response.",
  },
  {
    initial: "F",
    name: "Fauzan H.",
    city: "Bandung",
    quote: "Pesan Thobe untuk keluarga, semuanya puas. Kualitas sesuai harga premiumnya. Packaging rapi dan pengiriman cepat.",
  },
  {
    initial: "I",
    name: "Irfan S.",
    city: "Surabaya",
    quote: "Proses order gampang, tinggal chat admin dan dibimbing pilih size. Hasilnya pas dan nyaman. Pasti langganan.",
  },
];

export default function Testimoni() {
  return (
    <section className="py-24 sm:py-32" style={{ background: "var(--cream)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="text-center max-w-xl mx-auto mb-16 fade-up">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-4" style={{ color: "var(--gold)" }}>
            Kata Mereka
          </p>
          <h2
            className="text-4xl sm:text-5xl font-medium mb-5"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
          >
            Dipercaya Pelanggan
          </h2>
          <p className="leading-[1.75]" style={{ color: "var(--coffee)" }}>
            Cerita nyata dari mereka yang telah merasakan kualitas dan pelayanan SAMAQU.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <figure key={r.name} className="fade-up rounded-[2px] p-8" style={{ background: "var(--sand-2)" }}>
              <div className="flex gap-1 mb-4" style={{ color: "var(--gold)" }}>
                &#9733;&#9733;&#9733;&#9733;&#9733;
              </div>
              <blockquote className="leading-[1.75] text-[15px] mb-6" style={{ color: "var(--coffee)" }}>
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ fontFamily: "var(--font-cormorant), Georgia, serif", background: "var(--clay)", color: "white" }}
                >
                  {r.initial}
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--espresso)" }}>
                    {r.name}
                  </p>
                  <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--stone)" }}>
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
