"use client";

/**
 * Kerangka panel admin — tema dari mockup HTML (samaqu-admin-dashboard-2/pages/index.html).
 *
 * Ada gerbang login: semua API `/api/ops/*` butuh sesi admin Supabase, jadi isi panel baru
 * dirender setelah sesi terbukti admin (probe `GET /api/ops/leads?limit=1`), sama seperti ops.
 *
 * Catatan: menu Transaksi/Produk/Leads belum dibangun (badge `SOON`), jadi sengaja non-link.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ops/ui/toaster";
import { OpsPageMapProvider } from "@/lib/ops-router";
import { useWibLongDate } from "./wib-date";
import { opsGet } from "./panel-api";
import styles from "./panel.module.css";

const AVATAR =
  "https://res.cloudinary.com/j4ka1ty6/image/upload/w_96,h_96,c_fill,f_auto,q_auto/v1792158930/Avatar_Hijab_Merah_Muda_dalam_Lencana.png";

type IconName = "home" | "card" | "box" | "users" | "spark";

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
    case "spark":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M11 3l1.7 4.9L17.6 9.6l-4.9 1.7L11 16.2 9.3 11.3 4.4 9.6l4.9-1.7z" />
          <path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
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
      { label: "Transaksi", href: "/panel-admin/transaksi", icon: "card" },
    ],
  },
  {
    section: "Katalog & Data",
    items: [
      { label: "Produk", href: "/panel-admin/produk", icon: "box" },
      { label: "Leads", href: "/panel-admin/leads", icon: "users" },
    ],
  },
  {
    section: "Bantuan",
    items: [{ label: "Asisten", href: "/panel-admin/assistant", icon: "spark" }],
  },
];

/**
 * Peta nama halaman (konvensi Base44) → route panel admin. Dipakai halaman ops yang dititipkan
 * ke panel supaya navigasi internalnya ("Tambah Produk", "Tambah Barang Masuk", "kembali")
 * tetap berada di `/panel-admin/...`, bukan lompat ke `/ops/*` (yang akan 404 di host admin).
 */
const PANEL_PAGES: Record<string, string> = {
  Dashboard: "/panel-admin",
  Transaksi: "/panel-admin/transaksi",
  Leads: "/panel-admin/leads",
  MasterProduk: "/panel-admin/produk",
  TambahProduk: "/panel-admin/produk/tambah",
  TambahBarangMasuk: "/panel-admin/produk/barang-masuk",
};

/** Hasil pencarian topbar (pesanan / produk / leads). */
type SearchHit = { key: string; kind: string; title: string; sub: string; href: string };
type OrderRow = { order_number?: string; customer_name?: string; customer_whatsapp?: string };
type ProductRow = { id?: string; name?: string; series?: string | null; category?: string | null; sku?: string | null };
type LeadRow = { id?: string; kontak?: string; produk?: string | null; sumber?: string | null };

