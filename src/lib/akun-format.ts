export const AKUN_STATUS: Record<string, { pill: string; label: string }> = {
  pending: { pill: "akun-pill akun-pill-proses", label: "Diproses" },
  diproses: { pill: "akun-pill akun-pill-proses", label: "Diproses" },
  dikirim: { pill: "akun-pill akun-pill-kirim", label: "Dikirim" },
  selesai: { pill: "akun-pill akun-pill-selesai", label: "Selesai" },
  dibatalkan: { pill: "akun-pill akun-pill-proses", label: "Dibatalkan" },
};

export function statusInfo(status: string) {
  return AKUN_STATUS[status] || AKUN_STATUS.pending;
}

/* ── Halaman struk (detail pesanan & lacak) ──
   Halaman struk pakai label sendiri: pesanan `pending` belum dibayar, jadi statusnya
   "Menunggu Pembayaran" — bukan "Diproses" seperti pill di daftar pesanan. */

export type StrukTone = "wait" | "process" | "ship" | "done" | "cancel";

export const STRUK_STATUS: Record<string, { label: string; tone: StrukTone }> = {
  pending: { label: "Menunggu Pembayaran", tone: "wait" },
  diproses: { label: "Diproses", tone: "process" },
  dikirim: { label: "Dikirim", tone: "ship" },
  selesai: { label: "Selesai", tone: "done" },
  dibatalkan: { label: "Dibatalkan", tone: "cancel" },
};

export function strukStatus(status: string) {
  return STRUK_STATUS[status] || STRUK_STATUS.pending;
}

export type StrukStepState = "done" | "active" | "todo";

export interface StrukStep {
  label: string;
  sub: string;
  state: StrukStepState;
}

/** Langkah pesanan untuk batang status struk; pembayaran jadi langkah kedua. */
export function strukSteps(order: {
  status: string;
  created_at: string;
  updated_at?: string;
  awb_no?: string | null;
}): StrukStep[] {
  const s = order.status;
  if (s === "dibatalkan") {
    return [
      { label: "Pesanan dibuat", sub: tglJamID(order.created_at), state: "done" },
      { label: "Pesanan dibatalkan", sub: order.updated_at ? tglJamID(order.updated_at) : "Dibatalkan", state: "active" },
    ];
  }

  const paid = s !== "pending";
  const processing = s === "diproses" || s === "dikirim" || s === "selesai";
  const shipped = s === "dikirim" || s === "selesai";
  const received = s === "selesai";

  return [
    { label: "Pesanan dibuat", sub: tglJamID(order.created_at), state: "done" },
    {
      label: paid ? "Pembayaran diterima" : "Menunggu Pembayaran",
      sub: paid ? "Pembayaran sudah dikonfirmasi" : "Selesaikan pembayaran",
      state: paid ? "done" : "active",
    },
    {
      label: "Pesanan diproses",
      sub: processing ? "Pesanan sedang disiapkan" : "Menunggu pembayaran",
      state: processing ? (s === "diproses" ? "active" : "done") : "todo",
    },
    {
      label: "Dikirim",
      sub: shipped ? (order.awb_no ? `Resi ${order.awb_no}` : "Sedang dikirim") : "Resi menyusul",
      state: shipped ? (s === "dikirim" ? "active" : "done") : "todo",
    },
    {
      label: "Pesanan diterima",
      sub: received ? "Terima kasih!" : "Estimasi menyusul",
      state: received ? "done" : "todo",
    },
  ];
}

export function rupiah(n: number | null | undefined): string {
  return `Rp${(n || 0).toLocaleString("id-ID")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function tglID(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function tglJamID(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${tglID(iso)} • ${hh}:${mm}`;
}

export function tglPanjangID(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const full = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return `${d.getDate()} ${full[d.getMonth()]} ${d.getFullYear()}`;
}