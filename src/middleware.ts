import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(id|en)/:path*", "/((?!_next|admin|api|images|fonts|video|favicon|logo|bio-images).*)"],
};
