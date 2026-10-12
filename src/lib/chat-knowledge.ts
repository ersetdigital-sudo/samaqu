/**
 * Basis pengetahuan SAMAQU untuk live chat AI.
 *
 * Menyusun satu blok teks berbahasa Indonesia dari: info statis brand (cara pesan, pembayaran,
 * pengiriman, ukuran, garansi), tabel `faq_items`, dan ringkasan katalog (`products` +
 * `product_variants` + `jenis_kain`). Blok ini disuntikkan ke system prompt chat.
 *
 * Modul ini server-only dan di-cache 5 menit supaya tidak query DB tiap pesan.
 */

import { getSupabaseAdmin } from "./supabase-admin";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PRODUCTS = 80;

let cached: { text: string; ts: number } | null = null;

export function clearKnowledgeCache() {
  cached = null;
}

function rupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

interface VariantRow {
  product_id: string;
  color: string | null;
  size: string | null;
  stock: number | null;
}

/** "S:3, M:5" per warna; produk satu warna (color "default") hanya menampilkan ukurannya. */
function summarizeVariants(variants: VariantRow[]): string {
  if (!variants.length) return "-";

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
  return parts.join(" | ");
}

async function build(): Promise<string> {
  const admin = getSupabaseAdmin();

  const [settingsRes, faqRes, productsRes, variantsRes] = await Promise.all([
    admin
      .from("store_settings")
      .select("store_name, whatsapp, email, instagram_url, open_order_active, open_order_period")
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("faq_items")
      .select("question, answer, category")
      .eq("is_active", true)
      .eq("type", "full")
      .order("display_order"),
    admin
      .from("products")
      .select("id, name, category, kain, series, price, minimum_price, create_your_price_enabled, colors, description, jenis_kain(name, material)")
      .order("category")
      .order("name")
      .limit(MAX_PRODUCTS),
    admin.from("product_variants").select("product_id, color, size, stock"),
  ]);

  const settings = settingsRes.data as Record<string, unknown> | null;
  const faqs = (faqRes.data || []) as Array<{ question: string; answer: string; category: string | null }>;
  const products = (productsRes.data || []) as Array<Record<string, unknown>>;
  const variants = (variantsRes.data || []) as VariantRow[];

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const v of variants) {
    if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
    variantsByProduct.get(v.product_id)!.push(v);
  }

  const contact = [
    settings?.whatsapp ? `WhatsApp ${settings.whatsapp}` : null,
    settings?.email ? `email ${settings.email}` : null,
  ].filter(Boolean).join(" · ");

  const lines: string[] = [];

  lines.push(
    `# TENTANG ${(settings?.store_name as string) || "SAMAQU"}`,
    "SAMAQU adalah brand busana muslim pria premium (berbasis di Depok, Indonesia).",
    "Kategori produk: Thobe, Kandora, Koko, Vest, Kabak, serta aksesori Cover & Hanger.",
    "",
    "# CARA PESAN",
    "1) Lewat website: pilih produk → (opsional) isi Create Your Price → checkout → bayar → pesanan diproses & dikirim.",
    "2) Lewat WhatsApp: hubungi admin → konsultasi/cek stok & ukuran → bayar → dikirim.",
    "",
    "# CREATE YOUR PRICE (CYP)",
    "Untuk produk tertentu, pelanggan boleh menentukan sendiri harganya, minimal sebesar 'Harga Minimum' yang tertera.",
    "",
    "# PEMBAYARAN",
    "Metode yang tersedia: transfer bank, QRIS, e-wallet, dan COD (tergantung yang diaktifkan toko). Bukti pembayaran dikirim ke admin lewat WhatsApp.",
    "",
    "# PENGIRIMAN",
    "Dikirim dari Depok. Ekspedisi yang tersedia antara lain JNE, SiCepat, J&T, Ninja, TIKI, Wahana, POS, Lion, dan AnterAja. Estimasi tiba umumnya 1–2 hari kerja setelah pembayaran diverifikasi.",
    "",
    "# UKURAN",
    "Ada panduan ukuran per kategori (Thobe, Kandora, Koko, Vest, Kabak). Kalau ragu, konsultasikan tinggi & berat badan ke admin lewat WhatsApp untuk rekomendasi ukuran.",
    "",
    "# GARANSI & RETUR",
    "- Cacat produksi: penggantian dalam 7 hari kerja.",
    "- Retur: kemasan asli belum dibuka, label masih terpasang, dalam 7 hari, ada bukti pembelian.",
    "- Tidak bisa retur: sudah dipakai/dicuci, ganti warna, ukuran custom, atau kelalaian pemakaian.",
  );

  if (settings?.open_order_active) {
    lines.push("", "# OPEN ORDER", `Sedang dibuka. Periode: ${settings.open_order_period || "lihat halaman Open Order"}.`);
  }

  if (contact) lines.push("", `# KONTAK ADMIN`, contact);

  if (faqs.length) {
    lines.push("", "# FAQ (tanya-jawab resmi)");
    for (const f of faqs) {
      lines.push(`T: ${f.question}`, `J: ${f.answer}`);
    }
  }

  if (products.length) {
    lines.push("", "# KATALOG PRODUK");
    for (const p of products) {
      const jenis = p.jenis_kain as { name?: string; material?: string } | null;
      const kain = jenis?.name || (p.kain as string) || "-";
      const colors = Array.isArray(p.colors) ? (p.colors as string[]).join(", ") : "-";
      const priceLabel = p.create_your_price_enabled
        ? `CYP, minimum ${rupiah(Number(p.minimum_price) || 0)}`
        : rupiah(Number(p.price) || 0);
      const stock = summarizeVariants(variantsByProduct.get(p.id as string) || []);
      lines.push(
        `- ${p.name} [${p.category}] — kain ${kain}; ${priceLabel}` +
          `${p.series ? `; series ${p.series}` : ""}; warna: ${colors}; stok (warna → ukuran:jumlah): ${stock}`
      );
    }
  }

  return lines.join("\n");
}

export async function getKnowledgeContext(): Promise<string> {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.text;
  try {
    const text = await build();
    cached = { text, ts: Date.now() };
    return text;
  } catch (e) {
    console.error("[CHAT] Gagal menyusun knowledge base:", e);
    return "SAMAQU adalah brand busana muslim pria premium. Kategori: Thobe, Kandora, Koko, Vest, Kabak, Cover & Hanger.";
  }
}
