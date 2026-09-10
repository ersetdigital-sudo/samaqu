import { NextRequest, NextResponse } from "next/server";
import { trackShipment } from "@/lib/jnt/track";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const awb = searchParams.get("awb");
  if (!awb) {
    return NextResponse.json({ success: false, error: "AWB wajib diisi" }, { status: 400 });
  }
  try {
    const result = await trackShipment(awb);
    if (!result.success) {
      return NextResponse.json({ success: false, error: "Gagal melacak", raw: result.error }, { status: 200 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}