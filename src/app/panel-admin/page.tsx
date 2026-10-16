/**
 * Beranda panel admin — halaman contoh (style showcase) untuk tema "Rose Luxury Admin".
 *
 * Fitur (Transaksi/Produk/Leads) belum dibangun; halaman ini hanya memperlihatkan komponen &
 * tipografi barunya. Semua angka di bawah adalah CONTOH dan ditandai sebagai contoh — bukan data
 * produksi.
 */
import { TrendingUp, ShoppingBag, Truck, Package } from "lucide-react";
import styles from "./panel.module.css";

const METRICS = [
  { label: "Omset hari ini", value: "Rp 7.712.123", note: "Contoh · diproses + selesai", dot: "#be185d", icon: TrendingUp },
  { label: "Pesanan masuk", value: "12", note: "Contoh · hari ini", dot: "#15803d", icon: ShoppingBag },
  { label: "Perlu dikirim", value: "3", note: "Contoh · menunggu resi", dot: "#b45309", icon: Truck },
  { label: "Stok menipis", value: "5", note: "Contoh · ≤ 5 unit", dot: "#b91c1c", icon: Package },
];

const ORDERS = [
  { no: "SMQ-2610-0041", cust: "Siti Aminah", total: "Rp 489.000", status: "Perlu Dikirim", pill: styles.bWarn },
  { no: "CYO-2610-0077", cust: "Dewi Lestari", total: "Rp 358.000", status: "Menunggu Pickup", pill: styles.bNeutral },
  { no: "OPS-2610-0012", cust: "Nur Halimah", total: "Rp 199.000", status: "Selesai", pill: styles.bOk },
  { no: "SMQ-2610-0038", cust: "Rahma Putri", total: "Rp 89.000", status: "Dibatalkan", pill: styles.bErr },
];

const UPCOMING = [
  { label: "Transaksi", desc: "Daftar pesanan, input cepat, buat & cetak resi" },
  { label: "Produk", desc: "Daftar produk, varian, laporan stok, barang masuk/keluar" },
  { label: "Leads", desc: "Database leads + Follow-up Center" },
];

export default function PanelAdminHome() {
  return (
    <>
      <div className={styles.row} style={{ marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "var(--head)", fontSize: 20, fontWeight: 700, color: "var(--plum)", letterSpacing: "-0.02em" }}>
            Selamat bekerja, Admin
          </div>
          <div className={styles.hint}>Contoh tata letak · tema Rose Luxury Admin.</div>
        </div>
        <div className={styles.sp} />
        <button className={styles.btn}>
          <Package size={16} />
          Contoh Aksi
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
              <Icon size={16} style={{ position: "absolute", right: 16, top: 16, color: "var(--fg2)", opacity: 0.7 }} />
            </div>
          );
        })}
      </div>

      <div className={`${styles.grid} ${styles.g2}`} style={{ marginBottom: 20, alignItems: "start" }}>
        <div className={styles.card}>
          <div className={styles.cardH}>
            <div>
              <h2>Pesanan terbaru</h2>
              <p>Contoh tampilan tabel — header blush, pill status, angka rata kolom.</p>
            </div>
            <div className={styles.sp} />
            <span className={`${styles.b} ${styles.bBerry}`}>contoh</span>
          </div>
          <div className={styles.tw}>
            <table>
              <thead>
                <tr>
                  <th>No. Pesanan</th>
                  <th>Pelanggan</th>
                  <th className={styles.r}>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ORDERS.map((o) => (
                  <tr key={o.no}>
                    <td>
                      <b className={styles.mono}>{o.no}</b>
                    </td>
                    <td>{o.cust}</td>
                    <td className={`${styles.r} ${styles.num}`}>{o.total}</td>
                    <td>
                      <span className={`${styles.b} ${o.pill}`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardH}>
            <div>
              <h2>Komponen & kontrol</h2>
              <p>Tombol, input, pill status, dan ornamen fashion-ops.</p>
            </div>
          </div>
          <div className={styles.cardB}>
            <div className={styles.row}>
              <button className={styles.btnPri}>Simpan</button>
              <button className={styles.btn}>Sekunder</button>
              <button className={styles.btnGhost}>Teks</button>
              <button className={`${styles.btn} ${styles.btnSm}`}>Kecil</button>
            </div>

            <div style={{ marginTop: 16 }}>
              <label className={styles.lab}>Cari pesanan</label>
              <input className={styles.in} placeholder="No. pesanan, nama, atau WhatsApp" />
            </div>

            <div className={styles.row} style={{ marginTop: 16 }}>
              <span className={`${styles.b} ${styles.bOk}`}>Stok aman</span>
              <span className={`${styles.b} ${styles.bWarn}`}>Stok menipis</span>
              <span className={`${styles.b} ${styles.bErr}`}>Stok habis</span>
              <span className={`${styles.b} ${styles.bNeutral}`}>Kategori</span>
            </div>

            <div className={styles.row} style={{ marginTop: 16 }}>
              <span className={styles.swatch} style={{ background: "#be185d" }} />
              <span className={styles.swatch} style={{ background: "#332b35" }} />
              <span className={styles.swatch} style={{ background: "#e8b4c8" }} />
              <span className={styles.swatch} style={{ background: "#f8eef2" }} />
            </div>

            <div style={{ marginTop: 16 }}>
              <label className={styles.lab}>Kesehatan stok</label>
              <div className={styles.bar}>
                <i style={{ width: "62%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardH}>
          <div>
            <h2>Menu yang menyusul</h2>
            <p>Fitur dibangun setelah tampilan ini disetujui.</p>
          </div>
        </div>
        <div className={styles.cardB}>
          <div className={`${styles.grid} ${styles.g3}`}>
            {UPCOMING.map((u) => (
              <div key={u.label} className={styles.note}>
                <div>
                  <b style={{ display: "block", color: "var(--plum)", marginBottom: 2 }}>{u.label}</b>
                  {u.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
