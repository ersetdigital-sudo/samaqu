const steps = [
  { num: "01", title: "Pilih Produk", desc: "Jelajahi katalog dan tentukan koleksi favoritmu — dari Thobe hingga Vest." },
  { num: "02", title: "Cek Size", desc: "Gunakan panduan size kami agar potongan pas dan nyaman dikenakan." },
  { num: "03", title: "Chat Admin", desc: "Hubungi admin via WhatsApp untuk konfirmasi ketersediaan dan pemesanan." },
  { num: "04", title: "Selesai", desc: "Bayar, pesanan diproses, dan busana pilihanmu segera dalam perjalanan." },
];

const waHref =
  "https://wa.me/6281234567890?text=" +
  encodeURIComponent("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.");

export default function CaraPemesanan() {
  return (
    <section id="cara-pesan" className="py-24 sm:py-32" style={{ background: "var(--cream)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="text-center max-w-xl mx-auto mb-16 fade-up">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-4" style={{ color: "var(--gold)" }}>
            Mudah &amp; Terarah
          </p>
          <h2
            className="text-4xl sm:text-5xl font-medium mb-5"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
          >
            Cara Pemesanan
          </h2>
          <p className="leading-[1.75]" style={{ color: "var(--coffee)" }}>
            Tanpa ribet. Empat langkah tenang dari melihat koleksi sampai pesanan dikonfirmasi admin kami.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="fade-up bg-white rounded-[2px] p-8 hover-lift"
              style={{ boxShadow: "0 20px 50px -35px rgba(43,38,32,.4)" }}
            >
              <p className="text-5xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--clay)" }}>
                {step.num}
              </p>
              <h3 className="text-base font-medium mb-2 tracking-[0.18em] uppercase" style={{ color: "var(--espresso)" }}>
                {step.title}
              </h3>
              <p className="text-sm leading-[1.75]" style={{ color: "var(--coffee)" }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 fade-up">
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:opacity-90"
            style={{ background: "var(--wa)" }}
          >
            <WhatsAppIcon />
            Mulai Pesan Sekarang
          </a>
        </div>
      </div>
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.6 6.3A7.85 7.85 0 0 0 12 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1A7.9 7.9 0 0 0 12 19.9 7.94 7.94 0 0 0 17.6 6.3ZM12 18.5a6.6 6.6 0 0 1-3.4-.9l-.24-.15-2.5.66.67-2.43-.16-.25A6.58 6.58 0 1 1 12 18.5Zm3.6-4.94c-.2-.1-1.17-.58-1.35-.64s-.31-.1-.44.1-.5.64-.62.77-.23.15-.43.05a5.4 5.4 0 0 1-1.59-.98 6 6 0 0 1-1.1-1.37c-.11-.2 0-.3.09-.4l.3-.35a1.36 1.36 0 0 0 .2-.33.37.37 0 0 0 0-.35c0-.1-.44-1.06-.6-1.45s-.32-.33-.44-.34h-.38a.72.72 0 0 0-.52.24 2.18 2.18 0 0 0-.68 1.62 3.79 3.79 0 0 0 .79 2 8.66 8.66 0 0 0 3.32 2.93c.46.2.83.32 1.11.41a2.68 2.68 0 0 0 1.23.08 2 2 0 0 0 1.32-.94 1.65 1.65 0 0 0 .11-.93c-.05-.09-.18-.14-.38-.24Z" />
    </svg>
  );
}
