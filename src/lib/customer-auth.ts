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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return { error: null };
  const msg = error.message;
  if (msg.includes("Invalid login credentials") || msg.includes("invalid") || msg.includes("Invalid")) {
    return { error: "Email atau password salah. Jika belum punya akun, silakan daftar terlebih dahulu." };
  }
  if (msg.includes("not confirmed") || msg.includes("Email not confirmed")) {
    return { error: "Email belum diverifikasi. Cek inbox email Anda untuk link verifikasi." };
  }
  return { error: msg };
}

export async function logoutCustomer() {
  await supabase.auth.signOut();
}

export async function getCurrentCustomer() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("customers").select("*").eq("id", user.id).single();
  return data;
}

export async function getCustomerOrders(customerId: string) {
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(product_name, color, size, quantity, price, product_image)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return data || [];
}
