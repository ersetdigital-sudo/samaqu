"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  const barcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchOrder() {
      const { data, error: fetchErr } = await supabase
        .from("orders")
        .select("*, order_items(product_name, color, size, quantity, price, series, kain)")
        .eq("order_number", orderNumber)
        .single();
      if (fetchErr || !data) { setError("Pesanan tidak ditemukan"); setLoading(false); return; }
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
      JsBarcode(svg, order.awb_no!, {
        format: "CODE128",
        width: 2.5,
        height: 50,
        displayValue: true,
        font: "monospace",
        fontSize: 15,
        fontOptions: "bold",
        textMargin: 2,
        margin: 0,
        background: "#FFFFFF",
        lineColor: "#000000",
      });
    });
  }, [order]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>Memuat label...</div>;
  if (error || !order) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "red" }}>{error || "Pesanan tidak ditemukan"}</div>;

  const isCod = order.payment_method === "cod";
  const weightKg = order.weight ? (order.weight / 1000).toFixed(2) : "1.00";
  const itemsSummary = order.order_items
    ? order.order_items.map((i) => `${i.product_name}${i.series ? ` ${i.series}` : ""}${i.kain ? ` (${i.kain})` : ""} ${i.color !== "-" && i.color !== "default" ? i.color : ""} ${i.size} ×${i.quantity}`).join(", ")
    : "-";
  const printDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const serviceLabel = order.shipping_method?.toUpperCase() || "EZ";

  return (
    <>
      <style>{`
        @page { width: 100mm; height: 150mm; margin: 0; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .no-print { display: none !important; }
          .label-wrap { box-shadow: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; background: #e8e8e8; -webkit-font-smoothing: antialiased; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; text-rendering: optimizeLegibility; }
        svg { shape-rendering: crispEdges; }
        @media print {
          svg { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .label-wrap { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .label-wrap * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          @page { size: 100mm 150mm; margin: 0; }
        }
      `}</style>

      <div className="no-print" style={{ padding: "16px", textAlign: "center" }}>
        <button onClick={() => window.print()} style={{ padding: "10px 24px", fontSize: "14px", cursor: "pointer", background: "#333", color: "#fff", border: "none", borderRadius: "6px" }}>
          Cetak Label
        </button>
        <span style={{ marginLeft: "12px", fontSize: "12px", color: "#666" }}>Label 100×150mm</span>
      </div>

      <div className="label-wrap" style={{
        width: "100mm", height: "150mm", margin: "0 auto", background: "#fff",
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

        {/* Pesanan */}
        <div style={{ padding: "2mm 3.5mm", borderBottom: "2px dashed #000" }}>
          <div style={{ display: "inline-block", fontSize: "7.5px", fontWeight: "800", background: "#000", color: "#fff", padding: "0.4mm 2mm", borderRadius: "1mm", marginBottom: "0.8mm" }}>Pesanan</div>
          <div style={{ fontSize: "10px", fontWeight: "700", fontFamily: "'Courier New', Courier, monospace", wordBreak: "break-word" }}>{itemsSummary}</div>
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
    </>
  );
}
