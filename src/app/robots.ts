import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/checkout"],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot", "YouBot", "Amazonbot"],
        allow: ["/", "/katalog", "/tentang-kami", "/testimoni", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin", "/api/", "/checkout", "/cart"],
      },
    ],
    sitemap: "https://samaqu.vercel.app/sitemap.xml",
  };
}
