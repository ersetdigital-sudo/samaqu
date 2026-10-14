"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchPaymentMethodById, isPaymentMethodId, legacyPaymentType, normalizeMethodType } from "@/lib/payment-methods";

interface OrderData {
  order_number: string;
  customer_name: string;
  customer_whatsapp: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_notes: string;
  shipping_method: string;
  shipping_cost: number;
  payment_method: string;
  total: number;
  weight: number | null;
  awb_no: string | null;
  status: string;
  created_at: string;
  order_items?: { product_name: string; color: string; size: string; series?: string | null; kain?: string | null; quantity: number; price: number }[];
}

export default function LabelPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<string | null>(null);
  // Ukuran label yang dipilih: "100x150" (desain existing) atau "78x100" (format baru).
  const [size, setSize] = useState<"100x150" | "78x100">("100x150");
  const LABEL_SIZES = {
    "100x150": { w: 100, h: 150, label: "100 × 150 mm" },
    "78x100": { w: 78, h: 100, label: "78 × 100 mm" },
  } as const;
  const dims = LABEL_SIZES[size];
  const barcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchOrder() {
      const { data, error: fetchErr } = await supabase
        .from("orders")
        .select("*, order_items(product_id, product_name, color, size, quantity, price, series, kain)")
        .eq("order_number", orderNumber)
        .single();
      if (fetchErr || !data) { setError("Pesanan tidak ditemukan"); setLoading(false); return; }

      // If weight is null (old order), calculate from order items + products
      if (!data.weight && data.order_items && data.order_items.length > 0) {
        const productIds = [...new Set(data.order_items.map((item: any) => item.product_id).filter(Boolean))];
        if (productIds.length > 0) {
          const { data: products } = await supabase.from("products").select("id, weight, category").in("id", productIds);
          const weightMap: Record<string, number> = {};
          const defaultWeights: Record<string, number> = { Thobe: 800, Kandora: 600, Koko: 500, Vest: 400, "Cover Thobe": 300, Kabak: 700 };
          for (const p of products || []) {
            weightMap[p.id] = p.weight || defaultWeights[p.category] || 800;
          }
          let totalGrams = 0;
          for (const item of data.order_items) {
            totalGrams += (weightMap[item.product_id] || 800) * item.quantity;
          }
          data.weight = Math.max(300, totalGrams);
        }
      }

      // Metode pembayaran: pesanan baru simpan id metode, pesanan lama simpan 'bank'/'qris'/'cod'
      if (isPaymentMethodId(data.payment_method)) {
        const pm = await fetchPaymentMethodById(data.payment_method);
        setPaymentType(pm ? normalizeMethodType(pm.method_type) : null);
      } else {
        setPaymentType(legacyPaymentType(data.payment_method));
      }

      setOrder(data);
      setLoading(false);
    }
    fetchOrder();
  }, [orderNumber]);

  useEffect(() => {
    if (!order?.awb_no || !barcodeRef.current) return;
    barcodeRef.current.innerHTML = "";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    barcodeRef.current.appendChild(svg);
    // @ts-ignore
    import("jsbarcode").then((mod) => {
      const JsBarcode = mod.default;
      const base = {
        format: "CODE128",
        height: size === "78x100" ? 38 : 50,
        displayValue: true,
        font: "monospace",
        fontSize: size === "78x100" ? 12 : 15,
        fontOptions: "bold",
        textMargin: 2,
        margin: 0,
        background: "#FFFFFF",
        lineColor: "#000000",
      };
      if (size === "78x100") {
        // Label 100x150 punya lebar 2.5px/bar dan muat; label 78mm TIDAK — lebar bar
        // dihitung dari lebar area cetak sebenarnya (78mm dikurangi padding kiri-kanan
        // 2.5mm) supaya barcode berada penuh di dalam label, tidak terpotong.
        const availPx = ((dims.w - 5) / 25.4) * 96;
        JsBarcode(svg, order.awb_no!, { ...base, width: 1 });
        const measured = Number(svg.getAttribute("width")) || svg.getBoundingClientRect().width || 0;
        const barWidth = measured > 0 ? Math.min(2.5, (availPx * 0.98) / measured) : 1.5;
        JsBarcode(svg, order.awb_no!, { ...base, width: barWidth });
      } else {
        JsBarcode(svg, order.awb_no!, { ...base, width: 2.5 });
      }
    });
  }, [order, size]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>Memuat label...</div>;
  if (error || !order) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "red" }}>{error || "Pesanan tidak ditemukan"}</div>;

  const isCod = paymentType === "cod";
  const weightKg = order.weight ? (order.weight / 1000).toFixed(2) : "1.00";
  const printDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const serviceLabel = order.shipping_method?.toUpperCase() || "EZ";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; background: #e8e8e8; -webkit-font-smoothing: antialiased; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; text-rendering: optimizeLegibility; }
        svg { shape-rendering: crispEdges; }
        /* Ukuran halaman mengikuti pilihan label (100×150 atau 78×100). */
        @page { size: ${dims.w}mm ${dims.h}mm; margin: 0; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .no-print { display: none !important; }
          .label-wrap { box-shadow: none !important; }
          .label-wrap, .label-wrap * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          svg { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="no-print" style={{ padding: "16px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", border: "1px solid #c8c8c8", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
          {(["100x150", "78x100"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSize(k)}
              style={{
                padding: "9px 18px", fontSize: "13px", cursor: "pointer", border: "none",
                background: size === k ? "#333" : "#fff", color: size === k ? "#fff" : "#333",
                fontWeight: size === k ? 700 : 500,
              }}
            >
              {LABEL_SIZES[k].label}
            </button>
          ))}
        </div>
        <div>
          <button onClick={() => window.print()} style={{ padding: "10px 24px", fontSize: "14px", cursor: "pointer", background: "#333", color: "#fff", border: "none", borderRadius: "6px" }}>
            Cetak Label
          </button>
          <span style={{ marginLeft: "12px", fontSize: "12px", color: "#666" }}>Label {dims.label}</span>
        </div>
      </div>

      {size === "100x150" ? (
      <div className="label-wrap" style={{
        width: "100mm", minHeight: "150mm", margin: "0 auto", background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,.15)", display: "flex", flexDirection: "column",
        overflow: "hidden", fontSize: "9px", lineHeight: "1.3", color: "#000",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "3mm 3.5mm 2mm", borderBottom: "2.5px solid #000" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "2px" }}>SAMAQU</div>
            <div style={{ fontSize: "7px", color: "#333", marginTop: "0.5px" }}>@samaqu.id | 0812-3456-7890</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: "900" }}>J&T <span style={{ fontSize: "9px", fontWeight: "400" }}>EXPRESS</span></div>
            <div style={{ marginTop: "1px" }}>
              <span style={{ fontSize: "7.5px", fontWeight: "700", background: "#000", color: "#fff", padding: "0.4mm 2mm", borderRadius: "1.2mm" }}>{serviceLabel}</span>
              <span style={{ fontSize: "7px", marginLeft: "2px", fontWeight: "600" }}>REGULAR SERVICE</span>
            </div>
          </div>
        </div>

        {/* Barcode */}
        <div style={{ textAlign: "center", padding: "2mm 3.5mm", borderBottom: "1.5px solid #ddd", display: "flex", justifyContent: "center" }}>
          <div ref={barcodeRef} style={{ lineHeight: 0 }} />
        </div>

        {/* Penerima */}
        <div style={{ padding: "2mm 3.5mm", border: "2px solid #000", margin: "1.5mm 3.5mm", borderRadius: "1.5mm" }}>
          <div style={{ display: "inline-block", fontSize: "7.5px", fontWeight: "800", background: "#000", color: "#fff", padding: "0.4mm 2mm", borderRadius: "1mm", marginBottom: "1.5mm", textTransform: "uppercase" }}>Penerima</div>
          <div style={{ fontSize: "14px", fontWeight: "800", marginBottom: "1mm" }}>{order.customer_name}</div>
          <div style={{ fontSize: "10px", fontWeight: "700", marginBottom: "1mm" }}>{order.customer_whatsapp}</div>
          <div style={{ fontSize: "9px", fontWeight: "600", wordBreak: "break-word", lineHeight: "1.35" }}>
            {order.shipping_address}, {order.shipping_city}{order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ""}
          </div>
        </div>

        {/* ISI KIRIMAN + BERAT */}
        <div style={{ display: "flex", margin: "0 3.5mm", borderTop: "2px dashed #000", borderBottom: "2px dashed #000" }}>
          <div style={{ flex: 1, padding: "1.5mm 3mm 1.5mm 0", borderRight: "2px dashed #000" }}>
            <div style={{ display: "inline-block", fontSize: "7.5px", fontWeight: "800", background: "#000", color: "#fff", padding: "0.4mm 2mm", borderRadius: "1mm", marginBottom: "0.8mm" }}>Isi Kiriman</div>
            <div style={{ fontSize: "10px", fontWeight: "700" }}>Pakaian</div>
          </div>
          <div style={{ flex: 1, padding: "1.5mm 0 1.5mm 3mm" }}>
            <div style={{ display: "inline-block", fontSize: "7.5px", fontWeight: "800", background: "#000", color: "#fff", padding: "0.4mm 2mm", borderRadius: "1mm", marginBottom: "0.8mm" }}>Berat</div>
            <div style={{ fontSize: "10px", fontWeight: "700" }}>{weightKg} KG</div>
          </div>
        </div>

        {/* Pesanan — satu blok per item (nama tebal + baris varian/ukuran/qty) */}
        <div style={{ padding: "1.6mm 3.5mm", borderBottom: "2px dashed #000" }}>
          <div style={{ display: "inline-block", fontSize: "7.5px", fontWeight: "800", background: "#000", color: "#fff", padding: "0.4mm 2mm", borderRadius: "1mm", marginBottom: "0.5mm" }}>Pesanan</div>
          <div>
            {(order.order_items || []).map((it, i) => {
              const rawColor = it.color && it.color !== "default" && it.color !== "-" ? it.color : "";
              const showColor = rawColor && !it.product_name.toLowerCase().includes(rawColor.toLowerCase());
              const meta = [
                it.kain ? `Varian: ${it.kain}` : null,
                showColor ? `Warna: ${rawColor}` : null,
                it.size ? `Ukuran: ${it.size}` : null,
                `Qty: ${it.quantity}`,
              ].filter(Boolean).join(" · ");
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "1.2mm",
                    alignItems: "flex-start",
                    paddingTop: i > 0 ? "0.9mm" : "0.3mm",
                    marginTop: i > 0 ? "0.9mm" : 0,
                    borderTop: i > 0 ? "0.6px dotted #999" : "none",
                  }}
                >
                  <span style={{ fontSize: "9px", fontWeight: "800", lineHeight: "1.2", minWidth: "3.2mm" }}>{i + 1}.</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", lineHeight: "1.2", wordBreak: "break-word" }}>
                      {it.product_name}{it.series ? ` ${it.series}` : ""}
                    </div>
                    <div style={{ fontSize: "8px", fontWeight: "600", color: "#222", lineHeight: "1.25", marginTop: "0.3mm", wordBreak: "break-word" }}>
                      {meta}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", margin: "0 3.5mm", borderBottom: "2px solid #000" }}>
          <div style={{ padding: "1.5mm 3mm 1.5mm 0", borderRight: "1.5px solid #000" }}>
            <div style={{ fontSize: "7px", fontWeight: "700", color: "#333", textTransform: "uppercase", letterSpacing: "0.3px" }}>Order ID</div>
            <div style={{ fontSize: "9px", fontWeight: "800", fontFamily: "'Courier New', monospace" }}>{order.order_number}</div>
          </div>
          <div style={{ padding: "1.5mm 0 1.5mm 3mm" }}>
            <div style={{ fontSize: "7px", fontWeight: "700", color: "#333", textTransform: "uppercase", letterSpacing: "0.3px" }}>Layanan</div>
            <div style={{ fontSize: "9px", fontWeight: "800" }}>{serviceLabel} / Regular Service</div>
          </div>
          <div style={{ padding: "1.5mm 3mm 1.5mm 0", borderRight: "1.5px solid #000", borderTop: "1.5px solid #000" }}>
            <div style={{ fontSize: "7px", fontWeight: "700", color: "#333", textTransform: "uppercase", letterSpacing: "0.3px" }}>Biaya (Ongkir)</div>
            <div style={{ fontSize: "9px", fontWeight: "800" }}>Rp {order.shipping_cost.toLocaleString("id-ID")}</div>
          </div>
          <div style={{ padding: "1.5mm 0 1.5mm 3mm", borderTop: "1.5px solid #000" }}>
            <div style={{ fontSize: "7px", fontWeight: "700", color: "#333", textTransform: "uppercase", letterSpacing: "0.3px" }}>Tanggal Cetak</div>
            <div style={{ fontSize: "9px", fontWeight: "800" }}>{printDate}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "2mm 3.5mm", display: "flex", alignItems: "center", gap: "1.5mm", marginTop: "auto" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div style={{ fontSize: "7px", fontWeight: "600", color: "#000", lineHeight: "1.25" }}>Pastikan label ditempel pada paket dengan rapi dan tidak terlipet agar barcode dapat terbaca dengan baik.</div>
        </div>
      </div>
      ) : (
      <div className="label-wrap label-wrap--78" style={{
        width: "78mm", margin: "0 auto", background: "#fff",
        display: "flex", flexDirection: "column",
        fontSize: "8px", lineHeight: "1.25", color: "#000",
      }}>
        {/* Header ringkas — nama toko + layanan J&T sebaris */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.1mm 2.5mm 0.9mm", borderBottom: "2px solid #000" }}>
          <div style={{ fontSize: "12px", fontWeight: "900", letterSpacing: "1px" }}>SAMAQU</div>
          <div style={{ textAlign: "right", lineHeight: "1.12" }}>
            <div style={{ fontSize: "8px", fontWeight: "900" }}>J&amp;T <span style={{ fontSize: "6px", fontWeight: "400" }}>EXPRESS</span></div>
            <div style={{ fontSize: "6px", fontWeight: "700", marginTop: "0.1mm" }}>{serviceLabel} · REGULAR SERVICE</div>
          </div>
        </div>

        {/* Barcode + nomor resi */}
        <div style={{ textAlign: "center", padding: "1mm 2.5mm", borderBottom: "1.5px solid #000", display: "flex", justifyContent: "center" }}>
          <div ref={barcodeRef} style={{ lineHeight: 0 }} />
        </div>

        {/* Penerima */}
        <div style={{ padding: "1.1mm 2.5mm", border: "1.5px solid #000", margin: "1mm 2.5mm", borderRadius: "1mm" }}>
          <div style={{ display: "inline-block", fontSize: "6px", fontWeight: "800", background: "#000", color: "#fff", padding: "0.25mm 1.5mm", borderRadius: "0.8mm", marginBottom: "0.6mm", textTransform: "uppercase" }}>Penerima</div>
          <div style={{ fontSize: "11px", fontWeight: "800", lineHeight: "1.15", wordBreak: "break-word" }}>{order.customer_name}</div>
          <div style={{ fontSize: "9px", fontWeight: "700", marginTop: "0.3mm" }}>{order.customer_whatsapp}</div>
          <div style={{ fontSize: "8px", fontWeight: "600", marginTop: "0.3mm", lineHeight: "1.2", wordBreak: "break-word" }}>
            {order.shipping_address}, {order.shipping_city}{order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ""}
          </div>
        </div>

        {/* Isi kiriman + berat */}
        <div style={{ display: "flex", margin: "0 2.5mm", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000" }}>
          <div style={{ flex: 1, padding: "0.7mm 2mm 0.7mm 0", borderRight: "1px solid #000" }}>
            <div style={{ fontSize: "6px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.3px" }}>Isi Kiriman</div>
            <div style={{ fontSize: "8.5px", fontWeight: "700", marginTop: "0.2mm" }}>Pakaian</div>
          </div>
          <div style={{ flex: 1, padding: "0.7mm 0 0.7mm 2mm" }}>
            <div style={{ fontSize: "6px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.3px" }}>Berat</div>
            <div style={{ fontSize: "8.5px", fontWeight: "700", marginTop: "0.2mm" }}>{weightKg} KG</div>
          </div>
        </div>

        {/* Pesanan — daftar ringkas, tinggi menyesuaikan jumlah item */}
        <div style={{ padding: "1mm 2.5mm", borderBottom: "1.5px solid #000" }}>
          <div style={{ fontSize: "6px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "0.4mm" }}>Pesanan</div>
          {(order.order_items || []).map((it, i) => {
            const rawColor = it.color && it.color !== "default" && it.color !== "-" ? it.color : "";
            const showColor = rawColor && !it.product_name.toLowerCase().includes(rawColor.toLowerCase());
            const meta = [
              it.kain ? `Varian: ${it.kain}` : null,
              showColor ? `Warna: ${rawColor}` : null,
              it.size ? `Ukuran: ${it.size}` : null,
              `Qty: ${it.quantity}`,
            ].filter(Boolean).join(" · ");
            return (
              <div
                key={i}
                style={{
                  display: "flex", gap: "1mm", alignItems: "flex-start",
                  paddingTop: i > 0 ? "0.5mm" : "0.15mm", marginTop: i > 0 ? "0.5mm" : 0,
                  borderTop: i > 0 ? "0.5px dotted #999" : "none",
                }}
              >
                <span style={{ fontSize: "8px", fontWeight: "800", lineHeight: "1.15", minWidth: "2.4mm" }}>{i + 1}.</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "8px", fontWeight: "800", lineHeight: "1.15", wordBreak: "break-word" }}>
                    {it.product_name}{it.series ? ` ${it.series}` : ""}
                  </div>
                  <div style={{ fontSize: "6.5px", fontWeight: "600", color: "#222", lineHeight: "1.15", marginTop: "0.15mm", wordBreak: "break-word" }}>
                    {meta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", margin: "0 2.5mm" }}>
          <div style={{ padding: "0.8mm 2mm 0.8mm 0", borderRight: "1px solid #000", borderBottom: "1.5px solid #000" }}>
            <div style={{ fontSize: "5.5px", fontWeight: "700", color: "#333", textTransform: "uppercase", letterSpacing: "0.3px" }}>Order ID</div>
            <div style={{ fontSize: "7.5px", fontWeight: "800", fontFamily: "'Courier New', monospace", wordBreak: "break-all" }}>{order.order_number}</div>
          </div>
          <div style={{ padding: "0.8mm 0 0.8mm 2mm", borderBottom: "1.5px solid #000" }}>
            <div style={{ fontSize: "5.5px", fontWeight: "700", color: "#333", textTransform: "uppercase", letterSpacing: "0.3px" }}>Layanan</div>
            <div style={{ fontSize: "7.5px", fontWeight: "800" }}>{serviceLabel} / Regular</div>
          </div>
          <div style={{ padding: "0.8mm 2mm 0.8mm 0", borderRight: "1px solid #000" }}>
            <div style={{ fontSize: "5.5px", fontWeight: "700", color: "#333", textTransform: "uppercase", letterSpacing: "0.3px" }}>Biaya (Ongkir)</div>
            <div style={{ fontSize: "7.5px", fontWeight: "800" }}>Rp {order.shipping_cost.toLocaleString("id-ID")}</div>
          </div>
          <div style={{ padding: "0.8mm 0 0.8mm 2mm" }}>
            <div style={{ fontSize: "5.5px", fontWeight: "700", color: "#333", textTransform: "uppercase", letterSpacing: "0.3px" }}>Tanggal Cetak</div>
            <div style={{ fontSize: "7.5px", fontWeight: "800" }}>{printDate}</div>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
