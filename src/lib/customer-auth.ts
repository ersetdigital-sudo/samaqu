import { supabase } from "@/lib/supabase";

export async function registerCustomer(email: string, password: string, name: string, whatsapp: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const msg = error.message;
    if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("already exists")) {
      return { error: "Email sudah terdaftar. Silakan masuk atau gunakan email lain." };
    }
    if (msg.includes("valid email")) {
      return { error: "Format email tidak valid." };
    }
    if (msg.includes("at least") || msg.includes("6 characters")) {
      return { error: "Password minimal 6 karakter." };
    }
    return { error: msg };
  }
  if (data.user) {
    await supabase.from("customers").insert({ id: data.user.id, name, whatsapp });
  }
  return { error: null, needsVerification: !!data.user };
}

export async function loginCustomer(email: string, password: string) {
  // Sign out any existing session first (admin might be logged in)
  await supabase.auth.signOut();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = error.message;
    if (msg.includes("Invalid login credentials") || msg.includes("invalid") || msg.includes("Invalid")) {
      return { error: "Email atau password salah. Jika belum punya akun, silakan daftar terlebih dahulu." };
    }
    if (msg.includes("not confirmed") || msg.includes("Email not confirmed")) {
      return { error: "Email belum diverifikasi. Cek inbox email Anda untuk link verifikasi." };
    }
    return { error: msg };
  }
  // Verify user exists in customers table
  if (data.user) {
    // maybeSingle: baris `customers` yang tidak ada = bukan akun pelanggan (null), bukan 406.
    const { data: cust } = await supabase.from("customers").select("id").eq("id", data.user.id).maybeSingle();
    if (!cust) {
      await supabase.auth.signOut();
      return { error: "Akun ini bukan akun pelanggan. Silakan daftar atau gunakan akun pelanggan yang benar." };
    }
  }
  return { error: null };
}

export async function logoutCustomer() {
  await supabase.auth.signOut();
}

export async function getCurrentCustomer() {
  // getSession reads the stored session locally (supabase-js refreshes an expired
  // token itself) — unlike auth.getUser(), which costs an extra round trip to the
  // Supabase Auth server on every call. The `customers` read below is RLS-protected,
  // so an invalid/missing session still resolves to null.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data } = await supabase.from("customers").select("*").eq("id", user.id).maybeSingle();
  if (!data) return null;
  return { ...data, email: user.email || "" };
}

/**
 * Pesanan milik customer yang login.
 *
 * Dibaca lewat route server karena pesanan manual sering tidak punya
 * `customer_id`; route mencocokkan juga lewat email/WhatsApp akun.
 * Parameter `customerId` dipertahankan agar pemanggil lama tidak berubah.
 */
const ordersCache = new Map<string, { at: number; orders: any[] }>();
const ORDERS_CACHE_MS = 20_000;

export async function getCustomerOrders(_customerId?: string, limit?: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !session.user?.id) return [];

    const key = `${session.user.id}:${limit ?? "all"}`;
    const cached = ordersCache.get(key);
    if (cached && Date.now() - cached.at < ORDERS_CACHE_MS) return cached.orders;

    const query = limit ? `?limit=${Math.min(limit, 500)}` : "";
    const res = await fetch(`/api/customer/orders${query}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const orders = json?.orders || [];
    // Cache pendek: pindah dashboard ↔ pesanan tidak perlu round-trip ulang.
    ordersCache.set(key, { at: Date.now(), orders });
    return orders;
  } catch (error) {
    // Jangan biarkan halaman akun loading selamanya karena jaringan/route gagal.
    console.error("[customer-auth] getCustomerOrders:", error);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
