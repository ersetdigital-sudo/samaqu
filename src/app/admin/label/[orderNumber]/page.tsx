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
  awb_no: string | null;
  status: string;
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

      if (fetchErr || !data) {
        setError("Pesanan tidak ditemukan");
        setLoading(false);
        return;
      }

      setOrder(data);
      setLoading(false);
    }
    fetchOrder();
  }, [orderNumber]);

  useEffect(() => {
    if (!order?.awb_no || !barcodeRef.current) return;

    // Clear previous barcode
    barcodeRef.current.innerHTML = "";

    // Generate barcode using canvas
    const canvas = document.createElement("canvas");
    barcodeRef.current.appendChild(canvas);

    // @ts-ignore
    import("jsbarcode").then((mod) => {
      const JsBarcode = mod.default;
      JsBarcode(canvas, order.awb_no!, {
        format: "CODE128",
        width: 1.8,
        height: 45,
        displayValue: true,
        font: "monospace",
        fontSize: 14,
        fontOptions: "bold",
        textMargin: 2,
        margin: 0,
      });
    });
  }, [order]);

  useEffect(() => {
    if (!loading && order && order.awb_no) {
      // Auto print after render
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, order]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "monospace" }}>
        Memuat label...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "monospace", color: "red" }}>
        {error || "Pesanan tidak ditemukan"}
      </div>
    );
  }

  const isCod = order.payment_method === "cod";
  const itemsSummary = order.order_items
    ? order.order_items.map((i) => `${i.product_name} (${i.color}/${i.size}) x${i.quantity}`).join(", ")
    : "-";

  return (
    <>
      <style>{`
        @page {
          width: 100mm;
          height: 150mm;
          margin: 0;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .label-container { box-shadow: none !important; border: none !important; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Consolas', 'Courier New', monospace; background: #f0f0f0; }
      `}</style>

      <div className="no-print" style={{ padding: "16px", textAlign: "center" }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "10px 24px", fontSize: "14px", cursor: "pointer", background: "#333", color: "#fff", border: "none", borderRadius: "6px" }}
        >
          Cetak Label
        </button>
        <span style={{ marginLeft: "12px", fontSize: "12px", color: "#666" }}>Label Thermal 100x150mm</span>
      </div>

      <div className="label-container" style={{
        width: "100mm",
        height: "150mm",
        margin: "0 auto",
        padding: "4mm",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,.15)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontSize: "9px",
        lineHeight: "1.3",
      }}>
        {/* Header: Pengirim */}
        <div style={{ borderBottom: "1.5px dashed #333", paddingBottom: "2mm", marginBottom: "2mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" }}>SAMAQU</div>
              <div style={{ fontSize: "7px", color: "#666", marginTop: "1px" }}>Jl. Depok, Depok, Jawa Barat</div>
              <div style={{ fontSize: "7px", color: "#666" }}>Telp: +6281234567890</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "8px", fontWeight: "bold", color: "#c8102e", border: "1px solid #c8102e", padding: "1px 4px", borderRadius: "2px" }}>J&T EXPRESS</div>
              <div style={{ fontSize: "7px", marginTop: "2px", fontWeight: "bold" }}>{order.shipping_method}</div>
            </div>
          </div>
        </div>

        {/* Barcode */}
        <div style={{ textAlign: "center", margin: "2mm 0", display: "flex", justifyContent: "center" }}>
          <div ref={barcodeRef} />
        </div>

        {/* Penerima */}
        <div style={{ borderTop: "1.5px dashed #333", paddingTop: "2mm", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "7px", fontWeight: "bold", color: "#666", marginBottom: "1mm", textTransform: "uppercase" }}>Penerima</div>
          <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "1mm" }}>{order.customer_name}</div>
          <div style={{ fontSize: "8px", marginBottom: "1mm" }}>Telp: {order.customer_whatsapp}</div>
          <div style={{ fontSize: "8px", marginBottom: "1.5mm", wordBreak: "break-word" }}>
            {order.shipping_address}, {order.shipping_city} {order.shipping_postal_code || ""}
          </div>
          {order.shipping_notes && (
            <div style={{ fontSize: "7px", color: "#666", fontStyle: "italic", marginBottom: "1mm" }}>
              Catatan: {order.shipping_notes}
            </div>
          )}
        </div>

        {/* Produk */}
        <div style={{ borderTop: "1px solid #ddd", paddingTop: "1.5mm", marginTop: "1mm" }}>
          <div style={{ fontSize: "7px", fontWeight: "bold", color: "#666", marginBottom: "1mm", textTransform: "uppercase" }}>Barang</div>
          {order.order_items?.map((item, i) => (
            <div key={i} style={{ fontSize: "8px", marginBottom: "0.5mm", display: "flex", justifyContent: "space-between" }}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.product_name} {item.kain ? `(${item.kain})` : ""} {item.color !== "-" && item.color !== "default" ? item.color : ""} {item.size} ×{item.quantity}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #ccc", paddingTop: "1.5mm", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            {isCod && (
              <div style={{ fontSize: "10px", fontWeight: "bold", color: "#c8102e" }}>
                COD: Rp {order.total.toLocaleString("id-ID")}
              </div>
            )}
            {!isCod && (
              <div style={{ fontSize: "7px", color: "#666" }}>
                {order.payment_method === "bank" ? "Transfer Bank" : "QRIS"}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "7px", color: "#666" }}>No. Pesanan</div>
            <div style={{ fontSize: "8px", fontWeight: "bold" }}>{order.order_number}</div>
          </div>
        </div>
      </div>
    </>
  );
}
