import type { ReactNode } from "react";
import Link from "next/link";
import "./panel.css";

/**
 * Shell panel admin (`admin.samaqu.id` → /panel-admin/*).
 *
 * Tahap 1: hanya kerangka + tema dari mockup dashboard admin (aksen pink, sidebar gelap 240px,
 * header sticky). Belum ada halaman lama yang dipindah ke sini, dan halaman ops/admin yang sudah
 * jalan tidak disentuh. Menu di shell ini menyusul disatukan dengan daftar menu ops (tahap 3).
 */
export const metadata = {
  title: "SAMAQU · Panel Admin",
};

const NAV: { section: string; items: { href: string; label: string; soon?: boolean }[] }[] = [
  {
    section: "Menu Utama",
    items: [{ href: "/panel-admin", label: "Beranda" }],
  },
  {
    section: "Menyusul",
    items: [
      { href: "/panel-admin", label: "Transaksi", soon: true },
      { href: "/panel-admin", label: "Leads", soon: true },
      { href: "/panel-admin", label: "Produk", soon: true },
    ],
  },
];

export default function PanelAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pa">
      <aside className="pa-side">
        <div className="pa-brand">
          <div>
            <b>SAMAQU</b>
            <small>ADMIN</small>
          </div>
        </div>
        <nav className="pa-nav">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="sec">{group.section}</p>
              {group.items.map((item) => (
                <Link key={`${group.section}-${item.label}`} href={item.href}>
                  <span>{item.label}</span>
                  {item.soon ? <span className="soon">SOON</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="pa-main">
        <header className="pa-top">
          <div>
            <div className="crumb">SAMAQU</div>
            <h1>Panel Admin</h1>
          </div>
          <div className="sp" />
          <span className="pa-pill">Tampilan baru</span>
        </header>
        <div className="pa-body">{children}</div>
      </div>
    </div>
  );
}
