import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/checkout", "/cart", "/akun"],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot", "YouBot", "Amazonbot", "anthropic-ai", "ChatGPT-User"],
        allow: ["/", "/katalog", "/tentang-kami", "/testimoni", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin", "/api/", "/checkout", "/cart", "/akun"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
