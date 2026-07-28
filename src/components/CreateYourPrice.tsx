"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateYourPrice() {
  const [price, setPrice] = useState(249000);
  const minPrice = 249000;
  const maxPrice = 599000;

  const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <section className="relative isolate overflow-hidden" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
      {/* Grain overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(60% 55% at 18% 20%, rgba(201,168,122,.18), transparent 70%), radial-gradient(45% 45% at 88% 85%, rgba(162,133,95,.20), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10 lg:px-14 py-20 sm:py-28 lg:py-36">
        <div className="grid items-center gap-14 lg:gap-20 lg:grid-cols-[1.05fr_.95fr]">

          {/* Left: Copy */}
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="h-px w-10" style={{ background: "var(--gold)" }} />
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.32em] font-ui" style={{ color: "var(--gold)" }}>
                Create Your Price
              </p>
            </div>

            <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] leading-[1.08] font-medium" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
              Di Samaqu, Kamu Bisa Memilih<br className="hidden sm:block" />
              <em className="italic" style={{ color: "var(--gold)" }}>Hargamu Sendiri.</em>
            </h1>

            <p className="mt-8 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "#d4c4b4" }}>
              Kami tahu kemampuan setiap orang berbeda. Karena itu setiap produk memiliki
              <span className="font-medium" style={{ color: "var(--cream)" }}> Harga Minimum</span>, dan kamu bebas menentukan harga terbaikmu
              selama tidak berada di bawah harga tersebut. Bukan karena produk kami tidak bernilai — kami hanya ingin
              kualitas yang baik bisa dijangkau oleh lebih banyak orang.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                href="/create-your-price"
                className="group inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] font-ui text-white transition-transform duration-300 hover:-translate-y-0.5"
                style={{ background: "var(--gold)" }}
              >
                Pelajari Create Your Price
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <div className="mt-12 h-px" style={{ background: "linear-gradient(90deg, rgba(241,233,221,.35), rgba(241,233,221,0))" }} />

            <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
              {[
                { num: "1", desc: "Pilih produk yang kamu suka" },
                { num: "2", desc: "Tentukan harga di atas Harga Minimum" },
                { num: "3", desc: "Selesaikan pemesanan, kami kirim" },
              ].map((step) => (
                <div key={step.num}>
                  <dt className="text-3xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>{step.num}</dt>
                  <dd className="mt-2 text-sm leading-relaxed font-ui" style={{ color: "#a89a90" }}>{step.desc}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right: Interactive card */}
          <div className="relative">
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-4 rounded-[2.25rem] opacity-60 blur-2xl"
                style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(201,168,122,.22), transparent 70%)" }}
              />

              <div className="relative rounded-[1.75rem] p-7 sm:p-9 backdrop-blur"
                style={{
                  background: "linear-gradient(160deg, rgba(80,66,56,.65), rgba(42,33,27,.9))",
                  border: "1px solid rgba(241,233,221,.16)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] font-ui" style={{ color: "var(--gold)" }}>Pilih Hargamu</p>
                  <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] font-ui"
                    style={{ background: "rgba(162,133,95,.18)", color: "var(--gold)" }}>
                    Koko Basic
                  </span>
                </div>

                <p className="mt-7 text-5xl sm:text-6xl leading-none font-ui font-semibold" style={{ color: "var(--cream)" }}>
                  {fmt(price)}
                </p>
                <p className="mt-3 text-sm font-ui" style={{ color: "#a89a90" }}>
                  Harga Minimum <span style={{ color: "var(--cream)" }}>{fmt(minPrice)}</span> — bebas naik sesuai kemampuanmu.
                </p>

                <input
                  type="range"
                  min={minPrice}
                  max={maxPrice}
                  step={5000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="mt-8 w-full"
                  style={{
                    background: "transparent",
                    cursor: "pointer",
                  }}
                />
                <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.18em] font-ui" style={{ color: "#8a7a70" }}>
                  <span>Minimum</span>
                  <span>{fmt(maxPrice)}</span>
                </div>

                <div className="my-8 h-px" style={{ background: "linear-gradient(90deg, rgba(241,233,221,.35), rgba(241,233,221,0))" }} />

                <ul className="space-y-4 text-sm font-ui" style={{ color: "#d4c4b4" }}>
                  {[
                    "Kualitas & bahan tetap sama, apa pun harga yang kamu pilih",
                    "Tanpa pertanyaan, tanpa penilaian",
                    "Selisihnya membantu menjangkau lebih banyak orang",
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-3">
                      <span style={{ color: "var(--gold)" }}>✓</span> {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
