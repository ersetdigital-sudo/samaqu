import { getWhatsAppLink } from "@/lib/store-settings";

export default function CreateYourPrice() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--espresso)" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="fade-up">
          <p className="text-[12px] tracking-[0.32em] uppercase mb-5" style={{ color: "var(--gold)" }}>
            Create Your Price
          </p>
          <h2
            className="text-4xl sm:text-5xl font-medium mb-6"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--cream)" }}
          >
            Sesuaikan dengan Kebutuhanmu.
          </h2>
          <p className="leading-[1.75] mb-8 max-w-md" style={{ color: "var(--sand)" }}>
            Setiap kebutuhan berbeda — jumlah, bahan, hingga custom untuk seragam komunitas atau acara. Ceritakan kebutuhanmu, dan tim kami bantu susun paket dengan harga yang paling pas.
          </p>
          <ul className="space-y-3 mb-9 text-sm" style={{ color: "var(--sand)" }}>
            <li className="flex items-center gap-3">
              <span style={{ color: "var(--gold)" }}>&#10022;</span> Harga menyesuaikan jumlah &amp; jenis produk
            </li>
            <li className="flex items-center gap-3">
              <span style={{ color: "var(--gold)" }}>&#10022;</span> Cocok untuk pribadi, keluarga, hingga komunitas
            </li>
            <li className="flex items-center gap-3">
              <span style={{ color: "var(--gold)" }}>&#10022;</span> Penawaran khusus untuk pemesanan grosir
            </li>
          </ul>
          <a
            href={getWhatsAppLink("Halo Admin SAMAQU, saya tertarik dengan koleksi Anda dan ingin bertanya soal pemesanan.")}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[12px] tracking-[0.18em] uppercase transition hover:opacity-90"
            style={{ background: "var(--gold)", color: "var(--espresso)" }}
          >
            Buat Penawaran via WhatsApp
          </a>
        </div>

        <div
          className="fade-up rounded-[3px] p-8 sm:p-10"
          style={{
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.1)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="text-[11px] tracking-[0.18em] uppercase mb-6" style={{ color: "var(--gold)" }}>
            Estimasi Kebutuhanmu
          </p>
          <div className="space-y-5">
            <div>
              <label className="text-[11px] tracking-[0.18em] uppercase block mb-2" style={{ color: "var(--sand)" }}>
                Kategori Produk
              </label>
              <div className="flex flex-wrap gap-2">
                {["Thobe", "Koko", "Vest", "Lainnya"].map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1.5 text-[12px] rounded-full"
                    style={{ border: "1px solid rgba(255,255,255,.15)", color: "var(--sand)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] tracking-[0.18em] uppercase block mb-2" style={{ color: "var(--sand)" }}>
                Perkiraan Jumlah
              </label>
              <div className="flex flex-wrap gap-2">
                {["1–5 pcs", "6–20 pcs", "20+ pcs"].map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1.5 text-[12px] rounded-full"
                    style={{ border: "1px solid rgba(255,255,255,.15)", color: "var(--sand)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs leading-[1.75] pt-2" style={{ color: "var(--stone)" }}>
              *Pilih gambaran kebutuhanmu, lalu kirim ke admin untuk mendapatkan penawaran resmi.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
