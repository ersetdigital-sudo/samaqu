/**
 * Beranda panel admin — tahap 1 masih kerangka (belum menarik data apa pun).
 *
 * Halaman ops & dashboard admin lama tetap dipakai seperti sekarang; isi menu menyusul di tahap
 * berikutnya dengan memakai ulang halaman yang sama (bukan disalin).
 */
import styles from "./panel.module.css";

export default function PanelAdminHome() {
  return (
    <div className={styles.card}>
      <div className={styles.cardH}>
        <div>
          <h2>Kerangka panel admin siap</h2>
          <p>Warna, sidebar, dan header sudah mengikuti mockup dashboard admin.</p>
        </div>
      </div>
      <div className={styles.cardB}>
        <div className={styles.row}>
          <span className={`${styles.b} ${styles.bPink}`}>Tahap 1 selesai</span>
          <span className={`${styles.b} ${styles.bGray}`}>Menu menyusul</span>
        </div>
        <p className={styles.hint} style={{ marginTop: 14, marginBottom: 0 }}>
          Langkah berikutnya: menyatukan daftar menu (dipakai bareng dashboard ops) lalu menitipkan
          halaman Produk, Leads, dan Transaksi ke shell ini — halaman yang sama, jadi tidak ada
          logika yang digandakan dan angkanya tetap sinkron.
        </p>
      </div>
    </div>
  );
}
