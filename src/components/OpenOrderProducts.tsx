"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getProducts } from "@/lib/db";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { getProductThumbnail } from "@/lib/product-thumbnail";
import { colorMap, type Product } from "@/lib/katalog-data";
import { OPEN_ORDER_ADDON, OPEN_ORDER_PRODUCTS, type OpenOrderProduct } from "@/lib/open-order-config";
import { useSafeTranslations } from "@/lib/safe-i18n";

const money = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

/** Series dengan harga sama digabung supaya daftar harga tetap ringkas. */
function priceTiers(product: OpenOrderProduct) {
  return product.series.reduce<{ price: number; names: string[] }[]>((tiers, series) => {
    const last = tiers[tiers.length - 1];
    if (last && last.price === series.price) last.names.push(series.name);
    else tiers.push({ price: series.price, names: [series.name] });
    return tiers;
  }, []);
}

/**
 * Cari produk katalog (tabel `products`) yang jadi acuan tampilan detail:
 * - thobe: kode kain (jenis_kain) + warna ready stock di config,
 * - vest: tidak punya kode kain, jadi dicocokkan lewat nama produk.
 */
function catalogMatches(product: OpenOrderProduct, catalog: Product[]): Product[] {
  return catalog.filter((item) => {
    if (product.kain) {
      if ((item.jenis_kain?.name ?? item.kain) !== product.kain) return false;
      const name = item.name.toLowerCase();
      return product.colors.some((color) => name.endsWith(color.toLowerCase()));
    }
    return item.name.toLowerCase() === product.name.toLowerCase();
  });
}

function ProductCard({
  product,
  matches,
  t,
}: {
  product: OpenOrderProduct;
  matches: Product[];
  t: ReturnType<typeof useSafeTranslations>;
}) {
  // Baris terlama dipakai sebagai acuan: harganya paling dekat dengan harga Open Order.
  const primary = matches[0];
  const image = primary ? getProductThumbnail(primary) : "";
  const tiers = priceTiers(product);

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-[26px] bg-white transition-all duration-300 hover:-translate-y-1.5"
      style={{ border: "1px solid rgba(42,33,27,.07)", boxShadow: "0 2px 14px -10px rgba(42,33,27,.45)" }}
    >
      {/* Foto produk dari katalog */}
      <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "linear-gradient(150deg,#efe5d8,#d9c9b4)" }}>
        {image ? (
          <img
            src={cloudinaryUrl(image, { width: 700 })}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#3a2c22,#241a14)" }} />
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{ background: "linear-gradient(to top, rgba(18,12,8,.85), rgba(18,12,8,0))" }}
        />
        <span
          className="absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] font-ui"
          style={{ background: "rgba(255,255,255,.88)", color: "var(--espresso)" }}
        >
          {product.kain ? `${t("priceFabric")} ${product.kain}` : product.name}
        </span>
        <h3
          className="absolute bottom-4 left-5 right-5 text-[26px] font-light leading-tight text-white"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
        >
          {product.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Warna ready stock */}
        <p className="text-[10px] tracking-[0.18em] uppercase font-ui" style={{ color: "var(--text-muted)" }}>
          {t("priceColors")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          {product.colors.map((color) => (
            <span key={color} className="inline-flex items-center gap-1.5 text-[12px] font-ui" style={{ color: "var(--text-secondary)" }}>
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ background: colorMap[color] ?? "#c9b79c", boxShadow: "inset 0 -2px 3px rgba(0,0,0,.15), 0 0 0 1px rgba(42,33,27,.12)" }}
              />
              {color}
            </span>
          ))}
        </div>

        {/* Detail dari katalog */}
        {primary?.weight ? (
          <p className="mt-3 text-[11.5px] font-ui" style={{ color: "var(--text-muted)" }}>
            {t("detailWeight")} {primary.weight.toLocaleString("id-ID")} g
          </p>
        ) : null}

        {/* Harga per series */}
        <p className="mt-6 text-[10px] tracking-[0.18em] uppercase font-ui" style={{ color: "var(--text-muted)" }}>
          {t("pricePerSeries")}
        </p>
        <div className="mt-1">
          {tiers.map((tier, index) => (
            <div
              key={tier.price}
              className="flex items-baseline justify-between gap-4 py-2.5"
              style={{ borderTop: index === 0 ? "none" : "1px dashed rgba(42,33,27,.12)" }}
            >
              <span className="text-[13px] font-ui" style={{ color: "var(--text-secondary)" }}>
                {tier.names.join(" · ")}
              </span>
              <span className="text-[15px] font-semibold font-ui whitespace-nowrap" style={{ color: "var(--gold)" }}>
                {money(tier.price)}
              </span>
            </div>
          ))}
        </div>

        {primary && (
          <div className="mt-auto pt-5">
            <Link
              href={`/katalog/${primary.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[12.5px] font-ui transition-colors duration-200 hover:bg-[var(--espresso)] hover:text-white"
              style={{ border: "1px solid var(--espresso)", color: "var(--espresso)" }}
            >
              {t("detailCta")} <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

/** Daftar produk Open Order — harga dari config, foto & detail dari katalog. */
export default function OpenOrderProducts() {
  const t = useSafeTranslations("openOrder");
  const [catalog, setCatalog] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    getProducts()
      .then((products) => {
        if (active) setCatalog(products);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(
    () => OPEN_ORDER_PRODUCTS.map((product) => ({ product, matches: catalogMatches(product, catalog) })),
    [catalog]
  );

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ product, matches }) => (
          <ProductCard key={product.id} product={product} matches={matches} t={t} />
        ))}
      </div>

      {/* Cover & Hanger */}
      <div
        className="mt-6 flex flex-col gap-2 rounded-[26px] bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ border: "1px dashed rgba(181,140,74,.45)" }}
      >
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase font-ui" style={{ color: "var(--gold)" }}>
            {t("addonTitle")}
          </p>
          <p className="mt-1.5 text-[13.5px] font-ui" style={{ color: "var(--text-secondary)" }}>
            {t("priceNone")}
          </p>
        </div>
        <p className="text-[13.5px] font-ui" style={{ color: "var(--espresso)" }}>
          {t("priceExtra")}{" "}
          <strong className="whitespace-nowrap" style={{ color: "var(--gold)" }}>
            +{money(OPEN_ORDER_ADDON.price)}
          </strong>
        </p>
      </div>
    </>
  );
}
