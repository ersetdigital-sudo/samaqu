"use client";

/**
 * Kerangka panel admin — tema "Rose Luxury Admin".
 *
 * Sidebar gelap + nav bersekat, header sticky (search, chip tanggal, notifikasi, user),
 * dan hamburger untuk layar sempit. Hero sapaan ada di halaman beranda.
 *
 * Catatan: halaman Transaksi/Produk/Leads belum dibangun; menunya sengaja tampil sebagai pill
 * `soon` (bukan link) supaya tidak menabrak rute yang belum ada. "Akun"/"Logout" juga belum
 * aktif (panel belum punya autentikasi sendiri).
 */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Calendar, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, User, Users } from "lucide-react";
import styles from "./panel.module.css";

const AVATAR =
  "https://res.cloudinary.com/j4ka1ty6/image/upload/w_72,h_72,c_fill,f_auto,q_auto/v1792158930/Avatar_Hijab_Merah_Muda_dalam_Lencana.png";

const TANGGAL = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
}).format(new Date());

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; soon?: boolean; disabled?: boolean };

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
  {
    section: "Pengaturan",
    items: [
      { href: "/panel-admin", label: "Akun", icon: User, disabled: true },
      { href: "/panel-admin", label: "Logout", icon: LogOut, disabled: true },
    ],
  },
];

export default function PanelShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const activeItem = NAV.flatMap((g) => g.items).find((item) =>
    item.href === "/panel-admin" ? pathname === item.href : pathname.startsWith(item.href)
  );

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
                if (item.soon || item.disabled) {
                  return (
                    <div key={item.label} className={`${styles.navItem} ${styles.navItemDisabled}`}>
                      <Icon />
                      <span>{item.label}</span>
                      {item.soon ? <span className={styles.soon}>soon</span> : null}
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
          <img className={styles.footAv} src={AVATAR} alt="" aria-hidden="true" width={34} height={34} />
          <div className={styles.footText}>
            <b>© 2026 SAMAQU ADMIN</b>
            <span>Engineered by Surya</span>
          </div>
        </div>
      </aside>

      {open ? <div className={styles.scrimOpen} onClick={() => setOpen(false)} /> : null}

      <div className={styles.main}>
        <header className={styles.top}>
          <button className={styles.hamb} onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={18} />
          </button>
          <div className={`${styles.search} ${styles.topSearch}`}>
            <Search />
            <input className={styles.in} placeholder="Cari pesanan, SKU baju, atau nama pelanggan…" />
          </div>
          <span className={styles.dateChip}>
            <Calendar size={16} />
            {TANGGAL}
          </span>
          <div className={styles.sp} />
          <button className={styles.bell} aria-label="Notifikasi">
            <Bell size={18} />
            <i className={styles.bellDot} />
          </button>
          <div className={styles.user}>
            <img className={styles.avImg} src={AVATAR} alt="Lea" width={38} height={38} />
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
