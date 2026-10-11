/**
 * Token & utilitas tema admin — struktur diambil dari wireframe needmcp
 * "Sales Analytics View" (wireframe-accurate:sales-analytics-view), tapi palet
 * netral (permintaan: "background nya jgn cream, ganti putih").
 *
 * Latar halaman putih murni; kartu juga putih jadi perbatasan dibuat netral
 * + shadow tipis supaya kartu tetap terbaca. Isian halus DI DALAM kartu
 * (pill, tile ikon, track grafik, kolom cari) memakai --sub (#f5f5f5) — kalau
 * pakai --bg juga, isian itu jadi putih-di-putih dan hilang bentuknya.
 *
 * Semua di-scope ke #admin-root sehingga storefront tetap cream/espresso/gold.
 *
 * Dipakai AdminShell (semua subhalaman admin) + dua dashboard (/admin dan /id/admin),
 * supaya satu sumber gaya.
 */
export const ADMIN_WF_VARS = `
  #admin-root {
    /* ── token netral ── */
    --bg: #ffffff;      /* latar halaman */
    --card: #ffffff;    /* kartu, sidebar, topbar */
    --sub: #f5f5f5;     /* isian halus di dalam kartu (pill, tile, track, input) */
    --bd: #e8e8e8;
    --fg: #1c1c1c;
    --fg2: #5f5f5d;
    --fg3: #9a9a98;
    --su: #22c55e;
    --hl: #f59e0b;
    --rad: 6px;
    --rad2: 12px;
    --rad3: 16px;
    --el2: rgba(0,0,0,0.1) 0px 4px 12px;

    /* ── map var toko lama → token netral (agar sisa markup ikut putih) ── */
    --cream: #ffffff; --cream-bright: #ffffff; --ivory: #ffffff;
    --bg-primary: #ffffff; --bg-secondary: #f5f5f5; --beige: #f5f5f5;
    --sand: #f5f5f5; --sand-2: #ffffff; --warm-sand: #f5f5f5; --clay: #d9d9d9;
    --espresso: #1c1c1c; --espresso-deep: #0f0f0f; --coffee: #3d3d3b;
    --stone: #6f6f6d;
    --gold: #1c1c1c; --gold-bright: #1c1c1c; --gold-light: #3d3d3b;
    --gold-deep: #0f0f0f; --gold-dark: #0f0f0f;
    --text-secondary: #5f5f5d; --text-muted: #9a9a98;
    color: #1c1c1c;
  }
  #admin-root button, #admin-root a, #admin-root [role="button"], #admin-root select { cursor: pointer; }

  /* Menu tanpa scrollbar (permintaan: "di menu jgn ada scrol") */
  .no-scrollbar, .admin-sidebar { scrollbar-width: none; -ms-overflow-style: none; }
  .no-scrollbar::-webkit-scrollbar, .admin-sidebar::-webkit-scrollbar { display: none; }

  .sidebar-link {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.4rem 0.5rem; border-radius: var(--rad);
    color: var(--fg2); font-size: 0.8125rem; font-weight: 700;
    cursor: pointer; transition: background .12s ease, color .12s ease;
    border: 1px solid transparent; text-decoration: none; width: 100%; text-align: left;
  }
  .sidebar-link:hover { background: var(--sub); color: var(--fg); }
  .sidebar-link.active { background: var(--fg); color: #ffffff; box-shadow: var(--el2); }
  .sidebar-link.active svg { color: #ffffff; }

  /* Latar putih: kartu putih butuh shadow tipis supaya tepinya tetap terbaca. */
  .card { background: var(--card); border: 1px solid var(--bd); border-radius: var(--rad3); box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .badge { font-size: .7rem; font-weight: 800; padding: .18rem .55rem; border-radius: 999px; white-space: nowrap; }

  .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 999px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
`;

/** Alias — AdminShell memakai nama ini. */
export const ADMIN_SHELL_CSS = ADMIN_WF_VARS;
