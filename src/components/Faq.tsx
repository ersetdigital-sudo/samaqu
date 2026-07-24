"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqs = [
  {
    id: "faq-1",
    q: "Bagaimana cara memesan produk SAMAQU?",
    a: "Pilih produk dari katalog, cek panduan size, lalu klik tombol WhatsApp untuk menghubungi admin. Admin akan membantu konfirmasi ketersediaan hingga pembayaran.",
  },
  {
    id: "faq-2",
    q: "Apakah bahan SAMAQU nyaman dan adem?",
    a: "Ya. Kami memilih bahan premium yang adem, ringan, dan nyaman digunakan untuk ibadah maupun keseharian dalam waktu lama.",
  },
  {
    id: "faq-3",
    q: "Bagaimana jika saya ragu memilih ukuran?",
    a: "Gunakan panduan size kami sebagai acuan. Jika masih ragu, chat admin dengan menyebutkan tinggi dan postur — kami bantu tentukan ukuran paling pas.",
  },
  {
    id: "faq-4",
    q: "Apakah bisa pesan dalam jumlah banyak / grosir?",
    a: "Tentu. Melalui fitur Create Your Price, kami menyusun penawaran khusus untuk pemesanan jumlah banyak, seragam komunitas, atau acara tertentu.",
  },
  {
    id: "faq-5",
    q: "Apakah ada garansi untuk produk?",
    a: "Setiap produk melewati quality check sebelum dikirim. Bila ada kendala pada pesananmu, hubungi admin dan kami akan bantu menyelesaikannya.",
  },
];

export default function Faq() {
  return (
    <section
      id="faq"
      className="py-20 sm:py-28 lg:py-32"
      style={{ background: "var(--sand-2)" }}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-14 fade-up">
            <p
              className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 font-ui"
              style={{ color: "var(--gold)" }}
            >
              Pertanyaan Umum
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-medium leading-tight"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                color: "var(--espresso)",
              }}
            >
              FAQ
            </h2>
          </div>

          {/* Accordion */}
          <Accordion
            defaultValue={["faq-1"]}
            className="fade-up space-y-2 sm:space-y-3"
          >
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-white rounded-sm border-0 px-5 sm:px-6 data-[open]:shadow-md"
                style={{
                  boxShadow: "0 4px 20px -8px rgba(43,38,32,.08)",
                }}
              >
                <AccordionTrigger
                  className="py-4 sm:py-5 text-[14px] sm:text-[15px] font-medium leading-snug text-left hover:no-underline"
                  style={{
                    color: "var(--espresso)",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                  }}
                >
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent
                  className="text-[13px] sm:text-sm leading-[1.75] pb-5"
                  style={{ color: "var(--coffee)" }}
                >
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
