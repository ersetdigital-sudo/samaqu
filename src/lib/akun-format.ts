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