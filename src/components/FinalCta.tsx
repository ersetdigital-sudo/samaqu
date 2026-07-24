"use client";

import { motion, Variants } from "framer-motion";

const waHref =
  "https://wa.me/6281234567890?text=" +
  encodeURIComponent(
    "Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan."
  );

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1], delay },
  }),
};

export default function FinalCta() {
  return (
    <section className="cta-section relative overflow-hidden">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-6 py-24 sm:py-32 md:py-44">
        <motion.div
          className="cta-glass mx-auto max-w-4xl px-6 py-14 sm:px-14 sm:py-20 md:px-20 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              variants={revealVariants}
              custom={0}
              className="flex items-center gap-3 sm:gap-4"
            >
              <span className="cta-hairline" />
              <p
                className="font-ui text-[0.72rem] sm:text-[0.74rem] font-semibold uppercase tracking-[0.32em] sm:tracking-[0.38em]"
                style={{ color: "var(--gold-light)" }}
              >
                Siap Tampil Berkelas?
              </p>
              <span className="cta-hairline" />
            </motion.div>

            <motion.h2
              variants={revealVariants}
              custom={0.12}
              className="mt-6 sm:mt-7 text-[2.4rem] sm:text-5xl md:text-6xl lg:text-[5rem] font-medium leading-[1.04] tracking-[-0.01em]"
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                color: "var(--ivory)",
              }}
            >
              Mulai Perjalanan Gaya
              <br className="hidden sm:block" />
              Muslimmu Bersama{" "}
              <span
                className="italic"
                style={{
                  background:
                    "linear-gradient(120deg, var(--gold-light), var(--ivory))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SAMAQU.
              </span>
            </motion.h2>

            <motion.p
              variants={revealVariants}
              custom={0.24}
              className="mt-5 sm:mt-6 max-w-sm sm:max-w-md text-[0.95rem] sm:text-[1.05rem] leading-[1.75] font-ui"
              style={{ color: "rgba(248,246,242,.78)" }}
            >
              Pilih koleksi favoritmu dan biarkan admin kami membantu, dari
              pemilihan hingga pesanan sampai di tangan.
            </motion.p>

            <div className="mt-10 sm:mt-11 flex w-full flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4">
              <motion.a
                variants={revealVariants}
                custom={0.36}
                href={waHref}
                target="_blank"
                rel="noopener"
                className="cta-btn cta-btn-primary w-full sm:w-auto"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Pesan via WhatsApp</span>
              </motion.a>

              <motion.a
                variants={revealVariants}
                custom={0.48}
                href="#produk"
                className="cta-btn cta-btn-outline w-full sm:w-auto"
              >
                <span>Lihat Katalog</span>
                <svg
                  className="cta-arrow"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
