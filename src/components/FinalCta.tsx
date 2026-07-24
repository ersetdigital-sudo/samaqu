const waHref =
  "https://wa.me/6281234567890?text=" +
  encodeURIComponent("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.");

export default function FinalCta() {
  return (
    <section className="py-24 sm:py-28" style={{ background: "var(--espresso)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 text-center fade-up">
        <p className="text-[12px] tracking-[0.32em] uppercase mb-5" style={{ color: "var(--gold)" }}>
          Siap Tampil Berkelas?
        </p>
        <h2
          className="text-4xl sm:text-6xl font-medium mb-6 max-w-2xl mx-auto leading-tight"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}
        >
          Mulai Perjalanan Gaya Muslimmu Bersama SAMAQU.
        </h2>
        <p className="leading-[1.75] mb-9 max-w-lg mx-auto" style={{ color: "var(--sand)" }}>
          Pilih koleksi favoritmu dan biarkan admin kami membantu, dari pemilihan hingga pesanan sampai di tangan.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition hover:opacity-90"
            style={{ background: "var(--wa)", color: "white" }}
          >
            <WhatsAppIcon />
            Pesan via WhatsApp
          </a>
          <a
            href="#produk"
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-[12px] tracking-[0.18em] uppercase border transition hover:bg-white/10"
            style={{ borderColor: "var(--clay)", color: "var(--sand)" }}
          >
            Lihat Katalog
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
