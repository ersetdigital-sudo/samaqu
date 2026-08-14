import { NextResponse } from "next/server";
import { checkTariff } from "@/lib/jnt/tariff";
import { getJntConfig } from "@/lib/jnt/config";

const costCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// POST /api/shipping/jnt-cost
// Body: { city: string, district: string, weight: number }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { city, district, weight } = body;

    if (!city || !district || !weight) {
      return NextResponse.json({ error: "city, district, weight wajib" }, { status: 400 });
    }

    const config = getJntConfig();
    if (!config.orderUsername) {
      return NextResponse.json({ error: "J&T API belum dikonfigurasi" }, { status: 500 });
    }

    const originCode = "DEPOK";
    const cacheKey = `${originCode}-${district}-${weight}`;
    const cached = costCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const result = await checkTariff({
      weight: weight / 1000,
      originCode,
      destAreaCode: district.toUpperCase(),
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
