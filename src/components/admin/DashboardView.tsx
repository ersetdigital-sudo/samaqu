"use client";

/**
 * Panel dashboard admin — wireframe-accurate "Sales Analytics View"
 * (needmcp wireframe:sales-analytics-view).
 *
 * Tata letak mengikuti wireframe persis: judul + subjudul, 4 kartu metrik,
 * bar chart (col-span-2) + donut (col-span-1), lalu grid "Produk Terlaris" 4 kolom.
 *
 * SEMUA angka dihitung dari data asli (orders / products) yang di-pass dari caller —
 * tidak ada angka, persentase, atau chart palsu.
 */

const money = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

const shortMoney = (n: number) =>
  n >= 1_000_000_000 ? "Rp " + (n / 1_000_000_000).toFixed(1).replace(".", ",") + " M"
  : n >= 1_000_000 ? "Rp " + (n / 1_000_000).toFixed(1).replace(".", ",") + " jt"
  : n >= 1_000 ? "Rp " + Math.round(n / 1_000) + " rb"
  : "Rp " + n;

/** Warna irisan donut — persis palet wireframe (#1c1c1c, #5f5f5d, #f59e0b, #22c55e). */
const SLICE_COLORS: Record<string, string> = {
  selesai: "#1c1c1c",
  diproses: "#5f5f5d",
  dikirim: "#9a9a98",
  pending: "#f59e0b",
  dibatalkan: "#ef4444",
};
const SLICE_FALLBACK = ["#1c1c1c", "#5f5f5d", "#f59e0b", "#22c55e", "#9a9a98"];

export interface DashboardOrder {
  status: string;
  total: number;
  created_at: string;
}
export interface DashboardProduct {
  category?: string | null;
}
export interface TopProduct {
  /** Series (Imron, Jiharkah, …); produk tanpa series memakai nama produk. */
  name: string;
  /** Warna terjual — null bila "default" (pembeli tidak memilih). */
  sub?: string | null;
  count: number;
}

