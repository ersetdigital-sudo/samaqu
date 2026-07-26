import { supabase } from "@/lib/supabase";

export async function registerCustomer(email: string, password: string, name: string, whatsapp: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (data.user) {
    await supabase.from("customers").insert({ id: data.user.id, name, whatsapp });
  }
  return { error: null };
}

export async function loginCustomer(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message || null };
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
