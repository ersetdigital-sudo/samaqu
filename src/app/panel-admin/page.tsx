/**
 * Beranda panel admin — tema "Rose Luxury Admin".
 *
 * Data belum dipasang (angka 0 / empty state); tata letaknya dulu yang dirapikan.
 */
import { TrendingUp, ShoppingBag, Truck, Package } from "lucide-react";
import styles from "./panel.module.css";

const METRICS = [
  { label: "Omset hari ini", value: "Rp 0", note: "Diproses + selesai", dot: "#be185d", icon: TrendingUp },
  { label: "Pesanan masuk", value: "0", note: "Hari ini", dot: "#15803d", icon: ShoppingBag },
  { label: "Perlu dikirim", value: "0", note: "Menunggu resi", dot: "#b45309", icon: Truck },
  { label: "Stok menipis", value: "0", note: "Ambang ≤ 5 unit", dot: "#b91c1c", icon: Package },
];

const TANGGAL = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
}).format(new Date());

export default function PanelAdminHome() {
  return (
    <>
      <div className={styles.row} style={{ marginBottom: 20 }}>
        <div>
          <div className={styles.pageTitle}>Selamat bekerja, Lea</div>
          <div className={styles.hint}>{TANGGAL} · Ringkasan operasional hari ini.</div>
        </div>
        <div className={styles.sp} />
        <button className={styles.btn}>
          <Package size={16} />
          Lihat Pesanan
        </button>
        <button className={styles.btnPri}>
          <ShoppingBag size={16} />
          Input Pesanan
        </button>
      </div>

      <div className={styles.stats}>
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`${styles.card} ${styles.stat}`}>
              <div className={styles.k}>
                <span className={styles.dot} style={{ background: m.dot }} />
                {m.label}
              </div>
              <div className={`${styles.v} ${styles.num}`}>{m.value}</div>
              <div className={styles.s}>{m.note}</div>
              <Icon size={16} className={styles.statIcon} />
            </div>
          );
        })}
      </div>

      <div className={`${styles.grid} ${styles.g2}`} style={{ alignItems: "start" }}>
        <div className={styles.card}>
          <div className={styles.cardH}>
            <div>
              <h2>Pesanan terbaru</h2>
              <p>Pesanan terakhir dari semua sumber.</p>
            </div>
          </div>
          <div className={styles.empty}>
            <ShoppingBag size={26} />
            <b>Belum ada pesanan</b>
            <span>Pesanan akan muncul di sini begitu data tersambung.</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardH}>
            <div>
              <h2>Stok menipis</h2>
              <p>Varian dengan sisa stok ≤ 5 unit.</p>
            </div>
          </div>
          <div className={styles.empty}>
            <Package size={26} />
            <b>Semua stok aman</b>
            <span>Tidak ada varian yang perlu segera diisi ulang.</span>
          </div>
        </div>
      </div>
    </>
  );
}
