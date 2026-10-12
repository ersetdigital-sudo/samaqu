import { supabase } from "@/lib/supabase";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
}

/** Map nilai kategori dari DB ke key internal. */
export const CATEGORY_MAP: Record<string, string> = {
  "Order & Pembayaran": "order",
  "Pengiriman": "kirim",
  "Produk, Kain & Size": "produk",
  "Retur & Garansi": "retur",
  "Populer": "popular",
  "Lainnya": "lainnya",
};

export function mapFaqRows(rows: Record<string, unknown>[]): FaqItem[] {
  return rows.map((f, i) => {
    const rawCat = (f.category as string) || "";
    return {
      id: f.id as string,
      question: f.question as string,
      answer: f.answer as string,
      category: CATEGORY_MAP[rawCat] || "lainnya",
      display_order: (f.display_order as number) || i,
    };
  });
}

/** FAQ publik — dipakai server untuk render awal + FAQPage schema. */
export async function fetchFaqItems(): Promise<FaqItem[]> {
  const { data, error } = await supabase
    .from("faq_items")
    .select("*")
    .eq("is_active", true)
    .eq("type", "full")
    .order("display_order");

  if (error) {
    console.error("[FAQ] Fetch error:", error);
    return [];
  }
  return mapFaqRows((data || []) as Record<string, unknown>[]);
}