export default function PanelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const tanggal = useWibLongDate();
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Halaman Transaksi memakai halaman ops yang sama → butuh React Query + Toaster (keduanya di
  // OpsShell). Client dibuat per-instance supaya tidak dibagi antar-request saat SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            // PENTING: halaman /ops memakai `initialData: []`. Tanpa baris ini, array kosong
            // dianggap data segar sehingga query tidak jalan dan tabel tampil kosong.
            initialDataUpdatedAt: 0,
          },
        },
      })
  );

  // ── Pencarian topbar: cari pesanan / produk / leads lalu buka halamannya ──
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(false);
    const timer = setTimeout(async () => {
      const needle = term.toLowerCase();
      const digits = term.replace(/\D/g, "");
      try {
        const [ordersRes, productsRes, leadsRes] = await Promise.all([
          opsGet<{ orders?: OrderRow[] }>("/api/ops/orders?limit=300"),
          opsGet<{ items?: ProductRow[] }>("/api/ops/products"),
          // API leads hanya mencari di kolom kontak; sisanya disaring di klien.
          opsGet<{ items?: LeadRow[] }>(`/api/ops/leads?search=${encodeURIComponent(term)}&limit=5`),
        ]);
        if (cancelled) return;

        const orderHits: SearchHit[] = (ordersRes.orders ?? [])
          .filter((o) => {
            const hay = `${o.order_number ?? ""} ${o.customer_name ?? ""}`.toLowerCase();
            const wa = String(o.customer_whatsapp ?? "").replace(/\D/g, "");
            return hay.includes(needle) || (digits.length >= 3 && wa.includes(digits));
          })
          .slice(0, 4)
          .map((o) => ({
            key: `order-${o.order_number}`,
            kind: "Pesanan",
            title: o.order_number ?? "",
            sub: o.customer_name ?? "",
            href: "/panel-admin/transaksi",
          }));

        const productHits: SearchHit[] = (productsRes.items ?? [])
          .filter((p) =>
            `${p.name ?? ""} ${p.series ?? ""} ${p.category ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(needle)
          )
          .slice(0, 4)
          .map((p) => ({
            key: `product-${p.id}`,
            kind: "Produk",
            title: p.name ?? "",
            sub: [p.series, p.category].filter(Boolean).join(" · "),
            href: "/panel-admin/produk",
          }));

        const leadHits: SearchHit[] = (leadsRes.items ?? []).slice(0, 4).map((l) => ({
          key: `lead-${l.id}`,
          kind: "Leads",
          title: l.kontak ?? "",
          sub: [l.produk, l.sumber].filter(Boolean).join(" · "),
          href: "/panel-admin/leads",
        }));

        setHits([...orderHits, ...productHits, ...leadHits]);
      } catch {
        if (!cancelled) {
          setHits([]);
          setSearchError(true);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  function openHit(hit: SearchHit) {
    setSearchOpen(false);
    setQ("");
    router.push(hit.href);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const res = await fetch("/api/ops/leads?limit=1", { headers: { Authorization: `Bearer ${token}` } });
        if (!cancelled) setAuthorized(res.ok);
      } catch {
        if (!cancelled) setAuthorized(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err || !data.session) {
      setError(err?.message || "Login gagal");
      setBusy(false);
      return;
    }
    const res = await fetch("/api/ops/leads?limit=1", {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    if (!res.ok) {
      setError("Akun ini bukan admin SAMAQU");
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }
    setAuthorized(true);
    setBusy(false);
  }

  if (!ready) {
    return (
      <div className={styles.app}>
        <div className={styles.gate}>
          <div className={styles.gateCard}>
            <div className={styles.gateBrand}>
              <div className={styles.logo}>S</div>
              <div>
                <b>SAMAQU</b>
                <small>Panel Admin</small>
              </div>
            </div>
            <p className={styles.gateHint}>Memuat…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className={styles.app}>
        <div className={styles.gate}>
          <form className={styles.gateCard} onSubmit={handleLogin}>
            <div className={styles.gateBrand}>
              <div className={styles.logo}>S</div>
              <div>
                <b>SAMAQU</b>
                <small>Panel Admin</small>
              </div>
            </div>
            <label className={styles.gateLabel} htmlFor="pa-email">
              Email
            </label>
            <input
              id="pa-email"
              className={styles.gateInput}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className={styles.gateLabel} htmlFor="pa-pass">
              Password
            </label>
            <input
              id="pa-pass"
              className={styles.gateInput}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error ? <p className={styles.gateError}>{error}</p> : null}
            <button className={styles.gateBtn} type="submit" disabled={busy}>
              {busy ? "Memproses…" : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeItem = NAV.flatMap((g) => g.items).find((item) =>
    item.href === "/panel-admin" ? pathname === item.href : pathname.startsWith(item.href)
  );

  return (
    <QueryClientProvider client={queryClient}>
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

      <main className={`${styles.main}${pathname.startsWith("/panel-admin/assistant") ? ` ${styles.mainFill}` : ""}`}>
        <div className={styles.top}>
          <div className={`${styles.search} ${styles.topSearch}`}>
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-5-5" />
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Cari pesanan, SKU baju, atau nama pelanggan..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  e.currentTarget.blur();
                } else if (e.key === "Enter" && hits.length > 0) {
                  e.preventDefault();
                  openHit(hits[0]);
                }
              }}
              aria-label="Cari pesanan, produk, atau leads"
            />
            {searchOpen && q.trim().length >= 2 ? (
              <div className={styles.searchPanel}>
                {searching ? (
                  <p className={styles.searchNote}>Mencari…</p>
                ) : searchError ? (
                  <p className={styles.searchNote}>Gagal memuat hasil pencarian.</p>
                ) : hits.length === 0 ? (
                  <p className={styles.searchNote}>Tidak ada hasil untuk “{q.trim()}”.</p>
                ) : (
                  hits.map((h) => (
                    <button
                      key={h.key}
                      type="button"
                      className={styles.searchHit}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => openHit(h)}
                    >
                      <span className={styles.searchKind}>{h.kind}</span>
                      <span className={styles.searchMain}>
                        <b>{h.title}</b>
                        {h.sub ? <small>{h.sub}</small> : null}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <div className={styles.date}>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {tanggal}
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

        <OpsPageMapProvider pages={PANEL_PAGES}>{children}</OpsPageMapProvider>
      </main>
      <Toaster />
      </div>
    </QueryClientProvider>
  );
}
