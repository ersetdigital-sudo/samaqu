/**
 * Tools (function calling) untuk live chat AI SAMAQU.
 *
 * Harga & stok TIDAK dihafal model — setiap kali butuh, model memanggil tool ini dan
 * datanya diambil langsung dari database. Ini yang membuat jawaban akurat dan tidak
 * mengarang. Modul server-only.
 *
 * Tool mengembalikan dua hal: `text` (untuk dibaca model) dan `products` (opsional,
 * data terstruktur yang dikirim ke widget untuk dirender sebagai kartu produk).
 */

import { getSupabaseAdmin } from "./supabase-admin";

export interface ChatProductCard {
  id: string;
  name: string;
  category: string;
  price: number;
  cyp: boolean;
  image: string | null;
}

export interface ChatToolResult {
  text: string;
  products?: ChatProductCard[];
}

export const CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "cari_produk",
      description:
        "Cari produk SAMAQU dari katalog dan lihat harga serta stok terkini. Pakai ini setiap kali butuh info produk, harga, ukuran, warna, atau ketersediaan.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Kata kunci: nama produk, kategori (thobe/kandora/koko/vest/kabak), kain, atau series. Boleh kosong.",
          },
          kategori: { type: "string", description: "Filter kategori (opsional), mis. 'Thobe'." },
          max_harga: { type: "number", description: "Batas harga maksimum dalam Rupiah (opsional)." },
          warna: { type: "string", description: "Filter warna (opsional), mis. 'hitam'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "panduan_ukuran",
      description:
        "Ambil panduan ukuran SAMAQU untuk sebuah kategori. Pakai kalau pelanggan bertanya soal ukuran/pas atau butuh rekomendasi ukuran.",
      parameters: {
        type: "object",
        properties: {
          kategori: { type: "string", description: "Kategori (opsional): Thobe, Kandora, Koko, Vest, Kabak." },
        },
      },
    },
  },
] as const;

/** Buang karakter yang bisa merusak sintaks filter Supabase, batasi panjang. */
function sanitize(value: unknown, max = 60): string {
  return String(value ?? "")
    .replace(/[%(),]/g, " ")
    .trim()
    .slice(0, max);
}

function rupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/**
 * Beberapa produk punya `image` berupa video Cloudinary (.mp4), yang tidak bisa dipakai
 * di tag <img>. Ubah ke poster frame JPEG lewat transform Cloudinary (so_0 = frame awal);
 * URL non-video dibiarkan apa adanya.
 */
function toThumbnail(url: string | null): string | null {
  if (!url) return null;
  const isVideo = /\/video\/upload\//.test(url) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
  if (!isVideo) return url;
  if (!/res\.cloudinary\.com/.test(url)) return null;
  return url.replace("/video/upload/", "/video/upload/so_0/").replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, ".jpg");
}

interface VariantRow {
  product_id: string;
  color: string | null;
  size: string | null;
  stock: number | null;
}

function summarizeStock(variants: VariantRow[]): string {
  const byColor = new Map<string, Map<string, number>>();
  for (const v of variants) {
    const color = v.color && v.color !== "default" ? v.color : "";
    const size = v.size || "-";
    if (!byColor.has(color)) byColor.set(color, new Map());
    const sizes = byColor.get(color)!;
    sizes.set(size, (sizes.get(size) || 0) + (v.stock || 0));
  }
  const parts: string[] = [];
  for (const [color, sizes] of byColor) {
    const sizeText = [...sizes.entries()].map(([size, stock]) => `${size}:${stock}`).join(", ");
    parts.push(color ? `${color} → ${sizeText}` : sizeText);
  }
  return parts.join(" | ") || "stok tidak terkelola";
}

