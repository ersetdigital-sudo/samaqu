"use client";

const faqs = [
  {
    q: "Bagaimana cara memesan produk SAMAQU?",
    a: "Pilih produk dari katalog, cek panduan size, lalu klik tombol WhatsApp untuk menghubungi admin. Admin akan membantu konfirmasi ketersediaan hingga pembayaran.",
    defaultOpen: true,
  },
  {
    q: "Apakah bahan SAMAQU nyaman dan adem?",
    a: "Ya. Kami memilih bahan premium yang adem, ringan, dan nyaman digunakan untuk ibadah maupun keseharian dalam waktu lama.",
    defaultOpen: false,
  },
  {
    q: "Bagaimana jika saya ragu memilih ukuran?",
    a: "Gunakan panduan size kami sebagai acuan. Jika masih ragu, chat admin dengan menyebutkan tinggi dan postur — kami bantu tentukan ukuran paling pas.",
    defaultOpen: false,
  },
  {
    q: "Apakah bisa pesan dalam jumlah banyak / grosir?",
    a: "Tentu. Melalui fitur Create Your Price, kami menyusun penawaran khusus untuk pemesanan jumlah banyak, seragam komunitas, atau acara tertentu.",
    defaultOpen: false,
  },
  {
    q: "Apakah ada garansi untuk produk?",
    a: "Setiap produk melewati quality check sebelum dikirim. Bila ada kendala pada pesananmu, hubungi admin dan kami akan bantu menyelesaikannya.",
    defaultOpen: false,
  },
];

export default function Faq() {
  return (
    <section id="faq" className="py-24 sm:py-32" style={{ background: "var(--sand-2)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 max-w-3xl">
        <div className="text-center mb-14 fade-up">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-4" style={{ color: "var(--gold)" }}>
            Pertanyaan Umum
          </p>
          <h2
            className="text-4xl sm:text-5xl font-medium"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
          >
            FAQ
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="fade-up group bg-white rounded-[2px] px-6 py-5"
              open={faq.defaultOpen}
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-[15px]" style={{ color: "var(--espresso)" }}>
                  {faq.q}
                </span>
                <span className="faq-plus text-2xl leading-none" style={{ color: "var(--gold)" }}>+</span>
              </summary>
              <p className="leading-[1.75] text-sm mt-4" style={{ color: "var(--coffee)" }}>
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
