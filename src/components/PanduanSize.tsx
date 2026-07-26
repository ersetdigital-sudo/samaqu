const sizes = [
  { size: "S", tinggi: "160–165", dada: "52", panjang: "140" },
  { size: "M", tinggi: "166–171", dada: "55", panjang: "145" },
  { size: "L", tinggi: "172–177", dada: "58", panjang: "150" },
  { size: "XL", tinggi: "178–183", dada: "61", panjang: "155" },
  { size: "XXL", tinggi: "184–189", dada: "64", panjang: "160" },
];

import { getWhatsAppLink } from "@/lib/store-settings";

export default function PanduanSize() {
  return (
    <section id="size" className="py-24 sm:py-32" style={{ background: "var(--cream)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="fade-up">
            <p className="text-[12px] tracking-[0.32em] uppercase mb-4" style={{ color: "var(--gold)" }}>
              Pas &amp; Nyaman
            </p>
            <h2
              className="text-4xl sm:text-5xl font-medium mb-6"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
            >
              Panduan Ukuran
            </h2>
            <p className="leading-[1.75] mb-8" style={{ color: "var(--coffee)" }}>
              Temukan ukuran yang paling pas untukmu. Ragu memilih? Admin kami siap membantu menentukan size ideal sesuai tinggi dan postur tubuhmu.
            </p>
            <a
              href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:opacity-90"
              style={{ background: "var(--espresso)" }}
            >
              Konsultasi Size via WhatsApp
            </a>
          </div>

          <div
            className="fade-up overflow-hidden rounded-[2px] bg-white"
            style={{ boxShadow: "0 20px 60px -40px rgba(43,38,32,.5)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--espresso)" }} className="text-left" >
                  <th className="px-5 py-4 font-medium tracking-[0.18em] uppercase text-[11px]" style={{ color: "var(--sand)" }}>Size</th>
                  <th className="px-5 py-4 font-medium tracking-[0.18em] uppercase text-[11px]" style={{ color: "var(--sand)" }}>Tinggi (cm)</th>
                  <th className="px-5 py-4 font-medium tracking-[0.18em] uppercase text-[11px]" style={{ color: "var(--sand)" }}>Lebar Dada (cm)</th>
                  <th className="px-5 py-4 font-medium tracking-[0.18em] uppercase text-[11px]" style={{ color: "var(--sand)" }}>Panjang (cm)</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--coffee)" }}>
                {sizes.map((s, i) => (
                  <tr
                    key={s.size}
                    className="border-b"
                    style={{
                      borderColor: "rgba(201,183,156,.3)",
                      background: i % 2 === 1 ? "var(--sand-2)" : undefined,
                    }}
                  >
                    <td className="px-5 py-4 font-medium">{s.size}</td>
                    <td className="px-5 py-4">{s.tinggi}</td>
                    <td className="px-5 py-4">{s.dada}</td>
                    <td className="px-5 py-4">{s.panjang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-4 text-xs" style={{ color: "var(--stone)" }}>
              *Ukuran adalah panduan umum. Detail per produk dapat bervariasi — tanyakan admin untuk kepastian.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
