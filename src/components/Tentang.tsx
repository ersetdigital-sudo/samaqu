import Image from "next/image";

export default function Tentang() {
  return (
    <section id="tentang" className="py-24 sm:py-32" style={{ background: "var(--sand-2)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="fade-up order-2 lg:order-1">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-5" style={{ color: "var(--gold)" }}>
            Tentang SAMAQU
          </p>
          <h2
            className="text-4xl sm:text-5xl font-medium mb-6 leading-tight"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}
          >
            Kesederhanaan yang Bermakna.
          </h2>
          <p className="leading-[1.75] mb-5" style={{ color: "var(--coffee)" }}>
            SAMAQU lahir dari keyakinan bahwa busana yang baik menemani setiap langkah ibadah dan keseharian dengan tenang. Kami memilih bahan yang adem, potongan yang rapi, dan detail yang halus — agar setiap yang mengenakannya merasa percaya diri dan bersahaja.
          </p>
          <p className="leading-[1.75] mb-8" style={{ color: "var(--coffee)" }}>
            Dari Thobe hingga Cover Hanger, setiap produk kami rawat dengan ketelitian dan hati. Karena bagi kami, kualitas adalah bentuk penghormatan pada pelanggan.
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-3xl mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                Adem
              </p>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--stone)" }}>
                Nyaman Dipakai
              </p>
            </div>
            <div>
              <p className="text-3xl mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                Rapi
              </p>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--stone)" }}>
                Jahitan Teliti
              </p>
            </div>
            <div>
              <p className="text-3xl mb-1" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
                Elegan
              </p>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--stone)" }}>
                Desain Berkelas
              </p>
            </div>
          </div>
        </div>

        <div className="fade-up order-1 lg:order-2">
          <div
            className="rounded-[2px] overflow-hidden"
            style={{ boxShadow: "0 40px 80px -35px rgba(43,38,32,.45)" }}
          >
            <Image
              src="/images/fab2fbc3-813a-4a5f-b67b-a34d9ef3514f.png"
              alt="Detail jahitan premium SAMAQU"
              width={600}
              height={800}
              className="w-full h-[60vh] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
