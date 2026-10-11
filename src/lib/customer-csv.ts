/**
 * CSV daftar pelanggan (Nama, No WA, Tanggal Lahir) untuk panel admin.
 *
 * Dipisah dari komponennya supaya logikanya bisa diuji langsung lewat Node
 * (`node --experimental-strip-types src/lib/customer-csv.ts`), bukan cuma dilihat
 * di layar — file ini sengaja bebas dari JSX/React.
 */

export interface CsvCustomer {
  name: string;
  whatsapp?: string | null;
  birthDate?: string | null;
}

/**
 * No WA ditulis sebagai teks `+62 852-9995-4529`.
 *
 * Excel mengubah angka panjang (mis. `85299954529`) jadi notasi ilmiah `8,52999E+10`
 * dan memotong tampilannya, sedangkan teks bertanda `+`/`-` dibiarkan apa adanya —
 * sekaligus bikin panjang tiap baris seragam. Angka aslinya tidak diubah, cuma
 * dirapikan: awalan `62`/`0` dibuang dulu sebelum diberi awalan `+62`.
 */
export function formatWhatsapp(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const local = (digits.startsWith("62") ? digits.slice(2) : digits).replace(/^0+/, "");
  if (!local) return "";
  const parts = local.length > 7
    ? [local.slice(0, 3), local.slice(3, 7), local.slice(7)]
    : local.length > 3
      ? [local.slice(0, 3), local.slice(3)]
      : [local];
  return `+62 ${parts.filter(Boolean).join("-")}`;
}

/** Sel CSV: selalu dikutip, tanda kutip di dalam di-escape. */
function cell(v: string) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/** Baris CSV siap ditulis — tanggal lahir tetap `YYYY-MM-DD` supaya bisa diurutkan di Excel. */
export function customersToCsv(rows: CsvCustomer[]): string {
  const lines = [["Nama", "No WA", "Tanggal Lahir"].map(cell).join(",")];
  for (const c of rows) {
    lines.push([c.name, formatWhatsapp(c.whatsapp), c.birthDate || ""].map(cell).join(","));
  }
  // BOM di depan supaya Excel membaca UTF-8 dengan benar.
  return "\uFEFF" + lines.join("\r\n");
}
