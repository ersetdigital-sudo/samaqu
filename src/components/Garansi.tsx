const guarantees = [
  {
    title: "Kualitas Terjamin",
    desc: "Setiap produk melewati pengecekan jahitan dan bahan sebelum dikirim.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.4">
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Pengiriman Aman",
    desc: "Dikemas rapi dan terlindungi agar sampai dalam kondisi sempurna.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.4">
        <path d="M3 8l9-5 9 5-9 5-9-5Z" />
        <path d="M3 8v8l9 5 9-5V8" />
      </svg>
    ),
  },
  {
    title: "Layanan Ramah",
    desc: "Admin siap membantu dari pemilihan size hingga setelah pembelian.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.4">
        <path d="M21 12a9 9 0 1 1-3.6-7.2" />
        <path d="M21 4v4h-4" />
      </svg>
    ),
  },
];

export default function Garansi() {
  return (
    <section className="py-24 sm:py-32" style={{ background: "var(--cream)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="text-center max-w-xl mx-auto mb-16 fade-up">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-4" style={{ color: "var(--gold)" }}>
            Ketenangan Berbelanja
          </p>
          <h2
            className="text-4xl sm:text-5xl font-medium mb-5"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
          >
            Jaminan SAMAQU
          </h2>
          <p className="leading-[1.75]" style={{ color: "var(--coffee)" }}>
            Kami menjaga kepercayaanmu di setiap pesanan — dari kualitas hingga pelayanan.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {guarantees.map((g) => (
            <div
              key={g.title}
              className="fade-up text-center px-6 py-10 bg-white rounded-[2px] hover-lift"
              style={{ boxShadow: "0 20px 50px -35px rgba(43,38,32,.4)" }}
            >
              <div
                className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ background: "var(--sand-2)" }}
              >
                {g.icon}
              </div>
              <h3 className="text-base font-medium mb-2 tracking-[0.18em] uppercase" style={{ color: "var(--espresso)" }}>
                {g.title}
              </h3>
              <p className="text-sm leading-[1.75]" style={{ color: "var(--coffee)" }}>
                {g.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
