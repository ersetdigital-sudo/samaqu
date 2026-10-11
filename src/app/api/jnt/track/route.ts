import { NextRequest, NextResponse } from "next/server";
import { trackShipment } from "@/lib/jnt/track";
import { getJntConfig } from "@/lib/jnt/config";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const awb = searchParams.get("awb");
  if (!awb) {
    return NextResponse.json({ success: false, error: "Nomor resi wajib diisi" }, { status: 400 });
  }

  const config = getJntConfig();
  if (!config.trackUsername || !config.trackPassword || !config.companyId) {
    return NextResponse.json(
      { success: false, error: "Pelacakan J&T belum dikonfigurasi." },
      { status: 200 }
    );
  }

  try {
    const result = await trackShipment(awb);
    if (!result.success) {
      // J&T menjawab 200 dengan { error_id, error_message } untuk resi atau kredensial
      // yang tidak dikenali — pesannya diteruskan supaya halaman bisa menjelaskannya.
      return NextResponse.json(
        { success: false, error: result.error?.error_message || "Data pelacakan tidak ditemukan." },
        { status: 200 }
      );
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[J&T Track] Error:", err);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
