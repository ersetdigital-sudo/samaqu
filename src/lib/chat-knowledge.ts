/**
 * Basis pengetahuan SAMAQU untuk live chat AI.
 *
 * Menyusun satu blok teks berbahasa Indonesia dari info statis brand (cara pesan, pembayaran,
 * pengiriman, ukuran, garansi) + tabel `faq_items` + info toko.
 *
 * PENTING: data produk (nama, harga, stok) SENGAJA TIDAK dimasukkan ke sini supaya prompt-nya
 * ramping dan balasan cepat — model mengambilnya saat dibutuhkan lewat tool `cari_produk`.
 * (Dulu seluruh katalog disuntik tiap request; prompt jadi besar dan respons ~5 detik.)
 *
 * Modul ini server-only dan di-cache 5 menit.
 */

import { getSupabaseAdmin } from "./supabase-admin";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { text: string; ts: number } | null = null;

export function clearKnowledgeCache() {
  cached = null;
}

async function build(): Promise<string> {
  const admin = getSupabaseAdmin();

  const [settingsRes, faqRes] = await Promise.all([
    admin
      .from("store_settings")
      .select("store_name, whatsapp, email, instagram_url, open_order_active, open_order_period")
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("faq_items")
      .select("question, answer, category")
      .eq("is_active", true)
      // "full" = FAQ publik; "chat" = pengetahuan tambahan hasil percakapan (tidak tampil di /faq).
      .in("type", ["full", "chat"])
      .order("display_order"),
  ]);

  const settings = settingsRes.data as Record<string, unknown> | null;
  const faqs = (faqRes.data || []) as Array<{ question: string; answer: string; category: string | null }>;

  const contact = [
    settings?.whatsapp ? `WhatsApp ${settings.whatsapp}` : null,
    settings?.email ? `email ${settings.email}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines: string[] = [];

  lines.push(
    `# TENTANG ${(settings?.store_name as string) || "SAMAQU"}`,
    "SAMAQU adalah brand busana muslim pria premium (berbasis di Depok, Indonesia).",
    "Kategori produk: Thobe, Kandora, Koko, Vest, Kabak, serta aksesori Cover & Hanger.",
    "Untuk daftar produk, harga, warna, atau stok terkini — SELALU ambil lewat tool cari_produk.",
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
    "- Tidak bisa retur: sudah dipakai/dicuci, ganti warna, ukuran custom, atau kelalaian pemakaian."
  );

  if (settings?.open_order_active) {
    lines.push("", "# OPEN ORDER", `Sedang dibuka. Periode: ${settings.open_order_period || "lihat halaman Open Order"}.`);
  }

  if (contact) lines.push("", "# KONTAK ADMIN", contact);

  if (faqs.length) {
    lines.push("", "# FAQ (tanya-jawab resmi)");
    for (const f of faqs) {
      lines.push(`T: ${f.question}`, `J: ${f.answer}`);
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
    return "SAMAQU adalah brand busana muslim pria premium. Kategori: Thobe, Kandora, Koko, Vest, Kabak, Cover & Hanger. Untuk data produk & stok gunakan tool cari_produk.";
  }
}
