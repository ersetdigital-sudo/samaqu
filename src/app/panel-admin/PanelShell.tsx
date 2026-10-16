"use client";

/**
 * Kerangka panel admin — tema dari mockup HTML (samaqu-admin-dashboard-2/pages/index.html).
 * Sidebar gelap 248px + nav bersekat, topbar berisi search, chip tanggal, lonceng, dan user.
 *
 * Catatan: menu Transaksi/Produk/Leads belum dibangun (badge `SOON`), jadi sengaja non-link
 * supaya tidak menabrak rute yang belum ada.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./panel.module.css";

const AVATAR =
  "https://res.cloudinary.com/j4ka1ty6/image/upload/w_96,h_96,c_fill,f_auto,q_auto/v1792158930/Avatar_Hijab_Merah_Muda_dalam_Lencana.png";

const TANGGAL = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
}).format(new Date());

type IconName = "home" | "card" | "box" | "users";

function NavIcon({ name }: { name: IconName }) {
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 11l9-8 9 8v10H3z" />
        </svg>
      );
    case "card":
      return (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 010 8" />
        </svg>
      );
  }
}

type NavItem = { label: string; href: string; icon: IconName; soon?: boolean };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Operasional",
    items: [
      { label: "Beranda", href: "/panel-admin", icon: "home" },
      { label: "Transaksi", href: "/panel-admin/transaksi", icon: "card", soon: true },
    ],
  },
  {
    section: "Katalog & Data",
    items: [
      { label: "Produk", href: "/panel-admin/produk", icon: "box", soon: true },
      { label: "Leads", href: "/panel-admin/leads", icon: "users", soon: true },
    ],
  },
];

export default function PanelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const activeItem = NAV.flatMap((g) => g.items).find((item) =>
    item.href === "/panel-admin" ? pathname === item.href : pathname.startsWith(item.href)
  );

  return (
    <div className={styles.app}>
      <aside className={styles.side}>
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
              <div className={styles.sec}>{group.section}</div>
              {group.items.map((item) => {
                if (item.soon) {
                  return (
                    <div key={item.label} className={`${styles.navItem} ${styles.navItemSoon}`}>
                      <NavIcon name={item.icon} />
                      <span>{item.label}</span>
                      <span className={styles.soon}>SOON</span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={activeItem?.href === item.href ? styles.on : undefined}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.foot}>
          <img className={styles.footAv} src={AVATAR} alt="" width={44} height={44} />
          <div className={styles.footText}>
            <b>© 2026 SAMAQU ADMIN</b>
            Engineered by <b>Surya</b>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.top}>
          <div className={`${styles.search} ${styles.topSearch}`}>
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-5-5" />
            </svg>
            <input className={styles.searchInput} placeholder="Cari pesanan, SKU baju, atau nama pelanggan..." />
          </div>
          <div className={styles.date}>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {TANGGAL}
          </div>
          <div className={styles.bell}>
            <svg viewBox="0 0 24 24">
              <path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4" />
            </svg>
          </div>
          <div className={styles.user}>
            <img className={styles.av} src={AVATAR} alt="Lea" width={40} height={40} />
            <div>
              <b>Lea</b>
              <small>SAMAQU</small>
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
