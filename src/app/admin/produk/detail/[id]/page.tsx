"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Package, TrendingUp, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { colorMap } from "@/lib/katalog-data";
import AdminShell from "@/components/AdminShell";

interface ProductData {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  colors: string[];
}

interface Variant {
  color: string;
  size: string;
  stock: number;
  price_override: number | null;
  sku: string | null;
}

interface ProductImage {
  url: string;
  is_video: boolean;
  color: string;
  display_order: number;
}

interface OrderItem {
  order_id: string;
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  orders: {
    order_number: string;
    customer_name: string;
    status: string;
    created_at: string;
    total: number;
  };
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeColor, setActiveColor] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, varRes, imgRes, ordersRes] = await Promise.all([
          supabase.from("products").select("*").eq("id", id).single(),
          supabase.from("product_variants").select("*").eq("product_id", id),
          supabase.from("product_images").select("*").eq("product_id", id).order("display_order"),
          supabase.from("order_items").select("*, orders(order_number, customer_name, status, created_at, total)").eq("product_id", id).order("created_at", { referencedTable: "orders", ascending: false }).limit(20),
        ]);

        if (prodRes.data) setProduct(prodRes.data);
        if (varRes.data) {
          setVariants(varRes.data);
          setActiveColor(varRes.data[0]?.color || null);
        }
        if (imgRes.data) setImages(imgRes.data);
        if (ordersRes.data) setOrderItems(ordersRes.data as unknown as OrderItem[]);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <AdminShell><section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,183,156,.3)", borderTopColor: "var(--gold)" }} /></section></AdminShell>;
  }

  if (!product) {
    return <AdminShell><section className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><p>Produk tidak ditemukan</p></section></AdminShell>;
  }

  const uniqueColors = [...new Set(variants.map((v) => v.color))];
  const colorVariants = variants.filter((v) => v.color === activeColor);
  const colorImages = images.filter((img) => img.color === activeColor);
  const totalSold = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const lowStockVariants = variants.filter((v) => v.stock > 0 && v.stock < 5);

  return (
    <AdminShell>
    <section className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(248,245,241,.8)", borderBottom: "1px solid rgba(64,50,37,.06)" }}>
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-tertiary)]" style={{ color: "var(--espresso)" }}><ArrowLeft size={20} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl italic leading-none truncate" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", color: "var(--espresso)" }}>{product.name}</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{product.category}</p>
          </div>
          <a href={`/admin/produk/edit/${product.id}`} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--gold)" }}>
            <Edit size={16} /> Edit
          </a>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Harga</p>
            <p className="text-xl font-bold mt-1" style={{ color: "var(--espresso)" }}>Rp {product.price.toLocaleString("id-ID")}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Stok</p>
            <p className="text-xl font-bold mt-1" style={{ color: totalStock < 10 ? "#e74c3c" : "var(--espresso)" }}>{totalStock}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Terjual</p>
            <p className="text-xl font-bold mt-1" style={{ color: "var(--gold)" }}>{totalSold}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Varian Warna</p>
            <p className="text-xl font-bold mt-1" style={{ color: "var(--espresso)" }}>{uniqueColors.length}</p>
          </div>
        </div>

        {/* Color tabs + Variants table */}
        <div className="card p-5">
          <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Varian & Stok</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {uniqueColors.map((color) => (
              <button key={color} onClick={() => setActiveColor(color)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{ background: activeColor === color ? "var(--espresso)" : "transparent", color: activeColor === color ? "var(--cream)" : "var(--coffee)", border: `1px solid ${activeColor === color ? "var(--espresso)" : "rgba(201,183,156,.3)"}` }}>
                <span className="w-3 h-3 rounded-full" style={{ background: colorMap[color] || "#ccc", border: "1px solid rgba(42,33,27,.1)" }} />
                {color}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                  <th className="font-medium px-4 py-3 text-left">Ukuran</th>
                  <th className="font-medium px-4 py-3 text-left">Stok</th>
                  <th className="font-medium px-4 py-3 text-left">Harga Override</th>
                  <th className="font-medium px-4 py-3 text-left">SKU</th>
                  <th className="font-medium px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {colorVariants.map((v, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}>
                    <td className="px-4 py-3 font-semibold">{v.size}</td>
                    <td className="px-4 py-3" style={{ color: v.stock === 0 ? "#e74c3c" : v.stock < 5 ? "#8a6f42" : "var(--espresso)", fontWeight: v.stock < 5 ? 600 : 400 }}>{v.stock}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{v.price_override ? `Rp ${v.price_override.toLocaleString("id-ID")}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>{v.sku || "-"}</td>
                    <td className="px-4 py-3">
                      {v.stock === 0 ? <span className="badge" style={{ background: "#fde8e8", color: "#e74c3c" }}>Habis</span>
                        : v.stock < 5 ? <span className="badge" style={{ background: "#fef3cd", color: "#8a6f42" }}>Menipis</span>
                        : <span className="badge" style={{ background: "#e7ecdf", color: "#5b6b45" }}>Tersedia</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Media gallery */}
        <div className="card p-5">
          <h2 className="font-serif italic text-xl mb-4" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Media ({activeColor})</h2>
          {colorImages.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Tidak ada media untuk warna ini</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {colorImages.map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ background: "#e8dfd1" }}>
                  {img.is_video ? (
                    <video src={img.url} className="w-full h-full object-cover" muted loop playsInline onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }} />
                  ) : (
                    <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order history */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: "rgba(64,50,37,.06)" }}>
            <h2 className="font-serif italic text-xl" style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>Riwayat Pesanan</h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{orderItems.length} pesanan ditemukan</p>
          </div>
          {orderItems.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Belum ada pesanan untuk produk ini</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                    <th className="font-medium px-4 py-3 text-left">Order</th>
                    <th className="font-medium px-4 py-3 text-left">Pelanggan</th>
                    <th className="font-medium px-4 py-3 text-left">Varian</th>
                    <th className="font-medium px-4 py-3 text-left">Qty</th>
                    <th className="font-medium px-4 py-3 text-left">Total</th>
                    <th className="font-medium px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, i) => (
                    <tr key={i} style={{ borderTop: "1px solid rgba(64,50,37,.06)" }}>
                      <td className="px-4 py-3 font-semibold">{item.orders?.order_number || "-"}</td>
                      <td className="px-4 py-3">{item.orders?.customer_name || "-"}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{item.color} / {item.size}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3 font-semibold">{item.orders?.total ? `Rp ${item.orders.total.toLocaleString("id-ID")}` : "-"}</td>
                      <td className="px-4 py-3">
                        <span className="badge" style={{ background: item.orders?.status === "selesai" ? "#e7ecdf" : item.orders?.status === "pending" ? "#f0ebe5" : "#f0e7d8", color: item.orders?.status === "selesai" ? "#5b6b45" : item.orders?.status === "pending" ? "#6b5d50" : "#8a6f42" }}>
                          {item.orders?.status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`.card { background: #fffdfb; border: 1px solid rgba(64,50,37,.06); border-radius: 1rem; box-shadow: 0 1px 2px rgba(64,50,37,.03); } .badge { font-size: .72rem; font-weight: 600; padding: .2rem .6rem; border-radius: 999px; white-space: nowrap; }`}</style>
    </section>
    </AdminShell>
  );
}
