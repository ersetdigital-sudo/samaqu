"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Move,
  Shirt,
  Wind,
  Ruler,
  Scissors,
  type LucideIcon,
} from "lucide-react";

/* ── Types ── */
interface KainSeriesPoint {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface KainSeriesItem {
  code: string;
  tag: string;
  gradient: string;
  points: KainSeriesPoint[];
  fit: string;
}

const ACCENT_ON_DARK = "#e0be8a";

/* ── Content: Perbedaan Jenis Kain Thobe ── */
const KAIN: KainSeriesItem[] = [
  {
    code: "B.01",
    tag: "Ketebalan: Tinggi",
    gradient: "linear-gradient(160deg, #2b2b2b 0%, #141414 100%)",
    points: [
      { icon: Layers, title: "Lebih tebal & kokoh", desc: "Memberikan struktur yang kuat dan tidak mudah menerawang." },
      { icon: Move, title: "Stretch", desc: "Nyaman bergerak, tidak terasa kaku." },
      { icon: Shirt, title: "Jatuh lebih rapi", desc: "Memberikan tampilan yang elegan dan berkelas." },
      { icon: Wind, title: "Adem & nyaman", desc: "Sirkulasi udara baik, nyaman dipakai seharian." },
    ],
    fit: "Aktivitas formal, acara penting, dan tampilan premium sehari-hari.",
  },
  {
    code: "B.02",
    tag: "Ketebalan: Sedang-Tinggi",
    gradient: "linear-gradient(160deg, #2a3350 0%, #1e2436 100%)",
    points: [
      { icon: Layers, title: "Tebal seimbang", desc: "Kokoh namun tetap ringan saat dipakai." },
      { icon: Move, title: "Serat halus", desc: "Permukaan lembut dengan kilau tipis." },
      { icon: Shirt, title: "Siluet bersih", desc: "Jatuh lurus, minim kerutan." },
      { icon: Wind, title: "Breathable", desc: "Cocok untuk cuaca panas maupun ruang ber-AC." },
    ],
    fit: "Kerja, kajian, dan pemakaian harian yang tetap rapi.",
  },
  {
    code: "A.02",
    tag: "Ketebalan: Sedang",
    gradient: "linear-gradient(160deg, #c9baa9 0%, #b4a79b 100%)",
    points: [
      { icon: Layers, title: "Ringan", desc: "Terasa enteng, nyaman untuk mobilitas tinggi." },
      { icon: Move, title: "Lentur", desc: "Mengikuti gerak tubuh dengan baik." },
      { icon: Shirt, title: "Flowy", desc: "Jatuh mengalir, kesan santai namun sopan." },
      { icon: Wind, title: "Sangat adem", desc: "Pilihan terbaik untuk suhu panas." },
    ],
    fit: "Perjalanan, aktivitas outdoor, dan pemakaian santai.",
  },
  {
    code: "C.01",
    tag: "Ketebalan: Sedang",
    gradient: "linear-gradient(160deg, #e4d9c8 0%, #cdbfb0 100%)",
    points: [
      { icon: Layers, title: "Klasik", desc: "Tekstur katun premium dengan nuansa lembut." },
      { icon: Move, title: "Nyaman di kulit", desc: "Halus, tidak panas, tidak gatal." },
      { icon: Shirt, title: "Rapi natural", desc: "Tampilan bersih tanpa terlihat kaku." },
      { icon: Wind, title: "Mudah dirawat", desc: "Cepat kering dan tidak rewel saat disetrika." },
    ],
    fit: "Pemakaian harian, ibadah, dan acara keluarga.",
  },
];

/* ── Content: Perbedaan Series Thobe ── */
const SERIES: KainSeriesItem[] = [
  {
    code: "Regular",
    tag: "Potongan: Longgar",
    gradient: "linear-gradient(160deg, #e4d9c8 0%, #cdbfb0 100%)",
    points: [
      { icon: Ruler, title: "Lebar dada relaks", desc: "Ruang gerak maksimal, nyaman untuk semua bentuk tubuh." },
      { icon: Scissors, title: "Lengan lurus", desc: "Model klasik dengan manset standar." },
      { icon: Shirt, title: "Jatuh lurus", desc: "Siluet tradisional yang sopan." },
    ],
    fit: "Yang suka pakaian longgar dan santai.",
  },
  {
    code: "Slim",
    tag: "Potongan: Ramping",
    gradient: "linear-gradient(160deg, #c9baa9 0%, #b4a79b 100%)",
    points: [
      { icon: Ruler, title: "Badan lebih ramping", desc: "Mengikuti bentuk tubuh tanpa terasa sempit." },
      { icon: Scissors, title: "Lengan lebih kecil", desc: "Tampilan modern dan bersih." },
      { icon: Shirt, title: "Siluet tegas", desc: "Terlihat lebih tinggi dan proporsional." },
    ],
    fit: "Tampilan modern, acara formal, dan foto.",
  },
  {
    code: "Pro",
    tag: "Potongan: Terstruktur",
    gradient: "linear-gradient(160deg, #2b2b2b 0%, #141414 100%)",
    points: [
      { icon: Ruler, title: "Pola presisi", desc: "Dikembangkan dari data ukuran pelanggan." },
      { icon: Scissors, title: "Detail jahitan rapat", desc: "Finishing kuat dan tahan lama." },
      { icon: Shirt, title: "Struktur premium", desc: "Bahu dan kerah lebih terbentuk." },
    ],
    fit: "Pemakaian intens dan tampilan paling premium.",
  },
];

/* ── Single slide ── */
function Slide({ item }: { item: KainSeriesItem }) {
  return (
    <div className="snap-center shrink-0 w-full h-full relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: item.gradient }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,.86) 0%, rgba(12,12,12,.6) 32%, rgba(10,10,10,.8) 100%)",
        }}
      />
      <div className="relative h-full overflow-y-auto scrollbar-hide px-6 sm:px-8 pt-[140px] pb-[132px] sm:pt-5 sm:pb-5 flex flex-col justify-center md:grid md:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)] md:gap-x-8 md:items-center">
        <div className="md:self-center">
          <p
            className="text-[34px] sm:text-[40px] lg:text-[46px] leading-none"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "white" }}
          >
            {item.code}
          </p>
          <span
            className="inline-block mt-2.5 rounded-full px-3 py-1 text-[11px] font-ui"
            style={{ background: "rgba(181,140,74,.18)", color: ACCENT_ON_DARK }}
          >
            {item.tag}
          </span>
          <div className="mt-3.5 h-px w-12" style={{ background: "var(--gold)" }} />
          <div
            className="hidden md:flex mt-5 rounded-2xl p-3.5 gap-3"
            style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}
          >
            <span style={{ color: ACCENT_ON_DARK }}>✦</span>
            <div>
              <p className="text-[12px] font-ui" style={{ color: ACCENT_ON_DARK }}>Cocok untuk</p>
              <p className="text-[12px] leading-snug font-ui" style={{ color: "rgba(255,255,255,.7)" }}>{item.fit}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-0 space-y-3 sm:space-y-3.5">
          {item.points.map((p, i) => (
            <div key={i} className="flex gap-3.5">
              <span
                className="mt-0.5 w-9 h-9 shrink-0 rounded-xl grid place-items-center"
                style={{ background: "rgba(255,255,255,.1)", color: ACCENT_ON_DARK }}
              >
                <p.icon size={16} strokeWidth={1.6} />
              </span>
              <div>
                <p className="text-[13.5px] font-medium leading-snug font-ui" style={{ color: "white" }}>{p.title}</p>
                <p className="mt-0.5 text-[12px] leading-snug font-ui" style={{ color: "rgba(255,255,255,.6)" }}>{p.desc}</p>
              </div>
            </div>
          ))}
          <div
            className="md:hidden rounded-2xl p-3.5 flex gap-3"
            style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}
          >
            <span style={{ color: ACCENT_ON_DARK }}>✦</span>
            <div>
              <p className="text-[12px] font-ui" style={{ color: ACCENT_ON_DARK }}>Cocok untuk</p>
              <p className="text-[12px] leading-snug font-ui" style={{ color: "rgba(255,255,255,.7)" }}>{item.fit}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main modal ── */