async function cariProduk(args: Record<string, unknown>): Promise<ChatToolResult> {
  const admin = getSupabaseAdmin();
  const term = sanitize(args.query);
  const kategori = sanitize(args.kategori);
  const warna = sanitize(args.warna).toLowerCase();
  const maxHarga = typeof args.max_harga === "number" ? args.max_harga : Number(args.max_harga) || 0;

  let query = admin
    .from("products")
    .select("id, name, category, kain, series, price, minimum_price, create_your_price_enabled, colors, image, jenis_kain(name, material)");

  if (term) query = query.or(`name.ilike.%${term}%,category.ilike.%${term}%,kain.ilike.%${term}%,series.ilike.%${term}%`);
  if (kategori) query = query.ilike("category", `%${kategori}%`);

  const { data, error } = await query.limit(30);
  if (error) {
    console.error("[CHAT-TOOL] cari_produk error:", error.message);
    return { text: "Gagal mengambil data produk. Arahkan pelanggan ke admin." };
  }

  let products = (data || []) as Array<Record<string, unknown>>;

  if (warna) {
    products = products.filter((p) =>
      Array.isArray(p.colors) && (p.colors as string[]).some((c) => c.toLowerCase().includes(warna))
    );
  }
  if (maxHarga > 0) {
    products = products.filter((p) => {
      const price = p.create_your_price_enabled ? Number(p.minimum_price) || 0 : Number(p.price) || 0;
      return price <= maxHarga;
    });
  }

  if (!products.length) {
    return { text: "Tidak ada produk yang cocok dengan kriteria itu. Tawarkan bantuan lain atau arahkan ke admin." };
  }

  products = products.slice(0, 8);
  const ids = products.map((p) => p.id as string);
  const { data: variantData } = await admin
    .from("product_variants")
    .select("product_id, color, size, stock")
    .in("product_id", ids);

  const byProduct = new Map<string, VariantRow[]>();
  for (const v of (variantData || []) as VariantRow[]) {
    if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []);
    byProduct.get(v.product_id)!.push(v);
  }

  const cards: ChatProductCard[] = [];
  const lines = products.map((p) => {
    const jenis = p.jenis_kain as { name?: string; material?: string } | null;
    const kain = jenis?.name || (p.kain as string) || "-";
    const colors = Array.isArray(p.colors) ? (p.colors as string[]).join(", ") : "-";
    const cyp = !!p.create_your_price_enabled;
    const price = cyp ? Number(p.minimum_price) || 0 : Number(p.price) || 0;
    const priceLabel = cyp ? `Create Your Price, minimum ${rupiah(price)}` : rupiah(price);
    cards.push({
      id: p.id as string,
      name: p.name as string,
      category: (p.category as string) || "-",
      price,
      cyp,
      image: toThumbnail((p.image as string) || null),
    });
    return `- ${p.name} [${p.category}] | kain ${kain}${jenis?.material ? ` (${jenis.material})` : ""}${p.series ? ` | series ${p.series}` : ""} | ${priceLabel} | warna: ${colors} | stok (warna → ukuran:jumlah): ${summarizeStock(byProduct.get(p.id as string) || [])}`;
  });

  return {
    text: `Ditemukan ${products.length} produk:\n${lines.join("\n")}`,
    products: cards,
  };
}

const SIZE_GUIDE: Record<string, string> = {
  thobe: "Thobe SAMAQU panjang & longgar. Patokan umum: M (tinggi 160–168 cm), L (168–175), XL (175–182), XXL (182+).",
  kandora: "Kandora potongan longgar. Umumnya sama dengan Thobe: M (160–168 cm), L (168–175), XL (175–182).",
  koko: "Koko potongan regular. M (155–165 cm), L (165–172), XL (172–178), XXL (178+).",
  vest: "Vest dipakai di atas kemeja — pilih sesuai lingkar dada: M (90–96 cm), L (96–102), XL (102–108).",
  kabak: "Kabak longgar; ikuti tinggi badan seperti Thobe.",
};

function panduanUkuran(args: Record<string, unknown>): ChatToolResult {
  const kategori = String(args.kategori || "").toLowerCase().trim();
  const lines = [
    "Panduan ukuran SAMAQU tersedia lengkap (tabel + gambar) di halaman /panduan-ukuran.",
    "Tiap kategori punya tabel ukurannya sendiri (Thobe, Kandora, Koko, Vest, Kabak).",
  ];
  const key = Object.keys(SIZE_GUIDE).find((k) => kategori.includes(k));
  if (key) lines.push(SIZE_GUIDE[key]);
  lines.push(
    "Tips: minta pelanggan menyebut tinggi & berat badan (dan lingkar dada bila perlu), lalu sarankan ukuran. Kalau masih ragu, arahkan konsultasi ke admin lewat WhatsApp."
  );
  return { text: lines.join("\n") };
}

/** Jalankan tool berdasarkan nama & argumen JSON dari model. */
export async function executeChatTool(name: string, argsJson: string): Promise<ChatToolResult> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    args = {};
  }

  try {
    switch (name) {
      case "cari_produk":
        return await cariProduk(args);
      case "panduan_ukuran":
        return panduanUkuran(args);
      default:
        return { text: `Tool "${name}" tidak dikenali.` };
    }
  } catch (e) {
    console.error("[CHAT-TOOL] gagal menjalankan", name, e);
    return { text: "Terjadi kesalahan saat mengambil data. Arahkan pelanggan ke admin." };
  }
}
