import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Subdomain dashboard internal: office.samaqu.id/<halaman> → /ops/<halaman> */
const OPS_HOST = "office.samaqu.id";

export default function middleware(request: NextRequest) {
  // x-pathname dipakai layout/metadata untuk menghitung canonical + hreflang
  // tanpa perlu tahu URL-nya dari sisi klien.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);

  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (host === OPS_HOST) {
    // Dashboard internal: tanpa locale, URL bersih (ops.samaqu.id/leads, /laporan, dst).
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith("/ops")) {
      url.pathname = url.pathname === "/" ? "/ops/leads" : `/ops${url.pathname}`;
    }
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return intlMiddleware(new NextRequest(request, { headers }));
}

export const config = {
  // Catatan: setiap folder di public/ yang bukan aset aplikasi harus dikecualikan,
  // kalau tidak middleware locale mengalihkannya ke /<locale>/… (404).
  // `.*\..*` mengecualikan semua file statis (robots.txt, sitemap.xml, llms.txt,
  // llms-full.txt, favicon.ico, gambar, .well-known/…) dari redirect locale.
  matcher: [
    "/",
    "/(id|en)/:path*",
    "/((?!_next|admin|ops|api|opengraph-image|twitter-image|icon|apple-icon|manifest|\\.well-known|.*\\..*).*)",
  ],
};