interface KainSeriesModalProps {
  type: "kain" | "series" | null;
  onClose: () => void;
}

export default function KainSeriesModal({ type, onClose }: KainSeriesModalProps) {
  const items = type === "kain" ? KAIN : type === "series" ? SERIES : [];
  const title = type === "kain" ? "Perbedaan Jenis Kain Thobe" : "Perbedaan Series Thobe";
  const subtitle =
    type === "kain"
      ? "Setiap kain punya karakter terbaiknya. Pilih yang paling sesuai untukmu."
      : "Series menentukan potongan dan siluet. Pilih yang paling pas dengan gayamu.";
  const swipeWord = type === "kain" ? "jenis kain" : "series";

  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!type) return;
    setIndex(0);
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      trackRef.current?.scrollTo({ left: 0 });
    });
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
    };
  }, [type]);

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    const track = trackRef.current;
    if (track) track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!type) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, index, items.length]);

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  return (
    <AnimatePresence>
      {type && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9994]"
            style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 sm:inset-4 md:inset-6 sm:m-auto z-[9995] sm:max-w-[920px] sm:max-h-[600px] sm:rounded-3xl overflow-hidden flex flex-col"
            style={{ background: "#0e0d0c", color: "white" }}
          >
            {/* Header (desktop, in flow) */}
            <div className="hidden sm:block shrink-0 px-8 pt-5 pb-3 text-center">
              <p className="text-[10px] tracking-[0.34em] font-ui" style={{ color: "var(--gold)" }}>SAMAQU</p>
              <h2 className="mt-1.5 text-[20px] lg:text-[24px] font-semibold leading-tight uppercase tracking-[0.04em] font-ui">
                {title}
              </h2>
              <p className="mt-1.5 text-[12px] max-w-[54ch] mx-auto font-ui" style={{ color: "rgba(255,255,255,.6)" }}>
                {subtitle}
              </p>
            </div>

            {/* Slides */}
            <div
              ref={trackRef}
              onScroll={handleScroll}
              className="relative flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
            >
              {items.map((item) => (
                <Slide key={item.code} item={item} />
              ))}
            </div>

            {/* Header overlay (mobile) */}
            <div className="sm:hidden absolute inset-x-0 top-0 z-20 px-6 pt-6 pb-4 text-center pointer-events-none">
              <p className="text-[10px] tracking-[0.34em] font-ui" style={{ color: "var(--gold)" }}>SAMAQU</p>
              <h2 className="mt-2 text-[21px] font-semibold leading-[1.15] uppercase tracking-[0.04em] max-w-[16ch] mx-auto font-ui">
                {title}
              </h2>
              <p className="mt-2.5 text-[12px] leading-relaxed max-w-[30ch] mx-auto font-ui" style={{ color: "rgba(255,255,255,.6)" }}>
                {subtitle}
              </p>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-4 top-4 z-30 w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-white/25"
              style={{ background: "rgba(255,255,255,.12)" }}
            >
              <X size={16} />
            </button>

            {/* Prev / Next */}
            {items.length > 1 && (
              <>
                <button
                  onClick={() => goTo(index - 1)}
                  aria-label="Sebelumnya"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-white/25"
                  style={{ background: "rgba(255,255,255,.12)" }}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  onClick={() => goTo(index + 1)}
                  aria-label="Berikutnya"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-white/25"
                  style={{ background: "rgba(255,255,255,.12)" }}
                >
                  <ChevronRight size={17} />
                </button>
              </>
            )}

            {/* Dots */}
            <div className="absolute inset-x-0 bottom-[104px] sm:static sm:shrink-0 sm:py-3 z-20 flex justify-center gap-2.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Ke slide ${i + 1}`}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: i === index ? 18 : 8,
                    background: i === index ? "var(--gold)" : "rgba(255,255,255,.28)",
                  }}
                />
              ))}
            </div>

            {/* Footer chip */}
            <div
              className="absolute inset-x-0 bottom-0 sm:static sm:shrink-0 z-20 rounded-t-3xl sm:rounded-none px-6 pt-4 pb-5 sm:py-3.5 text-center shadow-[0_-10px_30px_rgba(0,0,0,.35)] sm:shadow-none"
              style={{ background: "var(--cream)", color: "var(--espresso)" }}
            >
              <p className="text-[12.5px] font-medium font-ui">Swipe untuk melihat {swipeWord} lainnya</p>
              <p className="mt-1 text-[12px] font-ui" style={{ color: "var(--stone)" }}>
                {items.map((d) => d.code).join("  ·  ")}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
