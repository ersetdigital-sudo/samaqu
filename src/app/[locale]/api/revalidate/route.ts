import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const { secret } = await request.json().catch(() => ({ secret: "" }));
  // Simple auth to prevent abuse
  if (secret !== process.env.REVALIDATE_SECRET && secret !== "samaqu-revalidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidatePath("/");
  revalidatePath("/katalog");
  return NextResponse.json({ revalidated: true, timestamp: Date.now() });
}
