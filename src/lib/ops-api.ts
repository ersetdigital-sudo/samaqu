import { supabase } from "@/lib/supabase";

/**
 * Shim data-layer untuk dashboard internal (/ops).
 *
 * Halaman-halaman /ops di-port apa adanya dari app Base44 (markup & logika sama),
 * jadi panggilan `base44.entities.X.*` dipertahankan bentuknya di sini dan
 * diteruskan ke API internal kita (/api/ops/...) yang jalan di atas DB SAMAQU.
 */

export interface OpsLead {
  id: string;
  tanggal: string;
  jam?: string | null;
  kontak: string;
  sumber: string;
  status: string;
  nominal: number;
  catatan?: string | null;
}

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

export const base44 = {
  entities: {
    Lead: {
      /** filter({ tanggal: { $gte, $lte }, kontak: { $regex } }, { sort, limit }) */
      async filter(query: any = {}, opts: any = {}) {
        const params = new URLSearchParams();
        if (query?.tanggal?.$gte) params.set("start", String(query.tanggal.$gte));
        if (query?.tanggal?.$lte) params.set("end", String(query.tanggal.$lte));
        if (query?.kontak?.$regex) params.set("search", String(query.kontak.$regex));
        params.set("sort", String(opts?.sort ?? "tanggal"));
        params.set("limit", String(opts?.limit ?? 1000));
        const json = await call<{ items: OpsLead[] }>("GET", `${LEADS}?${params.toString()}`);
        return { items: json.items ?? [] };
      },
      /** list({ fields, limit, cursor }) — dipakai untuk cek duplikat lintas halaman */
      async list(opts: any = {}) {
        const params = new URLSearchParams();
        params.set("limit", String(opts?.limit ?? 500));
        if (opts?.cursor) params.set("offset", String(opts.cursor));
        const json = await call<{ items: any[]; next_cursor: string | null }>("GET", `${LEADS}?${params.toString()}`);
        return { items: json.items ?? [], next_cursor: json.next_cursor ?? null };
      },
      async create(data: any) {
        const json = await call<{ items: OpsLead[] }>("POST", LEADS, { rows: [data] });
        return json.items?.[0] ?? null;
      },
      async bulkCreate(rows: any[]) {
        return call<{ inserted: number }>("POST", LEADS, { rows });
      },
      async update(id: string, data: any) {
        const json = await call<{ item: OpsLead }>("PATCH", LEADS, { id, ...data });
        return json.item ?? null;
      },
      async delete(id: string) {
        return call<{ deleted: number }>("DELETE", LEADS, { id });
      },
    },
  },
};
