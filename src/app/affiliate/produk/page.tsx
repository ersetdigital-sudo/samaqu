"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/affiliate/icons";
import { Badge, Empty, Pager, Search, Select, paginate, useModal, useToast } from "@/components/affiliate/ui";
import LinkFormModal from "@/components/affiliate/LinkFormModal";
import { affiliateFetch } from "@/lib/affiliate/client";
import { money } from "@/lib/affiliate/format";

/**
 * Katalog produk affiliate — mengikuti mockup (filter bar + grid kartu produk).
 * Data produk & stok berasal dari katalog SAMAQU sungguhan.
 */

interface AffiliateProduct {
  id: string;
  name: string;
  category: string;
  series: string | null;
  price: number;
  description: string | null;
  image: string;
  media: { src: string; type: "image" | "video" }[];
  stock: number;
  sizes: string[];
  colors: string[];
  rate: number;
  estimatedCommission: number;
  promoted: boolean;
  createYourPrice: boolean;
  minimumPrice: number | null;
}

function stockLabel(stock: number) {
  if (stock === 0) return "Habis";
  if (stock < 15) return "Stok Terbatas";
  return "Tersedia";
}

export default function AffiliateCatalogPage() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("");
  const [avail, setAvail] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [page, setPage] = useState(1);
  const { open } = useModal();
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const json = await affiliateFetch<{ products: AffiliateProduct[] }>("/api/affiliate/products");
        if (alive) setProducts(json.products || []);
      } catch (e) {
        console.error("[AFFILIATE] Gagal memuat katalog:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products],
  );

  const list = useMemo(() => {
    let rows = products.filter((p) => {
      if (q && !`${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (price) {
        const [lo, hi] = price.split("-").map(Number);
        if (p.price < lo || p.price > hi) return false;
      }
      if (rate && p.rate < Number(rate)) return false;
      if (avail === "ada" && p.stock === 0) return false;
      if (avail === "habis" && p.stock !== 0) return false;
      return true;
    });

    rows = [...rows];
    if (sortBy === "price-asc") rows.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") rows.sort((a, b) => b.price - a.price);
    else if (sortBy === "rate") rows.sort((a, b) => b.rate - a.rate || b.price - a.price);
    else rows.sort((a, b) => b.estimatedCommission - a.estimatedCommission);
    return rows;
  }, [products, q, cat, price, rate, avail, sortBy]);

  const pg = paginate(list, page, 8);

  const reset = () => {
    setQ("");
    setCat("");
    setPrice("");
    setRate("");
    setAvail("");
    setSortBy("popular");
    setPage(1);
    toast("Filter katalog direset", "info");
  };

  return (
    <div>
      <div className="card">
        <div className="filters">
          <Search value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Cari nama produk…" />
          <Select
            value={cat}
            onChange={(v) => { setCat(v); setPage(1); }}
            options={[["", "Semua Kategori"], ...categories.map((c) => [c, c] as [string, string])]}
          />
          <Select
            value={price}
            onChange={(v) => { setPrice(v); setPage(1); }}
            options={[
              ["", "Semua Harga"],
              ["0-150000", "< Rp150.000"],
              ["150000-300000", "Rp150.000 – Rp300.000"],
              ["300000-9999999", "> Rp300.000"],
            ]}
          />
          <Select
            value={rate}
            onChange={(v) => { setRate(v); setPage(1); }}
            options={[
              ["", "Semua Komisi"],
              ["10", "Komisi ≥ 10%"],
              ["12", "Komisi ≥ 12%"],
              ["14", "Komisi ≥ 14%"],
            ]}
          />
          <Select
            value={avail}
            onChange={(v) => { setAvail(v); setPage(1); }}
            options={[
              ["", "Semua Ketersediaan"],
              ["ada", "Tersedia"],
              ["habis", "Stok Habis"],
            ]}
          />
          <Select
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1); }}
            options={[
              ["popular", "Urutkan: Terpopuler"],
              ["price-asc", "Harga Terendah"],
              ["price-desc", "Harga Tertinggi"],
              ["rate", "Komisi Tertinggi"],
            ]}
          />
          <button className="btn s" onClick={reset} type="button">
            <Icon name="rot" className="sm" />
            Reset Filter
          </button>
        </div>
        <div className="cp small muted" style={{ padding: "12px 16px" }}>
          {loading ? "Memuat katalog…" : `${list.length} produk ditemukan`}
        </div>
      </div>

      {pg.total === 0 ? (
        <div className="card mt">
          <Empty
            icon="bag"
            title="Produk tidak ditemukan"
            text="Tidak ada produk yang cocok dengan filter kamu."
            action={
              <button className="btn s" onClick={reset} type="button">
                Reset Filter
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid g4 mt">
            {pg.rows.map((p) => (
              <div className="card pc" key={p.id}>
                <Link href={`/affiliate/produk/${p.id}`} className="im">
                  {p.image ? (
                    <img src={p.image} alt={p.name} loading="lazy" />
                  ) : null}
                </Link>
                <div className="bd">
                  <div className="small muted">
                    {p.category} · <Badge label={stockLabel(p.stock)} />
                  </div>
                  <div className="nm">{p.name}</div>
                  <div className="pr">{money(p.price)}</div>
                  <div className="cmb">
                    <span>
                      Komisi <b style={{ color: "var(--af-pri)" }}>{p.rate}%</b>
                    </span>
                    <span>
                      ±<b className="dark">{money(p.estimatedCommission)}</b>/terjual
                    </span>
                  </div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <Link
                      href={`/affiliate/produk/${p.id}`}
                      className="btn s sm"
                      style={{ flex: 1 }}
                    >
                      Lihat Detail
                    </Link>
                    <button
                      className="btn p sm"
                      style={{ flex: 1 }}
                      type="button"
                      onClick={() =>
                        open({
                          title: "Buat Tautan Affiliate",
                          body: (
                            <LinkFormModal
                              products={products.map((x) => ({ id: x.id, name: x.name, rate: x.rate }))}
                              initialProductId={p.id}
                            />
                          ),
                        })
                      }
                    >
                      Promosikan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="card mt">
            <Pager page={pg.page} pages={pg.pages} total={pg.total} size={pg.size} onPage={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
