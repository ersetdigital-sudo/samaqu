"use client";

/**
 * Kerangka panel admin — tema "Rose Luxury Admin" (palet berry/plum/blush, font Plus Jakarta
 * Sans, radius lembut). Susunannya tetap seperti sebelumnya: sidebar gelap + nav bersekat,
 * header sticky berisi crumb + judul + user, dan hamburger untuk layar sempit.
 *
 * Catatan: halaman Transaksi/Produk/Leads belum dibangun (masih `soon`); menu sengaja tampil
 * sebagai pill, bukan link, supaya tidak menabrak rute yang belum ada.
 */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Package, ShoppingBag, Users } from "lucide-react";
import styles from "./panel.module.css";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; soon?: boolean };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Operasional",
    items: [
      { href: "/panel-admin", label: "Beranda", icon: LayoutDashboard },
      { href: "/panel-admin/transaksi", label: "Transaksi", icon: ShoppingBag, soon: true },
    ],
  },
  {
    section: "Katalog & Data",
    items: [
      { href: "/panel-admin/produk", label: "Produk", icon: Package, soon: true },
      { href: "/panel-admin/leads", label: "Leads", icon: Users, soon: true },
    ],
  },
];

export default function PanelShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const activeItem = NAV.flatMap((g) => g.items).find((item) =>
    item.href === "/panel-admin" ? pathname === item.href : pathname.startsWith(item.href)
  );
  const title = activeItem?.label ?? "Beranda";

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
                if (item.soon) {
                  return (
                    <div key={item.label} className={`${styles.navItem} ${styles.navItemDisabled}`}>
                      <Icon />
                      <span>{item.label}</span>
                      <span className={styles.soon}>soon</span>
                    </div>
                  );
                }
                const active = activeItem?.href === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={active ? styles.on : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sideFoot}>
          <b>Dashboard Admin</b>
          <span>© 2026 SAMAQU ADMIN · Engineered by Surya</span>
        </div>
      </aside>

      {open ? <div className={styles.scrimOpen} onClick={() => setOpen(false)} /> : null}

      <div className={styles.main}>
        <header className={styles.top}>
          <button className={styles.hamb} onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>
          <div>
            <div className={styles.crumb}>SAMAQU · Panel Admin</div>
            <h1>{title}</h1>
          </div>
          <div className={styles.sp} />
          <span className={styles.rolePill}>Super Admin</span>
          <div className={styles.user}>
            <div className={styles.av}>L</div>
            <div className={styles.ut}>
              <b>Lea</b>
              <small>SAMAQU</small>
            </div>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
