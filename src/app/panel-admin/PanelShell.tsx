"use client";

/**
 * Kerangka panel admin — susunannya diambil dari mockup (samaqu-admin-dashboard/pages/index.html):
 * sidebar gelap dengan logo kotak pink, nav bersekat, header sticky berisi crumb + judul + user,
 * dan hamburger untuk layar sempit. Isi menu masih placeholder (menyusul disatukan dengan ops).
 */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, ShoppingBag, Shirt, Package } from "lucide-react";
import styles from "./panel.module.css";

const NAV = [
  {
    section: "Menu Utama",
    items: [
      { href: "/panel-admin", label: "Beranda", icon: LayoutDashboard },
      { href: "/panel-admin", label: "Transaksi", icon: ShoppingBag, soon: true },
      { href: "/panel-admin", label: "Produk", icon: Package, soon: true },
      { href: "/panel-admin", label: "Leads", icon: Shirt, soon: true },
    ],
  },
];

export default function PanelShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className={styles.app}>
      <aside className={`${styles.side} ${open ? styles.sideOpen : ""}`}>
        <div className={styles.brand}>
          <div className={styles.logo}>S</div>
          <div>
            <b>SAMAQU</b>
            <small>Admin Operasional</small>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map((group) => (
            <div key={group.section}>
              <p className={styles.sec}>{group.section}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href && !item.soon;
                return (
                  <Link key={item.label} href={item.href} className={active ? styles.on : undefined}>
                    <Icon />
                    <span>{item.label}</span>
                    {item.soon ? <span className={styles.cnt}>soon</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sideFoot}>Panel admin · tahap 1</div>
      </aside>

      {open ? <div className={styles.scrimOpen} onClick={() => setOpen(false)} /> : null}

      <div className={styles.main}>
        <header className={styles.top}>
          <button className={styles.hamb} onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>
          <div>
            <div className={styles.crumb}>SAMAQU</div>
            <h1>Panel Admin</h1>
          </div>
          <div className={styles.sp} />
          <span className={styles.demoTag}>Tahap 1</span>
          <div className={styles.user}>
            <div className={styles.av}>A</div>
            <div className={styles.ut}>
              <b>Admin</b>
              <small>Super admin</small>
            </div>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
