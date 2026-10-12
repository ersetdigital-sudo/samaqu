import { supabase } from "@/lib/supabase";

/**
 * Shim data-layer untuk dashboard internal (/ops).
 *
 * Halaman /ops di-port apa adanya dari app Base44, jadi bentuk `base44.entities.X.*`
 * dipertahankan di sini dan diteruskan ke API internal kita (/api/ops/...) yang
 * membaca/menulis DB SAMAQU yang sama dengan website (satu sumber kebenaran).
 */

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function call<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error((json as any)?.error || `Request gagal (${res.status})`);
  return json as T;
}

const LEADS = "/api/ops/leads";
const PRODUCTS = "/api/ops/products";
const VARIANTS = "/api/ops/product-variants";
const STOCK_IN = "/api/ops/stock-in";
const TRANSACTIONS = "/api/ops/transactions";

/** Base44 memakai sort "-created_date" (desc). Kita terjemahkan ke parameter API. */
function sortParam(sort?: string) {
  if (!sort) return "created_at:asc";
  return sort.startsWith("-") ? "created_at:desc" : "created_at:asc";
}

export const base44 = {
  entities: {
    Lead: {
      async filter(query: any = {}, opts: any = {}) {
        const params = new URLSearchParams();
        if (query?.tanggal?.$gte) params.set("start", String(query.tanggal.$gte));
        if (query?.tanggal?.$lte) params.set("end", String(query.tanggal.$lte));
        if (query?.kontak?.$regex) params.set("search", String(query.kontak.$regex));
        params.set("sort", String(opts?.sort ?? "tanggal"));
        params.set("limit", String(opts?.limit ?? 1000));
        const json = await call<{ items: any[] }>("GET", `${LEADS}?${params.toString()}`);
        return { items: json.items ?? [] };
      },
      async list(opts: any = {}) {
        const params = new URLSearchParams();
        params.set("limit", String(opts?.limit ?? 500));
        if (opts?.cursor) params.set("offset", String(opts.cursor));
        const json = await call<{ items: any[]; next_cursor: string | null }>("GET", `${LEADS}?${params.toString()}`);
        return { items: json.items ?? [], next_cursor: json.next_cursor ?? null };
      },
      async create(data: any) {
        const json = await call<{ items: any[] }>("POST", LEADS, { rows: [data] });
        return json.items?.[0] ?? null;
      },
      async bulkCreate(rows: any[]) {
        return call<{ inserted: number }>("POST", LEADS, { rows });
      },
      async update(id: string, data: any) {
        const json = await call<{ item: any }>("PATCH", LEADS, { id, ...data });
        return json.item ?? null;
      },
      async delete(id: string) {
        return call<{ deleted: number }>("DELETE", LEADS, { id });
      },
    },

    Product: {
      async list(_sort?: string) {
        const json = await call<{ items: any[] }>("GET", PRODUCTS);
        return json.items ?? [];
      },
      async create(data: any) {
        const json = await call<{ item: any }>("POST", PRODUCTS, data);
        return json.item ?? null;
      },
      async update(id: string, data: any) {
        const json = await call<{ item: any }>("PATCH", PRODUCTS, { id, ...data });
        return json.item ?? null;
      },
      async delete(id: string) {
        return call<{ deleted: number }>("DELETE", PRODUCTS, { id });
      },
    },

    ProductVariant: {
      async list(_sort?: string) {
        const json = await call<{ items: any[] }>("GET", VARIANTS);
        return json.items ?? [];
      },
    },

    StockIn: {
      async list(sort?: string, opts: any = {}) {
        const params = new URLSearchParams({ sort: sortParam(sort), limit: String(opts?.limit ?? 1000) });
        const json = await call<{ items: any[] }>("GET", `${STOCK_IN}?${params.toString()}`);
        return json.items ?? [];
      },
      async create(data: any) {
        const json = await call<{ item: any }>("POST", STOCK_IN, data);
        return json.item ?? null;
      },
      async delete(id: string) {
        return call<{ deleted: number }>("DELETE", STOCK_IN, { id });
      },
    },

    Transaction: {
      async list(sort?: string, opts: any = {}) {
        const params = new URLSearchParams({ sort: sortParam(sort), limit: String(opts?.limit ?? 2000) });
        const json = await call<{ items: any[] }>("GET", `${TRANSACTIONS}?${params.toString()}`);
        return json.items ?? [];
      },
    },
  },
};
