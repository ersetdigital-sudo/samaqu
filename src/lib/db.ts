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
  return {
    id: db.id,
    name: db.name,
    category: db.category as Product["category"],
    kain: db.kain || undefined,
    series: db.series || undefined,
    colors: db.colors,
    price: db.price,
    tag: (db.tag as Product["tag"]) || undefined,
    note: db.note || undefined,
    image: db.image,
    images: db.images,
    media: db.images.map((src) => ({
      src,
      type: src.match(/\.(mp4|webm|ogg)$/i) ? "video" as const : "image" as const,
    })),
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  let query = supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  if (category && category !== "Semua") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data as DbProduct[]).map(dbProductToProduct);
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

  return dbProductToProduct(data as DbProduct);
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
