import { supabase } from "./supabase";

export type BelanjaIcon = "whatsapp" | "globe";
export type RowIcon = "ruler" | "instagram" | "link";
export type GuaranteeIcon = "shield" | "refund" | "exchange" | "chat";
export type SocialPlatform = "instagram" | "whatsapp" | "website";

export interface BioCategory {
  label: string;
  image_url: string;
  href: string;
  /** object-position gambar kategori, mis. "50% 30%". */
  position: string;
}

export interface BioBelanja {
  label: string;
  subtitle: string;
  href: string;
  icon: BelanjaIcon;
}

export interface BioRow {
  label: string;
  subtitle: string;
  href: string;
  icon: RowIcon;
}

export interface BioGuarantee {
  title: string;
  subtitle: string;
  icon: GuaranteeIcon;
}

export interface BioSocial {
  platform: SocialPlatform;
  href: string;
}

export interface BioPageContent {
  logo_url: string;
  eyebrow: string;
  description: string;
  hero: {
    image_url: string;
    /** Video showcase (opsional). Kalau diisi, video menggantikan foto hero. */
    video_url: string;
    badge: string;
    title: string;
    title_accent: string;
    price_label: string;
    price: string;
    cta: string;
    href: string;
  };
  categories: {
    heading: string;
    link_label: string;
    link_href: string;
    items: BioCategory[];
  };
  belanja: {
    heading: string;
    items: BioBelanja[];
  };
  rows: BioRow[];
  guarantee: {
    heading: string;
    items: BioGuarantee[];
  };
  socials: BioSocial[];
  footer: string;
  marquee: string[];
}

const WHATSAPP =
  "https://wa.me/62895635965400?text=Halo%20Samaqu%2C%20saya%20mau%20order";
const SITE = "https://samaqu.id";
const INSTAGRAM = "https://instagram.com/samaqu.id";
/** Video showcase default; bisa diganti dari Admin → Biolink. */
const VIDEO =
  "https://res.cloudinary.com/ddbq1mlsc/video/upload/v1792504744/1000375934_emagkl.mp4";

export const DEFAULT_BIO_CONTENT: BioPageContent = {
  logo_url: "/bio/samaqu-logo.png",
  eyebrow: "Premium Muslim Menswear",
  description: "Thobe untuk pria yang ingin tampil rapi, nyaman, dan berkelas.",
  hero: {
    image_url: "/bio/thobe.png",
    video_url: VIDEO,
    badge: "BEST SELLER",
    title: "Thobe",
    title_accent: "Samaqu.",
    price_label: "Mulai dari",
    price: "Rp249.000",
    cta: "Shop now",
    href: SITE,
  },
  categories: {
    heading: "Kategori",
    link_label: "Lihat semua",
    link_href: SITE,
    items: [
      { label: "Thobe", image_url: "/bio/thobe.png", href: SITE, position: "50% 30%" },
      { label: "Koko", image_url: "/bio/koko.png", href: SITE, position: "50% 50%" },
      { label: "Vest", image_url: "/bio/vest.png", href: SITE, position: "50% 50%" },
      { label: "Kandora", image_url: "/bio/kandora.png", href: SITE, position: "50% 20%" },
    ],
  },
  belanja: {
    heading: "Belanja",
    items: [
      { label: "Order via WhatsApp", subtitle: "Konsultasi gratis", href: WHATSAPP, icon: "whatsapp" },
      { label: "Website Resmi", subtitle: "samaqu.id", href: SITE, icon: "globe" },
    ],
  },
  rows: [
    { label: "Panduan Ukuran", subtitle: "Cari size yang paling pas", href: SITE, icon: "ruler" },
    { label: "Instagram", subtitle: "@samaqu.id", href: INSTAGRAM, icon: "instagram" },
  ],
  guarantee: {
    heading: "Garansi Samaqu",
    items: [
      { title: "Kualitas", subtitle: "Bahan premium", icon: "shield" },
      { title: "Uang Kembali", subtitle: "Tanpa ribet", icon: "refund" },
      { title: "Tukar Ukuran", subtitle: "Kalau kurang pas", icon: "exchange" },
      { title: "Layanan Ramah", subtitle: "Admin siap bantu", icon: "chat" },
    ],
  },
  socials: [
    { platform: "instagram", href: INSTAGRAM },
    { platform: "whatsapp", href: WHATSAPP },
    { platform: "website", href: SITE },
  ],
  footer: "© 2026 SAMAQU",
  marquee: [
    "CREATE YOUR PRICE",
    "✦ THOBE MULAI RP249RB",
    "✦ GARANSI TUKAR UKURAN",
    "✦ UANG KEMBALI",
  ],
};

/** Gabung konten dari DB dengan default supaya field baru/kolom kosong tetap aman. */
export function normalizeBioContent(raw: unknown): BioPageContent {
  const value = (raw ?? {}) as Partial<BioPageContent>;
  const pick = <T,>(fallback: T, candidate: T | undefined): T =>
    candidate === undefined || candidate === null ? fallback : candidate;

  return {
    logo_url: pick(DEFAULT_BIO_CONTENT.logo_url, value.logo_url),
    eyebrow: pick(DEFAULT_BIO_CONTENT.eyebrow, value.eyebrow),
    description: pick(DEFAULT_BIO_CONTENT.description, value.description),
    hero: {
      ...DEFAULT_BIO_CONTENT.hero,
      ...(value.hero ?? {}),
      video_url: pick(DEFAULT_BIO_CONTENT.hero.video_url, value.hero?.video_url),
    },
    categories: {
      heading: pick(DEFAULT_BIO_CONTENT.categories.heading, value.categories?.heading),
      link_label: pick(DEFAULT_BIO_CONTENT.categories.link_label, value.categories?.link_label),
      link_href: pick(DEFAULT_BIO_CONTENT.categories.link_href, value.categories?.link_href),
      items: Array.isArray(value.categories?.items) && value.categories.items.length > 0
        ? value.categories.items
        : DEFAULT_BIO_CONTENT.categories.items,
    },
    belanja: {
      heading: pick(DEFAULT_BIO_CONTENT.belanja.heading, value.belanja?.heading),
      items: Array.isArray(value.belanja?.items) ? value.belanja.items : DEFAULT_BIO_CONTENT.belanja.items,
    },
    rows: Array.isArray(value.rows) ? value.rows : DEFAULT_BIO_CONTENT.rows,
    guarantee: {
      heading: pick(DEFAULT_BIO_CONTENT.guarantee.heading, value.guarantee?.heading),
      items: Array.isArray(value.guarantee?.items) ? value.guarantee.items : DEFAULT_BIO_CONTENT.guarantee.items,
    },
    socials: Array.isArray(value.socials) ? value.socials : DEFAULT_BIO_CONTENT.socials,
    footer: pick(DEFAULT_BIO_CONTENT.footer, value.footer),
    marquee: Array.isArray(value.marquee) && value.marquee.length > 0
      ? value.marquee
      : DEFAULT_BIO_CONTENT.marquee,
  };
}

/** Baca konten bio dari DB; kalau tabel belum ada / kosong → pakai default. */
export async function fetchBioPageContent(): Promise<BioPageContent> {
  const { data, error } = await supabase
    .from("bio_page_content")
    .select("content")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data?.content) return DEFAULT_BIO_CONTENT;
  return normalizeBioContent(data.content);
}
