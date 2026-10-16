/**
 * Beranda panel admin — markup & ukuran disalin dari mockup HTML
 * (samaqu-admin-dashboard-2/pages/index.html). Data belum tersambung: angka 0 + empty state.
 */
import styles from "./panel.module.css";

const HERO_ART =
  "https://res.cloudinary.com/j4ka1ty6/image/upload/w_440,h_200,c_fill,f_auto,q_auto/v1792159516/1640fd4d-496e-470d-b933-af298a247885.png";

function Heart() {
  return (
    <svg className={styles.heart} viewBox="0 0 24 24">
      <path d="M12 21s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z" />
    </svg>
  );
}

function Hand() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M7 11V6a1.5 1.5 0 013 0v4M10 10V4.5a1.5 1.5 0 013 0V10M13 10V5.5a1.5 1.5 0 013 0V11M16 11V8a1.5 1.5 0 013 0v6a7 7 0 01-7 7h-1a6 6 0 01-5-3l-2.5-4a1.5 1.5 0 012.5-1.6L7 14" />
      <path d="M3 4l1.5 1.5M2 8h2" stroke="#f3a7c0" />
    </svg>
  );
}

type StatIconName = "bag" | "basket" | "truck" | "box";

function StatIcon({ name }: { name: StatIconName }) {
  switch (name) {
    case "bag":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 016 0v2" />
        </svg>
      );
    case "basket":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 9h18l-2 11H5zM8 9l4-6 4 6" />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M2 7h12v10H2zM14 10h4l3 3v4h-7" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
        </svg>
      );
  }
}

type Metric = {
  label: string;
  value: string;
  caption: string;
  delta?: string;
  glyph?: string;
  glyphColor?: string;
  icon: StatIconName;
  icBg: string;
  icColor: string;
  wave: string;
};

const METRICS: Metric[] = [
  { label: "Omset hari ini", value: "Rp 0", caption: "Dari kemarin", delta: "0%", icon: "bag", icBg: "#fde4ec", icColor: "#d6336c", wave: "#fde4ec" },
  { label: "Pesanan masuk", value: "0", caption: "Hari ini", delta: "0%", icon: "basket", icBg: "#e3f7ea", icColor: "#2f9e5b", wave: "#e3f7ea" },
  { label: "Perlu dikirim", value: "0", caption: "Menunggu resi", glyph: "◷", glyphColor: "#e8890c", icon: "truck", icBg: "#fff1db", icColor: "#e8890c", wave: "#fff1db" },
  { label: "Stok menipis", value: "0", caption: "Ambang ≤ 5 unit", glyph: "⊡", glyphColor: "#e8365d", icon: "box", icBg: "#efe6fd", icColor: "#7c4ddb", wave: "#efe6fd" },
];

function EmptyOrdersArt() {
  return (
    <svg viewBox="0 0 120 90">
      <ellipse cx="60" cy="82" rx="42" ry="6" fill="#fbe3ec" />
      <path d="M22 44l14-24h48l14 24v30a4 4 0 01-4 4H26a4 4 0 01-4-4z" fill="#f9c9d9" />
      <path d="M22 44h26l4 8h16l4-8h26v30a4 4 0 01-4 4H26a4 4 0 01-4-4z" fill="#f4a3be" />
      <rect x="40" y="26" width="40" height="22" rx="3" fill="#fff" />
      <path d="M46 33h28M46 39h18" stroke="#f4a3be" strokeWidth="3" strokeLinecap="round" />
      <path d="M92 12l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f3a7c0" />
      <circle cx="24" cy="22" r="3" fill="#fbd3e1" />
    </svg>
  );
}

function EmptyStockArt() {
  return (
    <svg viewBox="0 0 120 90">
      <ellipse cx="60" cy="82" rx="42" ry="6" fill="#fbe3ec" />
      <path d="M60 20l32 14v34L60 82 28 68V34z" fill="#f4a3be" />
      <path d="M60 20l32 14-32 14-32-14z" fill="#fbd3e1" />
      <path d="M60 48v34L28 68V34z" fill="#f9c9d9" />
      <path d="M44 27l32 14v10" stroke="#fff" strokeWidth="4" fill="none" />
      <circle cx="92" cy="62" r="13" fill="#2f9e5b" />
      <path d="M86 62l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PanelAdminHome() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h2 className={styles.heroTitle}>
            Selamat bekerja, Lea <Hand />
          </h2>
          <p className={styles.heroSub}>
            Terima kasih sudah menjadi bagian dari SAMAQU.
            <br />
            Semoga hari ini semua proses berjalan lancar! <Heart />
          </p>
        </div>
        <img className={styles.heroArt} src={HERO_ART} alt="" />
        <div className={styles.quote}>
          Kerja hari ini,
          <br />
          untuk cerita yang lebih baik esok hari. <Heart />
        </div>
      </section>

      <section className={styles.stats}>
        {METRICS.map((m) => (
          <div key={m.label} className={styles.card}>
            <div className={styles.stHead}>
              <div className={styles.ic} style={{ background: m.icBg, color: m.icColor }}>
                <StatIcon name={m.icon} />
              </div>
              <span className={styles.stLabel}>{m.label}</span>
              <div className={styles.arr} style={{ background: m.icBg, color: m.icColor }}>
                <svg viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </div>
            </div>
            <div className={styles.stValue}>{m.value}</div>
            <div className={styles.stFoot}>
              {m.delta ? (
                <span className={styles.pill} style={{ background: "#e3f7ea", color: "#2f9e5b" }}>
                  ↗ {m.delta}
                </span>
              ) : (
                <span style={{ color: m.glyphColor }}>{m.glyph}</span>
              )}
              {m.caption}
            </div>
            <svg className={styles.wave} viewBox="0 0 150 60">
              <path d="M0 50 C40 50 50 25 80 30 S120 5 150 10 V60 H0Z" fill={m.wave} />
            </svg>
          </div>
        ))}
      </section>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.ph}>
            <div className={styles.ic} style={{ background: "#fde4ec", color: "#d6336c" }}>
              <StatIcon name="bag" />
            </div>
            <div>
              <b>Pesanan terbaru</b>
              <small>Pesanan terakhir dari semua sumber.</small>
            </div>
            <span className={styles.all}>Lihat semua ›</span>
          </div>
          <div className={styles.empty}>
            <div className={styles.emptyBox}>
              <EmptyOrdersArt />
            </div>
            <b>Belum ada pesanan</b>
            <p>Pesanan akan muncul di sini begitu data tersambung.</p>
            <button className={styles.btn}>+&nbsp;&nbsp;Buat Pesanan Baru</button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.ph}>
            <div className={styles.ic} style={{ background: "#fff1db", color: "#e8890c" }}>
              <StatIcon name="box" />
            </div>
            <div>
              <b>Stok menipis</b>
              <small>Varian dengan sisa stok ≤ 5 unit.</small>
            </div>
            <span className={styles.all}>Lihat semua ›</span>
          </div>
          <div className={styles.empty}>
            <div className={styles.emptyBox}>
              <EmptyStockArt />
            </div>
            <b>Semua stok aman</b>
            <p>Tidak ada varian yang perlu segera diisi ulang.</p>
          </div>
        </div>
      </section>
    </>
  );
}
