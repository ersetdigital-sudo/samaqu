import { getWhatsAppLink } from "@/lib/store-settings";

export default function CreateYourPrice() {
  return (
    <section className="py-14 sm:py-24 lg:py-32 relative overflow-hidden" style={{ background: "var(--espresso)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="fade-up max-w-2xl">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-5" style={{ color: "var(--gold)" }}>
            Create Your Price
          </p>
          <h2
            className="text-3xl sm:text-5xl font-medium mb-6"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}
          >
            Di Samaqu, Kamu Bisa Memilih Hargamu Sendiri.
          </h2>
          <p className="leading-[1.75] mb-8 max-w-md text-sm sm:text-base" style={{ color: "var(--sand)" }}>
            Kami tahu kemampuan setiap orang berbeda. Karena itu setiap produk memiliki Harga Minimum, dan kamu bebas menentukan harga terbaikmu selama tidak berada di bawah harga tersebut. Bukan karena produk kami tidak bernilai. Kami hanya ingin kualitas yang baik bisa dijangkau oleh lebih banyak orang.
          </p>
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[12px] tracking-[0.18em] uppercase font-semibold transition hover:opacity-90"
            style={{ background: "var(--gold)", color: "white" }}
          >
            Pelajari Create Your Price
          </a>
        </div>
      </div>
    </section>
  );
}
