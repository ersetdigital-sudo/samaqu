/**
 * Beranda panel admin — tema "Rose Luxury Admin".
 *
 * Data belum dipasang (angka 0 / empty state); tata letaknya dulu yang dirapikan.
 */
import { TrendingUp, ShoppingBag, Truck, Package, Plus, ChevronRight, ArrowUpRight, Quote } from "lucide-react";
import styles from "./panel.module.css";

const HERO_ART =
  "https://res.cloudinary.com/j4ka1ty6/image/upload/w_360,f_auto,q_auto/v1792159516/1640fd4d-496e-470d-b933-af298a247885.png";

type Metric = {
  label: string;
  value: string;
  caption: string;
  delta?: string;
  tone: string;
  color: string;
  icon: typeof TrendingUp;
};

const METRICS: Metric[] = [
  { label: "Omset hari ini", value: "Rp 0", caption: "Dari kemarin", delta: "0%", tone: "tonePink", color: "#be185d", icon: TrendingUp },
  { label: "Pesanan masuk", value: "0", caption: "Hari ini", delta: "0%", tone: "toneGreen", color: "#15803d", icon: ShoppingBag },
  { label: "Perlu dikirim", value: "0", caption: "Menunggu resi", tone: "toneOrange", color: "#b45309", icon: Truck },
  { label: "Stok menipis", value: "0", caption: "Ambang ≤ 5 unit", tone: "tonePurple", color: "#7c3aed", icon: Package },
];

function Wave({ color }: { color: string }) {
  const d = "M0 34 C 16 12, 30 38, 46 26 S 78 8, 94 22 S 118 34, 132 16";
  return (
    <svg className={styles.statWave} viewBox="0 0 132 46" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L132 46 L0 46 Z`} fill={color} opacity={0.16} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}

export default function PanelAdminHome() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h2 className={styles.heroTitle}>Selamat bekerja, Lea</h2>
          <p className={styles.heroSub}>
            Terima kasih sudah menjadi bagian dari SAMAQU. Semoga hari ini semua proses berjalan lancar.
          </p>
        </div>
        <img className={styles.heroArt} src={HERO_ART} alt="" aria-hidden="true" />
        <div className={styles.heroQuote}>
          <Quote size={22} />
          <p>Kerja hari ini, untuk cerita yang lebih baik esok hari.</p>
        </div>
      </section>

      <div className={styles.stats}>
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`${styles.statCard} ${styles[m.tone]}`}>
              <div className={styles.statTop}>
                <span className={styles.statIconBox} style={{ color: m.color }}>
                  <Icon size={18} />
                </span>
                <ChevronRight size={16} className={styles.statChev} />
              </div>
              <div className={styles.statLabel}>{m.label}</div>
              <div className={`${styles.statValue} ${styles.num}`}>{m.value}</div>
              <div className={styles.statFoot}>
                {m.delta ? (
                  <span className={styles.statDelta}>
                    <ArrowUpRight size={12} />
                    {m.delta}
                  </span>
                ) : null}
                <span className={styles.statCaption}>{m.caption}</span>
              </div>
              <Wave color={m.color} />
            </div>
          );
        })}
      </div>

      <div className={`${styles.grid} ${styles.g2}`} style={{ alignItems: "start" }}>
        <div className={styles.card}>
          <div className={styles.cardH}>
            <span className={styles.cardIconBox}>
              <ShoppingBag size={17} />
            </span>
            <div>
              <h3>Pesanan terbaru</h3>
              <p>Pesanan terakhir dari semua sumber.</p>
            </div>
            <div className={styles.sp} />
            <button className={styles.pillBtn}>
              Lihat semua
              <ChevronRight size={14} />
            </button>
          </div>
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <ShoppingBag size={26} />
            </span>
            <b>Belum ada pesanan</b>
            <span>Pesanan akan muncul di sini begitu data tersambung.</span>
            <button className={`${styles.btnPri} ${styles.emptyCta}`}>
              <Plus size={16} />
              Buat Pesanan Baru
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardH}>
            <span className={styles.cardIconBox}>
              <Package size={17} />
            </span>
            <div>
              <h3>Stok menipis</h3>
              <p>Varian dengan sisa stok ≤ 5 unit.</p>
            </div>
            <div className={styles.sp} />
            <button className={styles.pillBtn}>
              Lihat semua
              <ChevronRight size={14} />
            </button>
          </div>
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Package size={26} />
            </span>
            <b>Semua stok aman</b>
            <span>Tidak ada varian yang perlu segera diisi ulang.</span>
          </div>
        </div>
      </div>
    </>
  );
}
