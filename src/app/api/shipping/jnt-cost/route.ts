import { NextResponse } from "next/server";
import { checkTariffSemua } from "@/lib/jnt/tariff";
import { labelLayanan, layananByCode } from "@/lib/jnt/layanan";
import { getJntConfig } from "@/lib/jnt/config";
import { getSendSiteCode, resolveTariffCodes } from "@/lib/jnt/area-mapping";

const costCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Dicatat sekali per proses supaya log tidak dibanjiri pesan yang sama saat user mengetik.
let warnedUnconfigured = false;

// POST /api/shipping/jnt-cost
// Body: { city: string, district: string, weight: number }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // `city` opsional: peta area J&T bisa mencocokkan dari nama kecamatan saja, jadi form
    // yang hanya meminta kecamatan tetap bisa menghitung ongkir.
    const city = String(body.city ?? "").trim();
    const district = String(body.district ?? "").trim();
    const weight = Number(body.weight);

    if (!district || !weight) {
      return NextResponse.json({ error: "district dan weight wajib" }, { status: 400 });
    }

    const config = await getJntConfig();
    if (!config.orderUsername) {
      // J&T belum dikonfigurasi: kondisi wajar, bukan kegagalan server. Balas 200 dengan
      // daftar kosong + `configured:false` supaya pemanggil bisa menampilkan fallback
      // (ongkir dihitung admin menyusul) tanpa status error. Field `error` dipertahankan
      // agar pemanggil yang lebih lama (checkout) tetap menampilkan pesan yang sama.
      if (!warnedUnconfigured) {
        warnedUnconfigured = true;
        console.warn(
          "[JNT-COST] J&T belum dikonfigurasi (JNT_ORDER_USERNAME/JNT_TARIFF_KEY kosong) — ongkir dihitung manual oleh admin."
        );
      }
      return NextResponse.json({ data: [], configured: false, error: "J&T API belum dikonfigurasi" });
    }

    const resolved = resolveTariffCodes(city, district);
    const originCode = getSendSiteCode("DEPOK") || "DEPOK";
    const cacheKey = `${originCode}-${resolved.destAreaCode}-${weight}`;
    const cached = costCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // Semua layanan yang didukung (EZ + ECO). Rute yang tidak dilayani sebuah layanan tidak
    // dikembalikan J&T, jadi pilihannya hanya muncul kalau memang ada (mis. ECO cuma untuk jauh).
    const layanan = await checkTariffSemua({
      weight: weight / 1000,
      originCode,
      destAreaCode: resolved.destAreaCode,
    });

    if (layanan.length === 0) {
      console.error("[JNT-COST] Tariff check empty untuk", originCode, resolved.destAreaCode);
      return NextResponse.json({ error: "Tidak ada opsi pengiriman J&T untuk tujuan ini. Pastikan kode area sudah benar." }, { status: 404 });
    }

    const shipOptions = layanan.map((option) => ({
      courier: "J&T",
      service: labelLayanan(option.serviceCode),
      serviceCode: option.serviceCode,
      description: `Layanan ${option.serviceCode} J&T`,
      cost: option.cost,
      // Tariff Check J&T tidak mengirim ETA per rute; pakai estimasi standar layanan.
      etd: option.etd || layananByCode(option.serviceCode)?.estimate || "",
    }));

    shipOptions.sort((a, b) => a.cost - b.cost);

    const responseData = { data: shipOptions };
    costCache.set(cacheKey, { data: responseData, ts: Date.now() });

    return NextResponse.json(responseData);
  } catch (e) {
    console.error("[JNT-COST] ERROR:", e);
    return NextResponse.json({ error: "Gagal menghitung ongkir J&T" }, { status: 500 });
  }
}
