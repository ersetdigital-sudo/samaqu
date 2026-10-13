import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { buildCustomerDirectory } from "@/lib/customer-directory";

/**
 * Pusat data pelanggan untuk dashboard ops (`/ops/pelanggan`) — sumber yang sama
 * dengan panel Pelanggan admin (`/api/admin/customers`), hanya beda gerbang auth
 * (admin SAMAQU) dan bentuk respons (`{ items }`, mengikuti route /api/ops/* lain).
 */
export async function GET(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  const items = await buildCustomerDirectory(getSupabaseAdmin());
  return NextResponse.json({ items });
}
