import { supabase } from "./supabase";

// Get RajaOngkir API key from database, fallback to environment variable
// NEVER expose this to client-side code
export async function getRajaOngkirApiKey(): Promise<string> {
  try {
    const { data } = await supabase
      .from("store_settings")
      .select("rajaongkir_api_key")
      .eq("id", 1)
      .single();

    if (data?.rajaongkir_api_key) {
      return data.rajaongkir_api_key;
    }
  } catch (e) {
    console.error("[API-KEY] Failed to read from database, using env fallback:", e);
  }

  // Fallback to environment variable
  return process.env.RAJAONGKIR_API_KEY || "";
}
