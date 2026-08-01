import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  console.log("[supabase-admin] Env check:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceKey,
    keySource: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE" : process.env.SUPABASE_SECRET_KEY ? "SECRET" : "none",
  });

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(`[supabase-admin] Missing env vars - URL: ${!!supabaseUrl}, Key: ${!!supabaseServiceKey}`);
  }

  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _client;
}
