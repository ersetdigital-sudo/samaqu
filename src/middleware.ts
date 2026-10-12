import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // x-pathname dipakai layout/metadata untuk menghitung canonical + hreflang
  // tanpa perlu tahu URL-nya dari sisi klien.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
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
    "/((?!_next|admin|api|opengraph-image|twitter-image|icon|apple-icon|manifest|\\.well-known|.*\\..*).*)",
  ],
};
