import { createClient } from "@supabase/supabase-js";

/**
 * Klien Supabase KHUSUS portal affiliate.
 *
 * Memakai storage key yang berbeda dari klien toko (`src/lib/supabase.ts`) supaya
 * sesi affiliate tidak menimpa sesi akun pelanggan di browser yang sama — dua
 * peran (customer & affiliate) memakai Supabase Auth yang sama, jadi storage
 * key-nya harus dipisah.
 *
 * Server tetap memverifikasi token di sisi backend (tabel `affiliates`), jadi
 * pemisahan storage ini murni soal sesi di browser.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;

export const supabaseAffiliate = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sb-samaqu-affiliate-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