export default function DashboardView({
  revenue,
  orders,
  products,
  topProducts,
  loading = false,
}: {
  /** Total pendapatan — dihitung caller (tetap pakai aturan lama: tanpa pesanan pending). */
  revenue: number;
  orders: DashboardOrder[];
  products: DashboardProduct[];
  topProducts: TopProduct[];
  loading?: boolean;
}) {
  /* ── metrik ── */
  const orderCount = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const avgOrder = orderCount ? revenue / orderCount : 0;

  const categoryCount: Record<string, number> = {};
  products.forEach((p) => {
    const c = (p.category || "").trim();
    if (c) categoryCount[c] = (categoryCount[c] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];

  /* ── deret pendapatan bulanan (jendela 6 bulan sampai bulan pesanan terbaru) ── */
  const monthly = (() => {
    if (orders.length === 0) return [] as { label: string; revenue: number; orders: number }[];
    const stamps = orders.map((o) => new Date(o.created_at).getTime());
    const latest = new Date(Math.max(...stamps));
    const LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const keys: string[] = [];
    const rev: Record<string, number> = {};
    const cnt: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(latest.getFullYear(), latest.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      keys.push(key);
      rev[key] = 0;
      cnt[key] = 0;
    }
    for (const o of orders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in rev) {
        cnt[key] += 1;
        if (o.status !== "pending" && o.status !== "dibatalkan") rev[key] += o.total;
      }
    }
    return keys.map((k) => ({
      label: LABELS[parseInt(k.split("-")[1], 10) - 1],
      revenue: rev[k],
      orders: cnt[k],
    }));
  })();

  const maxRev = Math.max(1, ...monthly.map((m) => m.revenue));
  const peakIdx = monthly.reduce((best, m, i, arr) => (m.revenue > arr[best].revenue ? i : best), 0);

  /* ── irisan donut: pesanan per status (data asli) ── */
  const statusMap: Record<string, number> = {};
  orders.forEach((o) => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
  const preferred = ["selesai", "diproses", "dikirim", "pending", "dibatalkan"];
  const slices = [
    ...preferred.filter((s) => statusMap[s]).map((s) => ({ label: s, value: statusMap[s] })),
    ...Object.keys(statusMap).filter((s) => !preferred.includes(s)).map((s) => ({ label: s, value: statusMap[s] })),
  ];
  const sliceTotal = slices.reduce((s, x) => s + x.value, 0);
  const sliceColor = (label: string, i: number) =>
    SLICE_COLORS[label] || SLICE_FALLBACK[i % SLICE_FALLBACK.length];

  /* ── donut svg ── */
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  let acc = 0;
  const arcs = slices.map((s, i) => {
    const len = sliceTotal ? (s.value / sliceTotal) * CIRC : 0;
    const arc = { key: s.label + i, len, offset: acc, color: sliceColor(s.label, i) };
    acc += len;
    return arc;
  });

  const metrics = [
    { label: "Pendapatan", value: money(revenue), pill: `${orderCount} pesanan` },
    { label: "Pesanan", value: String(orderCount), pill: `${pendingOrders} menunggu` },
    { label: "Rata-rata Pesanan", value: avgOrder ? money(avgOrder) : "—", pill: "per pesanan" },
    {
      label: "Kategori Teratas",
      value: topCategory ? topCategory[0] : "—",
      pill: topCategory ? `${topCategory[1]} produk` : "belum ada produk",
    },
  ];

  return (
    <div className="p-5 lg:p-8 space-y-6 lg:space-y-8">
      {/* ── 4 kartu metrik ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        {metrics.map((m) => (
          <div key={m.label} className="p-5" style={{ background: "var(--card)", border: "1px solid var(--bd)", borderRadius: "var(--rad3)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--fg3)" }}>{m.label}</span>
            {/* Ukuran font fluid supaya nominal panjang (mis. "Rp 19.383.000") tidak
                pernah terpotong di layar sempit / zoom tinggi. */}
            <div
              className="font-extrabold mt-2 leading-tight whitespace-nowrap text-[clamp(1.15rem,1.7vw,1.6rem)]"
              style={{ color: "var(--fg)" }}
            >
              {m.value}
            </div>
            <span className="text-[11px] font-bold inline-block mt-2 px-2 py-0.5 rounded-full" style={{ background: "var(--sub)", color: "var(--fg3)" }}>{m.pill}</span>
          </div>
        ))}
      </div>

      {/* ── bar chart (col-span-2) + donut (col-span-1) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        <div className="lg:col-span-2 p-6" style={{ background: "var(--card)", border: "1px solid var(--bd)", borderRadius: "var(--rad3)" }}>
          <h3 className="font-extrabold text-sm" style={{ color: "var(--fg)" }}>Pendapatan Bulanan</h3>
          {loading ? (
            <p className="text-xs font-bold mt-4" style={{ color: "var(--fg3)" }}>Memuat…</p>
          ) : monthly.length === 0 ? (
            <p className="text-xs font-bold mt-4" style={{ color: "var(--fg3)" }}>Belum ada data penjualan</p>
          ) : (
            <div className="flex gap-3 h-56 lg:h-64 mt-4">
              <div className="flex flex-col justify-between text-[10px] font-bold pb-5 text-right" style={{ color: "var(--fg3)" }}>
                <span>{shortMoney(maxRev)}</span>
                <span>{shortMoney(maxRev / 2)}</span>
                <span>Rp 0</span>
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 flex items-end gap-2" style={{ borderBottom: "1px solid var(--bd)" }}>
                  {monthly.map((m, i) => (
                    <div key={m.label} className="flex-1 h-full flex flex-col items-center justify-end group min-w-0">
                      <span className="mb-1 text-[10px] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ color: "var(--fg)" }}>
                        {m.revenue > 0 ? shortMoney(m.revenue) : "Rp 0"}
                      </span>
                      <div
                        className="w-full transition-all"
                        title={`${m.label}: ${money(m.revenue)} · ${m.orders} pesanan`}
                        style={{
                          height: `${(m.revenue / maxRev) * 100}%`,
                          minHeight: m.revenue > 0 ? 6 : 2,
                          background: i === peakIdx && m.revenue > 0 ? "var(--fg)" : "rgba(28,28,28,0.1)",
                          border: "1.5px solid var(--fg)",
                          borderRadius: 8,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  {monthly.map((m) => (
                    <span key={m.label} className="flex-1 text-center text-[10px] font-bold min-w-0" style={{ color: m.revenue > 0 ? "var(--fg2)" : "var(--fg3)" }}>
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6" style={{ background: "var(--card)", border: "1px solid var(--bd)", borderRadius: "var(--rad3)" }}>
          <h3 className="font-extrabold text-sm" style={{ color: "var(--fg)" }}>Per Status</h3>
          {loading ? (
            <p className="text-xs font-bold mt-4" style={{ color: "var(--fg3)" }}>Memuat…</p>
          ) : sliceTotal === 0 ? (
            <p className="text-xs font-bold mt-4" style={{ color: "var(--fg3)" }}>Belum ada pesanan</p>
          ) : (
            <>
              <div className="relative h-44 lg:h-56 w-full flex items-center justify-center">
                <svg viewBox="0 0 140 140" className="h-full w-auto max-w-full">
                  {arcs.map((a) => (
                    <circle
                      key={a.key}
                      cx="70" cy="70" r={R}
                      fill="none"
                      stroke={a.color}
                      strokeWidth="22"
                      strokeDasharray={`${a.len} ${CIRC - a.len}`}
                      strokeDashoffset={-a.offset}
                      transform="rotate(-90 70 70)"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-extrabold leading-none" style={{ color: "var(--fg)" }}>{sliceTotal}</span>
                  <span className="text-[10px] font-bold mt-1" style={{ color: "var(--fg3)" }}>pesanan</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {slices.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sliceColor(s.label, i) }} />
                    <span className="font-bold capitalize flex-1 truncate" style={{ color: "var(--fg2)" }}>{s.label}</span>
                    <span className="font-extrabold" style={{ color: "var(--fg)" }}>{s.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ── produk terlaris (grid 4 kolom ala wireframe) ── */}
      <div className="p-6" style={{ background: "var(--card)", border: "1px solid var(--bd)", borderRadius: "var(--rad3)" }}>
        <h3 className="font-extrabold text-sm mb-4" style={{ color: "var(--fg)" }}>Produk Terlaris</h3>
        {loading ? (
          <p className="text-xs font-bold" style={{ color: "var(--fg3)" }}>Memuat…</p>
        ) : topProducts.length === 0 ? (
          <p className="text-xs font-bold" style={{ color: "var(--fg3)" }}>Belum ada data penjualan</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
            {topProducts.slice(0, 4).map((p, i) => (
              <div
                key={`${p.name}||${p.sub || ""}`}
                className="p-3.5 rounded-2xl flex items-center justify-between gap-2"
                style={{ background: "var(--sub)", border: "1px solid var(--bd)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-extrabold shrink-0" style={{ color: "var(--fg3)" }}>#{i + 1}</span>
                  <div className="min-w-0">
                    {/* series (atau nama produk bila tanpa series) */}
                    <p className="font-extrabold truncate" style={{ color: "var(--fg)" }}>{p.name}</p>
                    {p.sub && (
                      <p className="text-[10px] font-bold truncate mt-0.5" style={{ color: "var(--fg3)" }}>{p.sub}</p>
                    )}
                  </div>
                </div>
                <span
                  className="font-bold px-2.5 py-1 shrink-0"
                  style={{ color: "var(--fg)", background: "var(--card)", borderRadius: 8, border: "1px solid var(--bd)" }}
                >
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
