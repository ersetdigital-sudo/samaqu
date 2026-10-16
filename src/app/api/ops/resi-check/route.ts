import { NextRequest, NextResponse } from "next/server";
import { isOpsAdmin, unauthorized } from "@/lib/ops-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getDestinationCode, getReceiverArea } from "@/lib/jnt/area-mapping";
import { normalizeWaNumber } from "@/lib/ops-followup";
import { productWeightMapFromRows, sumWeightGramsBySize, variantWeightMapFromRows } from "@/lib/shipping-weight";

/**
 * Pra-cek "Buat Resi" untuk menu Transaksi (ops).
 *
 * HANYA MEMBACA: tidak menulis ke database dan TIDAK memanggil API J&T. Tugasnya memastikan
 * data yang dibutuhkan pembuatan resi sudah lengkap SEBELUM admin menekan tombol, memakai
 * aturan & modul yang sama dengan pembuatan resinya:
 *  - kota/kecamatan dipisah dari `shipping_city` persis seperti `createJntOrderForOrder()`;
 *  - kode area J&T lewat `getDestinationCode()` + `getReceiverArea()` (`area-mapping.ts`).
 *    Modul itu memuat dataset 7 ribu baris, jadi sengaja dibaca di server (bukan di browser);
 *  - berat memakai `sumWeightGramsBySize()` dengan fallback yang sama seperti pembuatan resi
 *    (berat varian → berat produk → berat tersimpan di pesanan → 1200 g).
 *
 *   POST /api/ops/resi-check  { order_number }
 *   → { ok, checks: [{ key, label, ok, detail }], receiver, weight_grams, awb_no, status }
 */
const DEFAULT_ITEM_WEIGHT = 1200;

export async function POST(req: NextRequest) {
  if (!(await isOpsAdmin(req))) return unauthorized();

  try {
    const body = await req.json();
    const orderNumber = String(body?.order_number || "").trim();
    if (!orderNumber) {
      return NextResponse.json({ error: "Nomor pesanan wajib diisi" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: order, error } = await admin
      .from("orders")
      .select(
        "id, order_number, status, customer_name, customer_whatsapp, shipping_address, shipping_city, shipping_kecamatan, shipping_postal_code, total, weight, awb_no, order_items(product_id, color, size, quantity)",
      )
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });

    const rawCity = String(order.shipping_city || "");
    const commaAt = rawCity.indexOf(",");
    const city = commaAt === -1 ? rawCity.trim() : rawCity.slice(commaAt + 1).trim();
    const district =
      String(order.shipping_kecamatan || "").trim() || (commaAt === -1 ? "" : rawCity.slice(0, commaAt).trim());

    const items = (order.order_items || []).map((item: any) => ({
      productId: String(item?.product_id || "").trim(),
      color: String(item?.color || "default").trim() || "default",
      size: String(item?.size || "").trim(),
      quantity: Number(item?.quantity) || 0,
    }));

    /* Berat estimasi — rumusnya sama dengan createJntOrderForOrder(). */
    const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
    let weightGrams = Number(order.weight) || 0;
    if (productIds.length > 0) {
      const [{ data: productRows }, { data: variantRows }] = await Promise.all([
        admin.from("products").select("id, weight").in("id", productIds),
        admin.from("product_variants").select("product_id, color, size, weight").in("product_id", productIds),
      ]);
      const { grams, missingQty } = sumWeightGramsBySize(
        items,
        productWeightMapFromRows(productRows as { id?: string | null; weight?: number | null }[]),
        variantWeightMapFromRows(
          variantRows as { product_id?: string | null; color?: string | null; size?: string | null; weight?: number | null }[],
        ),
      );
      if (missingQty === 0 && grams > 0) weightGrams = grams;
      else if (!(weightGrams > 0)) weightGrams = Math.max(grams, DEFAULT_ITEM_WEIGHT);
    }

    const destinationCode = getDestinationCode(city, district) || "";
    const receiverArea = getReceiverArea(city, district) || "";
    const phone = normalizeWaNumber(order.customer_whatsapp);

    const checks = [
      { key: "receiver_name", label: "Nama penerima terisi", ok: Boolean(String(order.customer_name || "").trim()) },
      {
        key: "receiver_phone",
        label: "Nomor WhatsApp penerima valid",
        ok: Boolean(phone),
        detail: phone ? "" : "Nomor belum berformat Indonesia yang benar (contoh: 0812… atau 62812…).",
      },
      { key: "address", label: "Alamat lengkap terisi", ok: Boolean(String(order.shipping_address || "").trim()) },
      { key: "city", label: "Kota/kabupaten terisi", ok: Boolean(city) },
      {
        key: "district",
        label: "Kecamatan terisi",
        ok: Boolean(district),
        detail: district ? "" : "Kecamatan belum ada di data pesanan ini.",
      },
      {
        key: "area_code",
        label: "Kecamatan dikenali J&T",
        ok: Boolean(destinationCode && receiverArea),
        detail: destinationCode && receiverArea ? "" : "Kecamatan belum dikenali J&T. Ubah alamat dan pilih kecamatan dari daftar.",
      },
      { key: "not_cancelled", label: "Pesanan belum dibatalkan", ok: order.status !== "dibatalkan" },
      {
        key: "no_resi",
        label: "Belum punya nomor resi",
        ok: !order.awb_no,
        detail: order.awb_no ? `Sudah ada resi ${order.awb_no}.` : "",
      },
    ];

    return NextResponse.json({
      ok: checks.every((check) => check.ok),
      checks,
      weight_grams: weightGrams,
      receiver: {
        name: String(order.customer_name || ""),
        phone: order.customer_whatsapp || "",
        address: String(order.shipping_address || ""),
        kecamatan: district,
        city,
        postal_code: String(order.shipping_postal_code || ""),
      },
      awb_no: order.awb_no || "",
      status: String(order.status || ""),
    });
  } catch (error) {
    console.error("[OPS] resi-check:", error);
    return NextResponse.json({ error: "Gagal memeriksa data resi. Coba lagi." }, { status: 500 });
  }
}
