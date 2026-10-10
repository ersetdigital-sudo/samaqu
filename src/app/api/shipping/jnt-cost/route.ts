import { NextResponse } from "next/server";
import { checkTariff } from "@/lib/jnt/tariff";
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

    const config = getJntConfig();
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

    const result = await checkTariff({
      weight: weight / 1000,
      originCode,
      destAreaCode: resolved.destAreaCode,
    });

    if (!result.success || result.services.length === 0) {
      console.error("[JNT-COST] Tariff check failed or empty:", result.raw);
      return NextResponse.json({ error: "Tidak ada opsi pengiriman J&T untuk tujuan ini. Pastikan kode area sudah benar." }, { status: 404 });
    }

    const shipOptions = result.services.map((s) => ({
      courier: "J&T",
      service: s.name,
      description: `Layanan ${s.name} J&T`,
      cost: parseInt(s.cost) || 0,
      etd: "",
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
