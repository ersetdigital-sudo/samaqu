import { supabase } from "./supabase";
import type { Product } from "./katalog-data";

export interface DbProduct {
  id: string;
  name: string;
  category: string;
  kain: string | null;
  series: string | null;
  colors: string[];
  price: number;
  tag: string | null;
  note: string | null;
  image: string;
  images: string[];
  created_at: string;
}

export interface DbTestimonial {
  id: string;
  customer_name: string;
  type: string;
  category: string;
  rating: number;
  verified: boolean;
  content: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  created_at: string;
}

function dbProductToProduct(db: DbProduct): Product {
  const images = Array.isArray(db.images) ? db.images : [];
  return {
    id: db.id,
    name: db.name,
    category: db.category as Product["category"],
    description: db.description || undefined,
    kain: db.kain || undefined,
    series: db.series || undefined,
    colors: Array.isArray(db.colors) ? db.colors : [],
    price: db.price,
    tag: (db.tag as Product["tag"]) || undefined,
    note: db.note || undefined,
    image: db.image || "",
    images,
    media: images.map((src) => ({
      src,
      type: src.match(/\.(mp4|webm|ogg)$/i) ? "video" as const : "image" as const,
    })),
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  try {
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });

    if (category && category !== "Semua") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[getProducts] Supabase error:", error.message, error);
      return [];
    }

    if (!data) {
      console.warn("[getProducts] No data returned");
      return [];
    }

    console.log(`[getProducts] Fetched ${data.length} products`);
    return (data as DbProduct[]).map(dbProductToProduct);
  } catch (err) {
    console.error("[getProducts] Unexpected error:", err);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  // Fetch media from product_images table (includes video detection via is_video flag)
  const { data: images } = await supabase
    .from("product_images")
    .select("url, is_video, color, display_order")
    .eq("product_id", id)
    .order("display_order");

  const product = dbProductToProduct(data as DbProduct);

  // If product_images has data, use it for media (more accurate video detection)
  if (images && images.length > 0) {
    product.media = images.map((img: { url: string; is_video: boolean }) => ({
      src: img.url,
      type: (img.is_video ? "video" : "image") as "video" | "image",
    }));
    product.images = images.map((img: { url: string }) => img.url);
  }

  return product;
}

export async function getTestimonials(category?: string, type?: string) {
  let query = supabase
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (type && type !== "all") {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching testimonials:", error);
    return [];
  }

  return data as DbTestimonial[];
}
