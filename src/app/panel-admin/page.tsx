/**
 * Beranda panel admin — tahap 1 masih kerangka (belum menarik data apa pun).
 *
 * Sengaja belum menyentuh apa pun yang sudah jalan: halaman ops & dashboard admin lama tetap
 * dipakai seperti sekarang. Isi menu menyusul di tahap berikutnya (menu disatukan + halaman
 * yang sama dipakai ulang, bukan disalin).
 */
export default function PanelAdminHome() {
  return (
    <div className="pa-card">
      <div className="pa-card-h">
        <div>
          <h2>Kerangka panel admin siap</h2>
          <p>Warna, sidebar, dan header sudah mengikuti mockup dashboard admin.</p>
        </div>
      </div>
      <div className="pa-card-b">
        <p style={{ margin: 0, color: "var(--mut)" }}>
          Belum ada menu yang dipindah ke sini. Langkah berikutnya: menyatukan daftar menu
          (dipakai bareng dashboard ops) lalu menitipkan halaman Produk, Leads, dan Transaksi ke
          shell ini — halaman yang sama, jadi tidak ada logika yang digandakan.
        </p>
      </div>
    </div>
  );
}
