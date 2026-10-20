/**
 * Channel pembayaran online dari gateway (Mayar).
 *
 * Nilai mentah dari API Mayar berbentuk kode lowercase (`qris`, `va/bni`, `ewallet/gopay`,
 * `outlet/alfamart`). Kode aslinya disimpan apa adanya di `orders.payment_channel` supaya
 * tidak kehilangan detail; label yang dibaca admin dibuat di sini.
 */

const LABELS: Record<string, string> = {
  qris: "QRIS",
  qris_static: "QRIS",
  "va/bca": "BCA Virtual Account",
  "va/bni": "BNI Virtual Account",
  "va/bri": "BRI Virtual Account",
  "va/mandiri": "Mandiri Virtual Account",
  "va/cimb": "CIMB Niaga Virtual Account",
  "va/permata": "Permata Virtual Account",
  "va/bjb": "BJB Virtual Account",
  "va/bsi": "BSI Virtual Account",
  "ewallet/dana": "DANA",
  "ewallet/gopay": "GoPay",
  "ewallet/linkaja": "LinkAja",
  "ewallet/shopeepay": "ShopeePay",
  "ewallet/jenius": "Jenius",
  "ewallet/jeniuspay": "Jenius",
  "outlet/alfamart": "Alfamart",
  "outlet/indomaret": "Indomaret",
};

export function normalizePaymentChannel(raw?: string | null): string {
  return String(raw ?? "").trim().toLowerCase();
}

const pretty = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

/** Label channel untuk ditampilkan; "" kalau belum diketahui. */
export function paymentChannelLabel(raw?: string | null): string {
  const code = normalizePaymentChannel(raw);
  if (!code) return "";
  const known = LABELS[code];
  if (known) return known;

  // Kode baru yang belum ada di daftar: tetap tampilkan dalam bentuk yang terbaca,
  // jangan sampai detail pembayaran hilang hanya karena pemetaannya belum ditambah.
  const [group, name] = code.split("/");
  if (name) return group === "va" ? `${pretty(name)} Virtual Account` : pretty(name);
  return pretty(group);
}
