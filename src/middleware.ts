import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Catatan: setiap folder di public/ yang bukan aset aplikasi harus dikecualikan,
  // kalau tidak middleware locale mengalihkannya ke /<locale>/… (404).
  matcher: ["/", "/(id|en)/:path*", "/((?!_next|admin|api|images|fonts|video|favicon|logo|bio-images|garansi/).*)"],
};
