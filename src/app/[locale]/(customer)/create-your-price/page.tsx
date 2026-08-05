"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function CreateYourPricePage() {
  const [price, setPrice] = useState(300000);
  const minPrice = 300000;
  const maxPrice = 500000;

  const fmt = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
  const pct = ((price - minPrice) / (maxPrice - minPrice)) * 100;

  const priceNote = price === minPrice
    ? "Rp300.000 adalah pilihan yang sah. Tidak perlu merasa sungkan — itulah alasan Harga Minimum kami buat."
    : `Terima kasih. ${fmt(price)} membantu kami menjaga Harga Minimum tetap terjangkau bagi lebih banyak orang. Produk yang kamu terima tetap sama.`;

  return (
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "var(--espresso)" }}>
        <Image
          src="/images/e6311168-b0e0-4586-9209-a2ad19712a37.png"
          alt=""
          fill
          className="object-cover opacity-25"
          priority
        />
        <div className="relative mx-auto max-w-4xl px-5 py-20 sm:py-28 text-center" style={{ color: "var(--cream)" }}>
          <p className="text-[11px] sm:text-xs tracking-[0.35em] uppercase font-ui" style={{ color: "var(--gold)" }}>SAMAQU</p>
          <h1 className="mt-5 text-5xl sm:text-7xl leading-[1.05] font-light" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            Create Your <em className="italic" style={{ color: "var(--gold)" }}>Price</em>
          </h1>
          <p className="mt-6 text-lg sm:text-xl font-ui" style={{ color: "#d4c4b4" }}>Di Samaqu, kamu bisa memilih hargamu sendiri.</p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#simulasi" className="rounded-full px-7 py-3.5 text-sm font-medium font-ui text-white" style={{ background: "var(--gold)" }}>Lihat Cara Kerjanya</a>
            <a href="#cerita" className="rounded-full px-7 py-3.5 text-sm font-medium font-ui border" style={{ borderColor: "rgba(241,233,221,.35)", color: "var(--cream)" }}>Kenapa Kami Membuat Ini</a>
          </div>
        </div>
      </div>

      {/* Cerita */}
      <section id="cerita" className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-3xl sm:text-4xl leading-snug" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            Kami tahu rasanya menyukai produk berkualitas, tapi harus mengurungkan niat.
          </h2>
          <div className="my-8 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(42,33,27,.25),transparent)" }} />
          <div className="space-y-5 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
            <p>Bukan karena tidak ingin membelinya. Tapi karena ada banyak hal lain yang lebih penting untuk diperjuangkan.</p>
            <p>Kami memahami itu, karena Samaqu juga lahir dari orang biasa. Itulah alasan kami membuat <strong style={{ color: "var(--espresso)" }}>Create Your Price</strong>.</p>
          </div>
        </div>
      </section>

      {/* Aksesibilitas */}
      <section className="py-16 sm:py-24" style={{ background: "var(--sand-2)" }}>
        <div className="mx-auto max-w-6xl px-5 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Kualitas yang baik seharusnya bisa dijangkau lebih banyak orang.
            </h2>
            <div className="mt-6 space-y-4 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
              <p>Kami ingin membuat produk dengan kualitas yang benar-benar kami banggakan, tanpa membuat harganya terasa memberatkan.</p>
              <p>Karena kemampuan setiap orang berbeda. Harga yang terasa ringan bagi seseorang, bisa menjadi pengeluaran besar bagi orang lain.</p>
              <p>Kami tidak ingin perbedaan itu menjadi penghalang untuk mendapatkan produk berkualitas.</p>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <Image
              src="/images/141ca791-3f39-4055-9409-d945ad3205a4.png"
              alt="Produk Samaqu"
              width={800}
              height={1000}
              className="w-full h-full object-cover aspect-[4/3] lg:aspect-[4/5]"
            />
          </div>
        </div>
      </section>

      {/* Cara kerja + simulasi */}
      <section id="simulasi" className="py-16 sm:py-24 scroll-mt-24">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center">
            <p className="text-[11px] tracking-[0.3em] uppercase font-ui" style={{ color: "var(--gold)" }}>Cara Kerja</p>
            <h2 className="mt-4 text-3xl sm:text-5xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Bagaimana Create Your Price bekerja?
            </h2>
            <p className="mt-4 text-lg font-ui" style={{ color: "var(--text-secondary)" }}>Sederhana. Hanya tiga langkah.</p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { num: "01", title: "Lihat Harga Minimum", desc: "Setiap produk Samaqu memiliki Harga Minimum yang tertera jelas." },
              { num: "02", title: "Pilih Hargamu", desc: "Kamu bebas menentukan harga yang ingin kamu bayar, selama tidak di bawah Harga Minimum." },
              { num: "03", title: "Produk Tetap Sama", desc: "Berapa pun harga yang kamu pilih, produk dan kualitas yang kamu dapatkan tetap sama." },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl p-6 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ border: "1px solid rgba(42,33,27,.1)" }}>
                <div className="text-3xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>{step.num}</div>
                <h3 className="mt-3 font-semibold text-lg font-ui" style={{ color: "var(--espresso)" }}>{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Slider simulasi */}
          <div className="mt-12 rounded-3xl p-6 sm:p-10" style={{ background: "var(--bg-tertiary, #e5d8cb)", border: "1px solid rgba(42,33,27,.1)" }}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs tracking-[0.2em] uppercase font-ui" style={{ color: "var(--text-muted)" }}>Contoh — Harga Minimum Rp300.000</p>
                <h3 className="text-2xl sm:text-3xl mt-2" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>Coba pilih hargamu</h3>
              </div>
              <div className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none whitespace-nowrap tabular-nums font-ui" style={{ color: "var(--gold)" }}>
                {fmt(price)}
              </div>
            </div>

            <div className="mt-7 px-[14px]">
              <div className="flex justify-between">
                {[0,1,2,3,4].map(i => <span key={i} className="block w-px h-2" style={{ background: "rgba(42,33,27,.2)" }} />)}
              </div>
            </div>

            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              step={10000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-2 w-full"
              style={{
                background: `linear-gradient(90deg, var(--gold) 0%, var(--gold) ${pct}%, rgba(42,33,27,.14) ${pct}%, rgba(42,33,27,.14) 100%)`,
              }}
            />

            <div className="mt-6 sm:mt-7 flex justify-between gap-3 text-[11px] sm:text-xs tabular-nums font-ui" style={{ color: "var(--text-muted)" }}>
              <span>{fmt(minPrice)} (min)</span>
              <span>{fmt(maxPrice)}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {[300000, 320000, 350000].map((p) => (
                <button
                  key={p}
                  onClick={() => setPrice(p)}
                  className="rounded-full px-4 py-2 text-sm font-ui transition-all"
                  style={{
                    background: price === p ? "var(--gold)" : "white",
                    color: price === p ? "white" : "var(--espresso)",
                    border: `1px solid ${price === p ? "var(--gold)" : "rgba(42,33,27,.15)"}`,
                  }}
                >
                  {fmt(p)}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
              {priceNote}
            </p>
          </div>
        </div>
      </section>

      {/* Boleh pilih minimum */}
      <section className="py-16 sm:py-24" style={{ background: "var(--sand-2)" }}>
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl sm:text-5xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
            Boleleh pilih Harga Minimum?
          </h2>
          <p className="italic text-2xl sm:text-3xl mt-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--gold)" }}>
            Tentu boleh.
          </p>
          <div className="mt-6 space-y-4 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
            <p>Kalau saat ini Rp300.000 adalah harga yang paling sesuai dengan kemampuanmu, pilihlah Rp300.000. Tidak perlu merasa sungkan.</p>
            <p>Itulah alasan Harga Minimum tersebut kami buat. Dan berapa pun harga yang kamu pilih, produk dan kualitas yang kamu dapatkan tetap sama.</p>
          </div>
        </div>
      </section>

      {/* Bukan diskon */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1 rounded-2xl overflow-hidden">
            <Image
              src="/images/5d744c19-2ea0-411e-b002-bfc4b6cb3d08.png"
              alt="Produk Samaqu"
              width={800}
              height={800}
              className="w-full object-cover aspect-[4/3] lg:aspect-square"
            />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>
              Bukan diskon. Bukan promo.
            </h2>
            <div className="mt-6 space-y-4 text-base sm:text-lg leading-relaxed font-ui" style={{ color: "var(--text-secondary)" }}>
              <p>Create Your Price bukan program sementara. Ini adalah cara Samaqu berusaha membuat kualitas yang baik lebih mudah dijangkau oleh orang-orang biasa seperti kami.</p>
              <p>Kami ingin bertumbuh tanpa meninggalkan mereka yang sejak awal ingin kami layani.</p>
              <p>Bahkan ketika Samaqu semakin besar, harapan kami bukan membuat produk semakin sulit dijangkau. Justru membuat Harga Minimum semakin mudah dijangkau oleh lebih banyak orang.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="py-20 sm:py-28" style={{ background: "var(--espresso)", color: "var(--cream)" }}>
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="text-3xl sm:text-5xl leading-snug font-light" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            Karena kemampuan kita mungkin berbeda. Tapi kualitas yang baik seharusnya bisa dirasakan <em className="italic" style={{ color: "var(--gold)" }}>lebih banyak orang</em>.
          </p>
          <p className="mt-8 text-sm tracking-[0.25em] uppercase font-ui" style={{ color: "var(--gold)" }}>Create Your Price — Pilih Harga Terbaikmu</p>
          <Link href="/katalog" className="mt-9 inline-block rounded-full px-8 py-4 text-sm font-medium font-ui text-white" style={{ background: "var(--gold)" }}>
            Mulai Pilih Hargamu
          </Link>
        </div>
      </section>
    </section>
  );
}
