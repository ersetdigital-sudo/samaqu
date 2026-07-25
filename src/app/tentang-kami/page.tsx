"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Scissors, Ruler, MessageCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function useCountUp(target: number, duration = 1800) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (!ref.current || counted.current) return;
    const el = ref.current;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !counted.current) {
        counted.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(eased * target).toLocaleString("id-ID");
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target.toLocaleString("id-ID");
        };
        requestAnimationFrame(step);
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return ref;
}

function StatNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useCountUp(target);
  return <span ref={ref}>0</span>;
}

export default function TentangKamiPage() {
  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden" style={{ background: "var(--espresso)" }}>
        <img src="/images/about/f2d1d803-2825-410f-a01e-5e125e8d2208.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(45,33,27,.8), rgba(45,33,27,.7), #2d211b)" }} />
        <div className="absolute top-24 right-8 w-40 h-40 rounded-full border opacity-20 hidden md:block" style={{ borderColor: "var(--gold)" }} />
        <div className="absolute bottom-16 left-10 w-24 h-24 rounded-full border opacity-15 hidden md:block" style={{ borderColor: "var(--gold)" }} />

        <div className="relative pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-24 lg:pb-32">
          <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
            <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
              <motion.p variants={headerVariants} className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase mb-4 sm:mb-6 font-ui font-medium" style={{ color: "#d4a86a" }}>
                Tentang SAMAQU
              </motion.p>
              <motion.h1 variants={headerVariants} className="text-[2rem] sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
                Lebih dari <em style={{ color: "#d4a86a" }}>Sekadar</em> Busana
              </motion.h1>
              <motion.div variants={headerVariants} className="mx-auto my-6 sm:my-8 h-px w-16" style={{ background: "var(--gold)" }} />
              <motion.p variants={headerVariants} className="text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mx-auto font-ui" style={{ color: "rgba(212,197,181,.8)" }}>
                Kami percaya busana yang baik menemani setiap langkah ibadah dan keseharian dengan tenang — dirancang dengan hati, ketelitian, dan penghormatan pada mereka yang mengenakannya.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══ BREADCRUMB ═══ */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14 pt-6 sm:pt-8 lg:pt-10 pb-2 sm:pb-3 lg:pb-4">
        <Breadcrumb />
      </div>

      {/* ═══ CERITA BRAND ═══ */}
      <div className="py-16 sm:py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Image */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <div className="relative">
                <img src="/images/about/897ae4e0-8b7a-43e9-843b-3b5b27141774.png" alt="Kandora premium SAMAQU" className="w-full h-[320px] sm:h-[420px] md:h-[560px] object-cover rounded-2xl" style={{ boxShadow: "0 25px 50px -12px rgba(45,33,27,.25)" }} />
                <div className="absolute -bottom-4 -right-3 sm:-right-6 px-5 py-4 rounded-xl shadow-2xl max-w-[200px] hidden sm:block" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
                  <p className="text-3xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#d4a86a" }}>Est.</p>
                  <p className="text-sm font-ui" style={{ color: "rgba(212,197,181,.8)" }}>Ketelitian di setiap jahitan</p>
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase font-ui font-semibold mb-4" style={{ color: "var(--gold)" }}>Cerita Kami</p>
              <h2 className="text-[1.6rem] sm:text-4xl lg:text-5xl font-semibold leading-tight mb-5 sm:mb-6" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
                Kesederhanaan yang Bermakna
              </h2>
              <div className="h-px w-16 mb-6 sm:mb-8" style={{ background: "var(--gold)" }} />
              <div className="space-y-4 sm:space-y-5 font-ui text-sm sm:text-base lg:text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                <p>
                  SAMAQU lahir dari keyakinan sederhana: setiap muslim berhak mengenakan busana yang <span className="font-medium" style={{ color: "var(--espresso)" }}>layak menemani momen-momen penting</span> — dari waktu shalat, keseharian, hingga acara istimewa.
                </p>
                <p>
                  Kami memilih bahan yang adem, potongan yang rapi, dan detail yang halus. Dari Thobe hingga Vest, setiap produk kami rawat dengan ketelitian dan hati. Karena bagi kami, kualitas adalah bentuk penghormatan pada pelanggan.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 sm:mt-10">
                {[
                  { title: "Kualitas", sub: "Bahan pilihan" },
                  { title: "Kenyamanan", sub: "Adem & ringan" },
                  { title: "Kepercayaan", sub: "Pelayanan tulus" },
                ].map((v, i) => (
                  <div key={v.title} className={`text-center sm:text-left ${i === 1 ? "border-x px-2 sm:px-3" : ""}`} style={{ borderColor: "rgba(201,183,156,.2)" }}>
                    <p className="text-base sm:text-lg" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{v.title}</p>
                    <p className="text-[10px] sm:text-xs font-ui mt-1" style={{ color: "var(--stone)" }}>{v.sub}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══ STATISTIK ═══ */}
      <div className="py-16 sm:py-24" style={{ background: "var(--espresso)" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <p className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase font-ui font-semibold mb-4" style={{ color: "#d4a86a" }}>Pencapaian</p>
            <h2 className="text-[1.6rem] sm:text-4xl lg:text-5xl font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
              Dipercaya di Setiap Momen
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-6">
            {[
              { value: 6, label: "Koleksi Eksklusif", suffix: "" },
              { value: 12, label: "Jenis Kain Pilihan", suffix: "+" },
              { value: 2500, label: "Pelanggan Puas", suffix: "+" },
              { value: 5, label: "Tahun Pengalaman", suffix: "" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="text-center">
                <p className="text-[2.2rem] sm:text-5xl lg:text-6xl font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "#d4a86a" }}>
                  <StatNumber target={stat.value} />{stat.suffix}
                </p>
                <div className="mx-auto my-3 sm:my-4 h-px w-12 sm:w-16" style={{ background: "var(--gold)" }} />
                <p className="text-[13px] sm:text-base font-ui" style={{ color: "rgba(212,197,181,.8)" }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ KOMITMEN KUALITAS ═══ */}
      <div className="py-16 sm:py-24 lg:py-28" style={{ background: "var(--bg-secondary, #efe8e0)" }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <p className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase font-ui font-semibold mb-4" style={{ color: "var(--gold)" }}>Komitmen Kami</p>
            <h2 className="text-[1.6rem] sm:text-4xl lg:text-5xl font-semibold mb-4 sm:mb-5" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Kualitas di Setiap Detail
            </h2>
            <p className="font-ui text-sm sm:text-base lg:text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Empat janji yang kami pegang dalam setiap produk yang sampai ke tanganmu.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {[
              { icon: ShieldCheck, title: "Material Pilihan", desc: "Kain yang adem, ringan, dan tidak panas — dipilih untuk kenyamanan sepanjang hari." },
              { icon: Scissors, title: "Jahitan Presisi", desc: "Setiap jahitan dikerjakan teliti dan rapi, melewati pengecekan sebelum dikirim." },
              { icon: Ruler, title: "Panduan Size Akurat", desc: "Panduan ukuran lengkap plus bantuan admin agar potongan pas dengan posturmu." },
              { icon: MessageCircle, title: "Support Responsif", desc: "Admin ramah siap membantu dari pemilihan size hingga setelah pembelian." },
            ].map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className="qcard rounded-2xl p-6 sm:p-8" style={{ background: "var(--cream)", border: "1px solid rgba(201,183,156,.2)" }}>
                <div className="qicon inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full mb-5 sm:mb-6" style={{ border: "1px solid rgba(201,183,156,.4)", color: "var(--gold)" }}>
                  <item.icon size={22} strokeWidth={1.4} />
                </div>
                <h3 className="text-xl sm:text-2xl mb-2 sm:mb-3" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{item.title}</h3>
                <p className="font-ui text-[13px] sm:text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ GALERI ═══ */}
      <div className="py-16 sm:py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-14">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <p className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase font-ui font-semibold mb-4" style={{ color: "var(--gold)" }}>Di Balik Layar</p>
            <h2 className="text-[1.6rem] sm:text-4xl lg:text-5xl font-semibold" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Ketelitian yang Terlihat
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-3 sm:gap-4 md:gap-5">
            <div className="gallery-item relative overflow-hidden rounded-xl sm:rounded-2xl md:row-span-2 col-span-2 h-52 sm:h-64 md:h-auto md:min-h-[400px]">
              <img src="/images/about/70cc4d03-6ed5-41e3-a349-9525e031af58.png" alt="Detail busana SAMAQU" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
              <div className="gallery-overlay absolute inset-0 flex items-end p-4 sm:p-5" style={{ background: "linear-gradient(to top, rgba(45,33,27,.7), transparent)" }}>
                <span className="text-base sm:text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>Detail Halus</span>
              </div>
            </div>
            {[
              { src: "/images/about/83338354-398a-40b8-88d6-0c39aab362e0.png", alt: "Koleksi SAMAQU" },
              { src: "/images/about/7e9438fb-090c-4499-864e-60ee00729172.png", alt: "Produk SAMAQU" },
              { src: "/images/about/ed8b38f2-83b0-4bf4-b061-f5d9bab20bf4.png", alt: "Tekstur kain SAMAQU" },
              { src: "/images/about/42ec219d-db51-471a-9c70-242750655b4a.png", alt: "Busana SAMAQU" },
            ].map((img, i) => (
              <div key={i} className="gallery-item relative overflow-hidden rounded-xl sm:rounded-2xl h-36 sm:h-44 md:h-auto md:min-h-[180px]">
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                <div className="gallery-overlay absolute inset-0" style={{ background: "rgba(45,33,27,.15)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CTA ═══ */}
      <div className="relative py-20 sm:py-28 lg:py-32 overflow-hidden" style={{ background: "var(--espresso)" }}>
        <img src="/images/about/10ac37bd-e678-47b3-a673-daedffd0de5a.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0" style={{ background: "rgba(45,33,27,.8)" }} />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full border opacity-10 hidden md:block" style={{ borderColor: "var(--gold)" }} />

        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-[11px] sm:text-[12px] tracking-[0.32em] uppercase font-ui font-semibold mb-5 sm:mb-6" style={{ color: "#d4a86a" }}>Mulai Perjalananmu</p>
            <h2 className="text-[1.8rem] sm:text-4xl lg:text-5xl xl:text-6xl font-semibold leading-tight mb-5 sm:mb-6" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}>
              Temukan Koleksi Kami
            </h2>
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-8 sm:mb-10 font-ui" style={{ color: "rgba(212,197,181,.8)" }}>
              Biarkan busana yang layak menemani setiap momenmu. Jelajahi koleksi SAMAQU dan temukan yang paling pas untukmu.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <a href="/katalog" className="inline-flex items-center gap-2 rounded-full px-7 sm:px-8 py-3 sm:py-3.5 text-[12px] sm:text-sm tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg w-full sm:w-auto justify-center" style={{ background: "var(--gold)", color: "white", boxShadow: "0 8px 28px -8px rgba(181,140,74,.6)" }}>
                Lihat Katalog
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h10M10 4l5 5-5 5" /></svg>
              </a>
              <a href="https://wa.me/6281234567890?text=Halo%20Admin%20SAMAQU%2C%20saya%20tertarik%20dengan%20koleksi%20Anda%20dan%20ingin%20bertanya%20soal%20pemesanan." className="inline-flex items-center gap-2 rounded-full px-7 sm:px-8 py-3 sm:py-3.5 text-[12px] sm:text-sm tracking-[0.08em] uppercase font-ui font-semibold transition-all duration-300 w-full sm:w-auto justify-center" style={{ border: "1px solid rgba(255,255,255,.25)", color: "var(--cream)" }}>
                Hubungi Admin
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        .qcard { transition: transform .4s ease, box-shadow .4s ease, border-color .4s ease; }
        @media (hover: hover) {
          .qcard:hover { transform: translateY(-6px); box-shadow: 0 24px 48px -28px rgba(45,33,27,.35); border-color: var(--gold); }
          .qcard:hover .qicon { color: #fff; background: var(--gold); border-color: var(--gold); }
        }
        .qicon { transition: all .4s ease; }
        .gallery-overlay { opacity: 0; transition: opacity .4s ease; }
        @media (hover: hover) {
          .gallery-item:hover .gallery-overlay { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
